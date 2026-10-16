-- Query indexes for Dewmi's dashboard, review pages and public gallery.
CREATE INDEX "Product_businessId_status_createdAt_idx" ON "Product"("businessId", "status", "createdAt");
CREATE INDEX "Order_businessId_status_createdAt_idx" ON "Order"("businessId", "status", "createdAt");
CREATE INDEX "Order_businessId_createdAt_idx" ON "Order"("businessId", "createdAt");
CREATE INDEX "Review_productId_createdAt_id_idx" ON "Review"("productId", "createdAt", "id");
CREATE INDEX "GalleryItem_createdAt_id_idx" ON "GalleryItem"("createdAt", "id");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
