-- User.avatar NOT NULL (required in Prisma).
--
-- Data reset (no backfill): existing users may have NULL avatar. This migration truncates
-- the "User" table with CASCADE, which removes all users and dependent rows: Listing (properties),
-- PropertyImage, PropertyFeature, Availability, Booking, Conversation, UserConversation,
-- Message, and any other tables referencing User or those entities via foreign keys.
--
-- Apply only when wiping dev/staging data is acceptable; document in PR/release notes.

TRUNCATE TABLE "User" CASCADE;

ALTER TABLE "User" ALTER COLUMN "avatar" SET NOT NULL;
