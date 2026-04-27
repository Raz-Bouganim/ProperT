-- Align Listing with Prisma schema (negotiable, optional listing window fields)
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "negotiable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "availableDate" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "leaseDuration" TEXT;
