-- Chat schema: snake_case plural table names (conversations, conversation_participants, messages),
-- denormalized inbox fields, per-user archive, message edit/reply support, cursor pagination indexes.
--
-- PR notes (property lifecycle):
-- - `conversations.property_id` -> `properties.id` uses ON DELETE RESTRICT: hard-deleting a property
--   row is blocked while conversations exist. Listing soft-delete uses `properties.deleted_at` and does
--   not remove the row, so threads stay visible.
-- - Per-user read state remains on `conversation_participants` (last_read_message_id / last_read_at).
--   Per-message read receipts for all participants are out of scope.
-- - Table `conversation_participants` replaces `UserConversation` (same composite PK user_id + conversation_id).

-- ─── New columns (before table renames) ─────────────────────────────────────

ALTER TABLE "Conversation"
  ADD COLUMN IF NOT EXISTS "last_message_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_message_preview" VARCHAR(512);

ALTER TABLE "UserConversation"
  ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);

ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "edited_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reply_to_message_id" TEXT;

-- Backfill last message per conversation (preview: text, or placeholder for media-only)
WITH latest AS (
  SELECT DISTINCT ON ("conversation_id")
    "conversation_id",
    "id",
    "created_at",
    "content",
    "media_url"
  FROM "Message"
  ORDER BY "conversation_id", "created_at" DESC, "id" DESC
)
UPDATE "Conversation" c
SET
  "last_message_at" = latest."created_at",
  "last_message_preview" = LEFT(
    COALESCE(
      NULLIF(TRIM(latest."content"), ''),
      CASE WHEN latest."media_url" IS NOT NULL THEN '[attachment]' ELSE '' END
    ),
    512
  )
FROM latest
WHERE c."id" = latest."conversation_id";

-- ─── Rename tables ───────────────────────────────────────────────────────────

ALTER TABLE "Conversation" RENAME TO "conversations";
ALTER TABLE "UserConversation" RENAME TO "conversation_participants";
ALTER TABLE "Message" RENAME TO "messages";

-- ─── Rename primary keys & uniques ──────────────────────────────────────────

ALTER TABLE "conversations" RENAME CONSTRAINT "Conversation_pkey" TO "conversations_pkey";
ALTER TABLE "conversations" RENAME CONSTRAINT "Conversation_property_id_fkey" TO "conversations_property_id_fkey";
ALTER TABLE "conversations" RENAME CONSTRAINT "Conversation_seeker_id_fkey" TO "conversations_seeker_id_fkey";
ALTER TABLE "conversations" RENAME CONSTRAINT "Conversation_owner_id_fkey" TO "conversations_owner_id_fkey";

ALTER INDEX "Conversation_property_id_seeker_id_owner_id_key" RENAME TO "conversations_property_id_seeker_id_owner_id_key";

ALTER TABLE "conversation_participants" RENAME CONSTRAINT "UserConversation_pkey" TO "conversation_participants_pkey";
ALTER TABLE "conversation_participants" RENAME CONSTRAINT "UserConversation_user_id_fkey" TO "conversation_participants_user_id_fkey";
ALTER TABLE "conversation_participants" RENAME CONSTRAINT "UserConversation_conversation_id_fkey" TO "conversation_participants_conversation_id_fkey";
ALTER TABLE "conversation_participants" RENAME CONSTRAINT "UserConversation_last_read_message_id_fkey" TO "conversation_participants_last_read_message_id_fkey";

ALTER TABLE "messages" RENAME CONSTRAINT "Message_pkey" TO "messages_pkey";
ALTER TABLE "messages" RENAME CONSTRAINT "Message_conversation_id_fkey" TO "messages_conversation_id_fkey";
ALTER TABLE "messages" RENAME CONSTRAINT "Message_sender_id_fkey" TO "messages_sender_id_fkey";

ALTER TABLE "messages" RENAME CONSTRAINT "message_has_content_or_media" TO "messages_has_content_or_media";

-- ─── Rename indexes ─────────────────────────────────────────────────────────

ALTER INDEX "Conversation_property_id_idx" RENAME TO "conversations_property_id_idx";
ALTER INDEX "UserConversation_conversation_id_idx" RENAME TO "conversation_participants_conversation_id_idx";
ALTER INDEX "Message_conversation_id_created_at_idx" RENAME TO "messages_conversation_id_created_at_idx";

-- Self-reply FK (ON DELETE SET NULL on parent message delete)
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_reply_to_message_id_fkey"
  FOREIGN KEY ("reply_to_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "messages_reply_to_message_id_idx" ON "messages"("reply_to_message_id");
