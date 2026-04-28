-- AlterTable
ALTER TABLE "User" ADD COLUMN "auth0Sub" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_auth0Sub_key" ON "User"("auth0Sub");

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
