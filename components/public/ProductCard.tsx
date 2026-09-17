import Link from "next/link";
import { Star } from "lucide-react";

export type ProductCardData = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  businessName: string;
  averageRating: number | null;
  reviewCount: number;
};

// Used on Home, Marketplace, Search Results, and Category Details — one
// card component so all four pages look consistent, matching the Figma.
export default function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="block overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md"
    >
      <div className="aspect-square w-full bg-slate-100">
        {product.imageUrl && (
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        )}
      </div>

      <div className="p-4">
        <p className="text-xs text-blue-600">{product.businessName}</p>
        <h3 className="mt-1 text-sm font-semibold text-slate-900 line-clamp-2">{product.name}</h3>

        {product.averageRating !== null && (
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            {product.averageRating} ({product.reviewCount})
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <p className="text-base font-bold text-slate-900">Rs.{Number(product.price).toFixed(0)}</p>
          <span className="rounded-md border border-blue-600 px-3 py-1 text-xs font-semibold text-blue-600">
            View
          </span>
        </div>
      </div>
    </Link>
  );
}
