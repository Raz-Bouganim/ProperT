-- ──────────────────────────────────────────────────────────────
-- Prerequisites: extensions required before any DDL
-- ──────────────────────────────────────────────────────────────

-- Enable PostGIS (required for geography column on Listing)
CREATE EXTENSION IF NOT EXISTS postgis;

-- §6.2 step 1: btree_gist extension (required for range exclusion)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ──────────────────────────────────────────────────────────────
-- Prisma-generated DDL (from schema.prisma §6.1)
-- ──────────────────────────────────────────────────────────────

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'OFFICE');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'FOR_SALE', 'FOR_RENT', 'SOLD');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AmenityType" AS ENUM ('SWIMMING_POOL', 'GYM', 'PARKING', 'ELEVATOR', 'BALCONY', 'AIR_CONDITIONING', 'GARDEN', 'FIREPLACE', 'PET_FRIENDLY', 'FURNISHED', 'WASHER_DRYER', 'DISHWASHER');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'FILE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "external_id" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "avatar" VARCHAR(2048),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "price" DECIMAL(12,2) NOT NULL,
    "sqft" DOUBLE PRECISION NOT NULL,
    "negotiable" BOOLEAN NOT NULL DEFAULT true,
    "bedrooms" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bathrooms" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "type" "PropertyType" NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "virtual_tour_url" VARCHAR(2048),
    "floor_plan_url" VARCHAR(2048),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "year_built" INTEGER,
    "views" INTEGER NOT NULL DEFAULT 0,
    "available_from" TIMESTAMP(3),
    "lease_duration_months" INTEGER,
    "owner_id" TEXT NOT NULL,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyImage" (
    "id" TEXT NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "key" VARCHAR(1024) NOT NULL,
    "alt_text" VARCHAR(255) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "property_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyFeature" (
    "property_id" TEXT NOT NULL,
    "feature" "AmenityType" NOT NULL,

    CONSTRAINT "PropertyFeature_pkey" PRIMARY KEY ("property_id","feature")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "day_of_week" INTEGER,
    "date" TIMESTAMP(3),
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "property_id" TEXT NOT NULL,
    "seeker_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "seeker_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConversation" (
    "user_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "last_read_message_id" TEXT,
    "last_read_at" TIMESTAMP(3),

    CONSTRAINT "UserConversation_pkey" PRIMARY KEY ("user_id","conversation_id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT,
    "media_url" VARCHAR(2048),
    "media_type" "MediaType",
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_external_id_key" ON "User"("external_id");

-- CreateIndex
CREATE INDEX "Listing_price_idx" ON "Listing"("price");

-- CreateIndex
CREATE INDEX "Listing_owner_id_idx" ON "Listing"("owner_id");

-- CreateIndex
CREATE INDEX "PropertyImage_property_id_sort_order_idx" ON "PropertyImage"("property_id", "sort_order");

-- CreateIndex
CREATE INDEX "PropertyImage_property_id_is_primary_idx" ON "PropertyImage"("property_id", "is_primary");

-- CreateIndex
CREATE INDEX "PropertyFeature_feature_idx" ON "PropertyFeature"("feature");

-- CreateIndex
CREATE INDEX "Availability_property_id_idx" ON "Availability"("property_id");

-- CreateIndex
CREATE INDEX "Booking_property_id_start_time_idx" ON "Booking"("property_id", "start_time");

-- CreateIndex
CREATE INDEX "Booking_seeker_id_status_idx" ON "Booking"("seeker_id", "status");

-- CreateIndex
CREATE INDEX "Conversation_property_id_idx" ON "Conversation"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_property_id_seeker_id_owner_id_key" ON "Conversation"("property_id", "seeker_id", "owner_id");

-- CreateIndex
CREATE INDEX "UserConversation_conversation_id_idx" ON "UserConversation"("conversation_id");

-- CreateIndex
CREATE INDEX "Message_conversation_id_created_at_idx" ON "Message"("conversation_id", "created_at");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyFeature" ADD CONSTRAINT "PropertyFeature_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConversation" ADD CONSTRAINT "UserConversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConversation" ADD CONSTRAINT "UserConversation_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConversation" ADD CONSTRAINT "UserConversation_last_read_message_id_fkey" FOREIGN KEY ("last_read_message_id") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ──────────────────────────────────────────────────────────────
-- §6.2 Raw SQL additions
-- ──────────────────────────────────────────────────────────────

-- §6.2 step 2: Booking overlap exclusion constraint
-- Note: Prisma maps DateTime to TIMESTAMP(3) (no timezone), so tsrange is used
-- instead of tstzrange to keep the index expression IMMUTABLE.
ALTER TABLE "Booking" ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING GIST (
    "property_id"  WITH =,
    tsrange("start_time", "end_time", '[)') WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED'));

-- §6.2 step 3: PostGIS generated geography column + GiST index
ALTER TABLE "Listing"
  ADD COLUMN location geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE
      WHEN latitude IS NOT NULL AND longitude IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
      ELSE NULL
    END
  ) STORED;
CREATE INDEX listing_location_gist ON "Listing" USING GIST(location);

-- §6.2 step 4: Full-text search generated tsvector column + GIN index
ALTER TABLE "Listing"
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(address, '') || ' ' ||
      coalesce(city, '')
    )
  ) STORED;
CREATE INDEX listing_fts_gin ON "Listing" USING GIN(search_vector);

-- §6.2 step 5: Single primary image per property (partial unique index)
CREATE UNIQUE INDEX property_one_primary_image
  ON "PropertyImage"(property_id)
  WHERE is_primary = TRUE;

-- §6.2 step 6: Availability XOR constraint (day_of_week or date, not both)
ALTER TABLE "Availability" ADD CONSTRAINT availability_xor_day_or_date
  CHECK (
    (day_of_week IS NOT NULL AND date IS NULL) OR
    (day_of_week IS NULL AND date IS NOT NULL)
  );
ALTER TABLE "Availability" ADD CONSTRAINT availability_valid_day_of_week
  CHECK (day_of_week IS NULL OR day_of_week BETWEEN 0 AND 6);

-- §6.2 step 7: Message must have content or media
ALTER TABLE "Message" ADD CONSTRAINT message_has_content_or_media
  CHECK (content IS NOT NULL OR media_url IS NOT NULL);

-- §6.2 step 8: Currency format (ISO 4217)
ALTER TABLE "Listing" ADD CONSTRAINT listing_currency_iso4217
  CHECK (currency ~ '^[A-Z]{3}$');
