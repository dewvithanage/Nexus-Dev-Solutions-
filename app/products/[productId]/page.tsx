
import { notFound } from "next/navigation";
import { getProductDetails } from "@/lib/public-queries";
import ProductDetailsClient from "./ProductDetailsClient";

type Props = {
  params: Promise<{ productId: string }>;
};

export const revalidate = 60;

export async function generateMetadata({ params }: Props) {
  const { productId } = await params;
  const product = await getProductDetails(productId);

  return {
    title: product
      ? `${product.name} | StartupSpark`
      : "Product Not Found | StartupSpark",
    description: product?.description ?? "View products on StartupSpark.",
  };
}

export default async function ProductDetailsPage({ params }: Props) {
  const { productId } = await params;
  const product = await getProductDetails(productId);

  if (!product) {
    notFound();
  }

  return <ProductDetailsClient product={product} />;
}
