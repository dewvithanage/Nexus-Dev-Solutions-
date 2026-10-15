-- Indexes for the columns the admin pages filter and sort on (ICA 6).
-- Composite indexes replace the single-column ones they start with
-- (status -> status+date, businessId -> businessId+status), which they
-- fully cover. Only indexes change; no data is touched.

-- DropIndex
DROP INDEX "EntrepreneurProfile_status_idx";

-- DropIndex
DROP INDEX "Product_status_idx";

-- DropIndex
DROP INDEX "Order_businessId_idx";

-- CreateIndex
CREATE INDEX "EntrepreneurProfile_status_appliedAt_idx" ON "EntrepreneurProfile"("status", "appliedAt");

-- CreateIndex
CREATE INDEX "EntrepreneurProfile_appliedAt_idx" ON "EntrepreneurProfile"("appliedAt");

-- CreateIndex
CREATE INDEX "Product_status_createdAt_idx" ON "Product"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE INDEX "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "Order_businessId_status_idx" ON "Order"("businessId", "status");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

