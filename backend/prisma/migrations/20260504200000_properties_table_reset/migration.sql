-- Dev/staging data wipe: drop property graph and rebuild with `properties` + new status/address/amenity model.
-- No backfill; document in PR.

-- Drop dependents of Listing (properties) first
DROP TABLE IF EXISTS "Message" CASCADE;
DROP TABLE IF EXISTS "UserConversation" CASCADE;
DROP TABLE IF EXISTS "Conversation" CASCADE;
DROP TABLE IF EXISTS "Booking" CASCADE;
DROP TABLE IF EXISTS "Availability" CASCADE;
DROP TABLE IF EXISTS "PropertyImage" CASCADE;
DROP TABLE IF EXISTS "PropertyFeature" CASCADE;
DROP TABLE IF EXISTS "Listing" CASCADE;

DROP TYPE IF EXISTS "ListingStatus";

-- New listing lifecycle enum (DRAFT removed; draft = published_at IS NULL)
CREATE TYPE "PropertyStatus" AS ENUM ('FOR_SALE', 'FOR_RENT', 'CLOSED');

CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'FOR_SALE',
    "price" DECIMAL(12,2) NOT NULL,
    "sqft" DOUBLE PRECISION NOT NULL,
    "negotiable" BOOLEAN NOT NULL DEFAULT true,
    "bedrooms" DOUBLE PRECISION,
    "bathrooms" DOUBLE PRECISION,
    "type" "PropertyType" NOT NULL,
    "address_line" VARCHAR(500) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "region" VARCHAR(100),
    "postal_code" VARCHAR(32),
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

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "properties_slug_key" ON "properties"("slug");
CREATE INDEX "properties_price_idx" ON "properties"("price");
CREATE INDEX "properties_owner_id_idx" ON "properties"("owner_id");

ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "properties"
  ADD COLUMN location geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE
      WHEN latitude IS NOT NULL AND longitude IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
      ELSE NULL
    END
  ) STORED;
CREATE INDEX properties_location_gist ON "properties" USING GIST(location);

ALTER TABLE "properties"
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(address_line, '') || ' ' ||
      coalesce(city, '')
    )
  ) STORED;
CREATE INDEX properties_fts_gin ON "properties" USING GIN(search_vector);

ALTER TABLE "properties" ADD CONSTRAINT properties_currency_iso4217
  CHECK (currency ~ '^[A-Z]{3}$');

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

CREATE TABLE "property_amenities" (
    "property_id" TEXT NOT NULL,
    "amenity" "AmenityType" NOT NULL,

    CONSTRAINT "property_amenities_pkey" PRIMARY KEY ("property_id","amenity")
);

CREATE INDEX "property_amenities_amenity_idx" ON "property_amenities"("amenity");

ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "day_of_week" INTEGER,
    "date" TIMESTAMP(3),
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Availability_property_id_idx" ON "Availability"("property_id");
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

CREATE INDEX "Booking_property_id_start_time_idx" ON "Booking"("property_id", "start_time");
CREATE INDEX "Booking_seeker_id_status_idx" ON "Booking"("seeker_id", "status");
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING GIST (
    "property_id"  WITH =,
    tsrange("start_time", "end_time", '[)') WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED'));

CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "seeker_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Conversation_property_id_seeker_id_owner_id_key" ON "Conversation"("property_id", "seeker_id", "owner_id");
CREATE INDEX "Conversation_property_id_idx" ON "Conversation"("property_id");
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "UserConversation" (
    "user_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "last_read_message_id" TEXT,
    "last_read_at" TIMESTAMP(3),

    CONSTRAINT "UserConversation_pkey" PRIMARY KEY ("user_id","conversation_id")
);

CREATE INDEX "UserConversation_conversation_id_idx" ON "UserConversation"("conversation_id");
ALTER TABLE "UserConversation" ADD CONSTRAINT "UserConversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserConversation" ADD CONSTRAINT "UserConversation_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

CREATE INDEX "Message_conversation_id_created_at_idx" ON "Message"("conversation_id", "created_at");
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserConversation" ADD CONSTRAINT "UserConversation_last_read_message_id_fkey" FOREIGN KEY ("last_read_message_id") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX property_one_primary_image
  ON "PropertyImage"(property_id)
  WHERE is_primary = TRUE;

ALTER TABLE "Availability" ADD CONSTRAINT availability_xor_day_or_date
  CHECK (
    (day_of_week IS NOT NULL AND date IS NULL) OR
    (day_of_week IS NULL AND date IS NOT NULL)
  );
ALTER TABLE "Availability" ADD CONSTRAINT availability_valid_day_of_week
  CHECK (day_of_week IS NULL OR day_of_week BETWEEN 0 AND 6);

ALTER TABLE "Message" ADD CONSTRAINT message_has_content_or_media
  CHECK (content IS NOT NULL OR media_url IS NOT NULL);
