-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('FOR_SALE', 'FOR_RENT');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "customFees" JSONB,
ADD COLUMN     "floorPlanUrl" TEXT,
ADD COLUMN     "hoaMonthly" DECIMAL(10,2),
ADD COLUMN     "status" "ListingStatus" NOT NULL DEFAULT 'FOR_SALE',
ADD COLUMN     "taxAnnual" DECIMAL(10,2),
ADD COLUMN     "yearBuilt" INTEGER;
