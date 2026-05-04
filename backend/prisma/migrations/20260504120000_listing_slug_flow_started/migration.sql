-- Public slug for shareable URLs; flow start time (separate from row createdAt).
ALTER TABLE "Listing" ADD COLUMN "slug" VARCHAR(200);
ALTER TABLE "Listing" ADD COLUMN "flow_started_at" TIMESTAMP(3);

-- Backfill: stable unique slug from id (p- + 32 hex without dashes)
UPDATE "Listing" SET "slug" = 'p-' || REPLACE("id"::text, '-', '') WHERE "slug" IS NULL;

CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");
ALTER TABLE "Listing" ALTER COLUMN "slug" SET NOT NULL;
