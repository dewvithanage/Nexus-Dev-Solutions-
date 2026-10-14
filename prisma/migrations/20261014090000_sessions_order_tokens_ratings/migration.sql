-- 1. Session revocation: every session token carries this number, and
-- increasing it signs the user out everywhere.
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- 2. Secret token for the public order confirmation page. Existing orders
-- get none, so their confirmation pages are no longer public.
ALTER TABLE "Order" ADD COLUMN "accessToken" TEXT;
CREATE UNIQUE INDEX "Order_accessToken_key" ON "Order"("accessToken");

-- 3. Stored rating summary so the marketplace can sort by rating in the
-- database, filled in from the existing reviews.
ALTER TABLE "Product" ADD COLUMN "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD CONSTRAINT "Product_rating_summary_check"
    CHECK ("ratingCount" >= 0 AND "ratingAverage" >= 0 AND "ratingAverage" <= 5);

UPDATE "Product" p
SET "ratingCount" = r.cnt, "ratingAverage" = r.avg
FROM (
    SELECT "productId", COUNT(*)::int AS cnt, AVG("rating")::double precision AS avg
    FROM "Review" GROUP BY "productId"
) r
WHERE r."productId" = p."id";
