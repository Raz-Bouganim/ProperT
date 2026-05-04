-- Property-level IANA time zone (default UTC). Used for interpreting availability HH:MM and calendar days.
ALTER TABLE "properties" ADD COLUMN "time_zone" VARCHAR(64) NOT NULL DEFAULT 'UTC';

-- Align with property_amenities: snake_case plural physical table name.
ALTER TABLE "Availability" RENAME TO "property_availabilities";

ALTER TABLE "property_availabilities" RENAME CONSTRAINT "Availability_pkey" TO "property_availabilities_pkey";

ALTER INDEX "Availability_property_id_idx" RENAME TO "property_availabilities_property_id_idx";

ALTER TABLE "property_availabilities" RENAME CONSTRAINT "Availability_property_id_fkey" TO "property_availabilities_property_id_fkey";
