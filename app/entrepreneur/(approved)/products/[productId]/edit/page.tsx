import { notFound } from "next/navigation";

import EditProductForm from "@/components/entrepreneur/EditProductForm";
import {
  getCategoryOptions,
  getOwnProductForEdit,
  requireEntrepreneurPage,
} from "@/lib/entrepreneur-data";

// Server Component: the product and the category list are read on the
// server in parallel, instead of the browser fetching
// /api/products/mine/[id] and /api/categories after the page loads.
// The product is looked up within the signed-in seller's own business, so
// another seller's product id (or a made-up one) gets the 404 page.
export default async function EditProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const { business, sidebar } = await requireEntrepreneurPage();

  const [product, categories] = await Promise.all([
    getOwnProductForEdit(productId, business.id),
    getCategoryOptions(),
  ]);

  if (!product) notFound();

  return <EditProductForm product={product} categories={categories} sidebar={sidebar} />;
}
