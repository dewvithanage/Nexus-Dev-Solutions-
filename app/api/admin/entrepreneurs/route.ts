import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Shared by TWO admin pages:
//   - Entrepreneur Registration Approval (?status=PENDING)
//   - Entrepreneur Management (no status filter = show everyone)
// This avoids writing almost the same query twice.
export async function GET(request: NextRequest) {
  try {
    const statusParam = request.nextUrl.searchParams.get("status");

    // Only filter by status if a valid one was actually given — otherwise
    // return every entrepreneur (used by the Management directory).
    const validStatuses = ["PENDING", "APPROVED", "REJECTED"];
    const where =
      statusParam && validStatuses.includes(statusParam)
        ? { status: statusParam as "PENDING" | "APPROVED" | "REJECTED" }
        : {};

    const entrepreneurs = await prisma.entrepreneurProfile.findMany({
      where,
      orderBy: { appliedAt: "desc" },
      include: {
        user: true,
        business: {
          include: {
            products: { include: { category: true } },
            orders: true,
          },
        },
      },
    });

    // Shape the data the way both admin tables need it — including a
    // "primaryCategory" guess (the category of their first product) since
    // Business itself doesn't store a single category, only Products do.
    const results = entrepreneurs.map((entrepreneur) => {
      const products = entrepreneur.business?.products ?? [];
      const orders = entrepreneur.business?.orders ?? [];
      const salesVolume = orders
        .filter((order) => order.status !== "CANCELLED")
        .reduce((sum, order) => sum + Number(order.totalAmount), 0);

      return {
        id: entrepreneur.id,
        fullName: entrepreneur.user.name,
        email: entrepreneur.user.email,
        university: entrepreneur.university,
        businessName: entrepreneur.business?.businessName ?? "—",
        businessId: entrepreneur.business?.id ?? null,
        primaryCategory: products[0]?.category?.name ?? "—",
        productCount: products.length,
        salesVolume,
        status: entrepreneur.status,
        appliedAt: entrepreneur.appliedAt,
      };
    });

    return NextResponse.json({ entrepreneurs: results });
  } catch (error) {
    console.error("Get entrepreneurs error:", error);
    return NextResponse.json({ message: "Unable to load entrepreneurs." }, { status: 500 });
  }
}
