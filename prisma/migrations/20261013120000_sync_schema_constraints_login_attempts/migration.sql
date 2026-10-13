-- 1. Columns missing from the earlier migrations.
-- Password reset: schema.prisma has User.resetToken / resetTokenExpiry, but the migration
-- 20260916094807_add_product_admin_notes dropped them, so a database built
-- from the migrations alone was missing them. IF NOT EXISTS makes this a
-- no-op on databases that already have them.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "User_resetToken_key" ON "User"("resetToken");

-- Other columns that schema.prisma has but no earlier migration created
-- (they had been added to the shared database directly). Without these, a
-- database built from the migrations fails on every Business or Category
-- query.
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "businessCategory" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "businessHours" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "instagramHandle" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "pickupLocationNotes" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT;

-- The default only fills in existing rows; Prisma sets updatedAt itself
-- from then on, so the default is removed again.
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Category" ALTER COLUMN "updatedAt" DROP DEFAULT;
-- Category.icon (and, on some databases, Category.description) are no
-- longer in schema.prisma. They are nullable and left in place rather than
-- dropped, so no existing data is deleted.

-- 2. Failed login attempts, used by lib/rate-limit.ts to lock an email after
-- too many wrong passwords. Stored in the database instead of server memory
-- so it survives restarts and works across server instances.
CREATE TABLE "LoginAttempt" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "firstAttemptAt" TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("key"),
    CONSTRAINT "LoginAttempt_count_check" CHECK ("count" >= 0)
);

-- 3. CHECK constraints. Prisma's schema language can't express these, so
-- they live only here. They stop bad values even if a route forgets to
-- validate.
--
-- The Product check is NOT VALID: it is enforced for every new or updated
-- row, but does not reject rows that already existed. Once any old rows are
-- corrected, run:
--   ALTER TABLE "Product" VALIDATE CONSTRAINT "Product_price_stock_check";
ALTER TABLE "Product" ADD CONSTRAINT "Product_price_stock_check"
    CHECK ("price" >= 0 AND "stockQuantity" >= 0) NOT VALID;
ALTER TABLE "Product" ADD CONSTRAINT "Product_name_not_blank_check"
    CHECK (length(trim("name")) > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_price_check"
    CHECK ("quantity" > 0 AND "unitPriceAtOrder" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_totalAmount_check"
    CHECK ("totalAmount" >= 0);
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_check"
    CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_sortOrder_check"
    CHECK ("sortOrder" >= 0);
