"use client";

import ProductCard, { type ProductCardData } from "@/components/public/ProductCard";

// The product grid for the Home page. The data is fetched on the server and
// handed to this component as plain props; it is a client component only so
// it works whether or not ProductCard uses browser-only features.
export default function TrendingProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
      {products.map((product, index) => (
        <div
          key={product.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
