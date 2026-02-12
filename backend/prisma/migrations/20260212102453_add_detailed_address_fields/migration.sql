-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "city" TEXT NOT NULL DEFAULT 'Unknown',
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'Unknown',
ADD COLUMN     "houseNumber" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "zipCode" TEXT;
