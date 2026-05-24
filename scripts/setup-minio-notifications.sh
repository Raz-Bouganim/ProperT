#!/usr/bin/env bash
# Configures MinIO to fire webhook events to the NestJS /media/s3-webhook endpoint
# on every image PUT. Run this once after `docker compose up` and the backend is started.
#
# Prerequisites: MinIO Client (mc) installed — https://min.io/docs/minio/linux/reference/minio-mc.html
# Usage: bash scripts/setup-minio-notifications.sh
set -e

MINIO_ALIAS="${MINIO_ALIAS:-local}"
MINIO_URL="${MINIO_URL:-http://localhost:9000}"
MINIO_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_PASS="${MINIO_ROOT_PASSWORD:-minioadmin123}"
BUCKET="${S3_BUCKET_NAME:-propert-uploads}"
BACKEND_URL="${BACKEND_URL:-http://localhost:4000}"
WEBHOOK_KEY="imageprocessor"

echo "→ Aliasing MinIO at $MINIO_URL"
mc alias set "$MINIO_ALIAS" "$MINIO_URL" "$MINIO_USER" "$MINIO_PASS"

echo "→ Ensuring bucket '$BUCKET' exists"
mc mb --ignore-existing "$MINIO_ALIAS/$BUCKET"

echo "→ Registering webhook target → $BACKEND_URL/media/s3-webhook"
mc admin config set "$MINIO_ALIAS" \
  "notify_webhook:${WEBHOOK_KEY}" \
  "endpoint=${BACKEND_URL}/media/s3-webhook" \
  "queue_limit=10000"

echo "→ Restarting MinIO to apply config (waiting 4 s)…"
mc admin service restart "$MINIO_ALIAS" || true
sleep 4

echo "→ Re-aliasing after restart"
mc alias set "$MINIO_ALIAS" "$MINIO_URL" "$MINIO_USER" "$MINIO_PASS"

echo "→ Adding PUT event listeners for image types"
for suffix in .jpg .jpeg .png .gif .webp .avif; do
  mc event add --ignore-existing \
    "$MINIO_ALIAS/$BUCKET" \
    "arn:minio:sqs::${WEBHOOK_KEY}:webhook" \
    --event put \
    --suffix "$suffix" && echo "   $suffix ✓"
done

echo ""
echo "Active events on $BUCKET:"
mc event list "$MINIO_ALIAS/$BUCKET"

echo ""
echo "Done! MinIO will POST S3 events to $BACKEND_URL/media/s3-webhook on every image upload."
