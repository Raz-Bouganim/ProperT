-- Align "Availability" with Prisma schema (optional specific date, optional dayOfWeek)
ALTER TABLE "Availability" ADD COLUMN IF NOT EXISTS "date" TIMESTAMP(3);
ALTER TABLE "Availability" ALTER COLUMN "dayOfWeek" DROP NOT NULL;
