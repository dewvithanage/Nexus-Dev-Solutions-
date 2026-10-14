import { prisma } from "@/lib/prisma";
import { publicProductWhere } from "@/lib/public-visibility";

export default async function AboutStats() {
  const [entrepreneurs, products, unitsSold, categories] = await Promise.all([
    prisma.entrepreneurProfile.count({ where: { status: "APPROVED" } }),
    prisma.product.count({ where: publicProductWhere }),
    prisma.orderItem.aggregate({ where: { order: { status: "VERIFIED" } }, _sum: { quantity: true } }),
    prisma.category.count(),
  ]);

  const stats = [
    { value: entrepreneurs.toLocaleString(), label: "Student Entrepreneurs" },
    { value: products.toLocaleString(), label: "Products Listed" },
    { value: (unitsSold._sum.quantity ?? 0).toLocaleString(), label: "Items Sold" },
    { value: categories.toLocaleString(), label: "Categories" },
  ];

  return (
        <section className="bg-slate-50 py-12">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-5 px-6 md:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white p-6 text-center"
              >
                <p className="text-3xl font-bold text-blue-600">
                  {stat.value}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

  );
}
