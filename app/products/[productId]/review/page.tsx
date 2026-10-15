import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import ReviewForm from "@/components/public/ReviewForm";
import { getReviewProduct } from "@/lib/dewmi-page-data";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ productId: string }> };
export async function generateMetadata({ params }: Props) {
  const product = await getReviewProduct((await params).productId);
  return { title: product ? `Review ${product.name} | StartupSpark` : "Write a Review | StartupSpark" };
}
export default async function ReviewPage({ params }: Props) {
  const product = await getReviewProduct((await params).productId);
  if (!product) notFound();
  return <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
    <Navbar />
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <div className="mb-4 text-xs text-slate-500"><Link href="/marketplace">Marketplace</Link> &gt; {product.business.businessName} &gt; Write a Review</div>
      <ReviewForm product={product} />
    </main>
    <Footer />
  </div>;
}
