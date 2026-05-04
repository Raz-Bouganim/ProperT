-- Intended publish status while listing is still a draft (sale vs rent).
ALTER TABLE "Listing" ADD COLUMN "draft_target_status" "ListingStatus";
