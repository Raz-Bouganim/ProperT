-- CreateTable
CREATE TABLE "media_upload_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "key" VARCHAR(1024) NOT NULL,
    "public_url" VARCHAR(2048) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_upload_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_upload_tokens_user_id_public_url_idx" ON "media_upload_tokens"("user_id", "public_url");

-- AddForeignKey
ALTER TABLE "media_upload_tokens" ADD CONSTRAINT "media_upload_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
