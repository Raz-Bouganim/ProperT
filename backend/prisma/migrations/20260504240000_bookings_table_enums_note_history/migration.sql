-- Booking status extensions
ALTER TYPE "BookingStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "BookingStatus" ADD VALUE 'LAPSED';

-- Rename physical table to plural snake_case convention
ALTER TABLE "Booking" RENAME TO "bookings";

ALTER TABLE "bookings" RENAME CONSTRAINT "Booking_pkey" TO "bookings_pkey";
ALTER INDEX "Booking_property_id_start_time_idx" RENAME TO "bookings_property_id_start_time_idx";
ALTER INDEX "Booking_seeker_id_status_idx" RENAME TO "bookings_seeker_id_status_idx";
ALTER TABLE "bookings" RENAME CONSTRAINT "Booking_property_id_fkey" TO "bookings_property_id_fkey";
ALTER TABLE "bookings" RENAME CONSTRAINT "Booking_seeker_id_fkey" TO "bookings_seeker_id_fkey";

-- Recreate partial exclusion: old constraint name is still `booking_no_overlap` on the renamed table
ALTER TABLE "bookings" DROP CONSTRAINT "booking_no_overlap";

ALTER TABLE "bookings" ADD COLUMN "note_history" TEXT;

-- Backfill audit trail from legacy `notes` (best-effort ISO8601-style stamp in UTC)
UPDATE "bookings"
SET "note_history" =
  '[' || to_char("created_at" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '] SEEKER: ' || "notes"
WHERE "notes" IS NOT NULL AND trim("notes") <> '';

ALTER TABLE "bookings" ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING GIST (
    "property_id" WITH =,
    tsrange("start_time", "end_time", '[)') WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED'));
