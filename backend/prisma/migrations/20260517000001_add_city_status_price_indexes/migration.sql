-- B-Tree index on city for city-level text filtering
CREATE INDEX IF NOT EXISTS "properties_city_idx" ON "properties" ("city");

-- Compound B-Tree index on status + price for the most common filter combo
CREATE INDEX IF NOT EXISTS "properties_status_price_idx" ON "properties" ("status", "price");
