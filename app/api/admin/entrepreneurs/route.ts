import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { Prisma } from "@prisma/client";

const ITEMS_PER_PAGE = 10;

// NOTE: filtering (tab, search, university, category) now happens HERE,
// server-side, rather than in the browser. This has to move server-side
// together with pagination — if filtering stayed client-side while
// pagination happened server-side, a search would only ever look
// through whichever 10 rows happened to be on the current page, not
// the full matching set. Same reasoning applies to the Products route.
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const tab = params.get("tab") || "ACTIVE"; // "ACTIVE" | "REJECTED"
    const search = params.get("search")?.trim();
    const university = params.get("university");
    const category = params.get("category");
    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Number(params.get("pageSize")) || ITEMS_PER_PAGE;

    const where: Prisma.EntrepreneurProfileWhereInput = {
      status: tab === "REJECTED" ? "REJECTED" : { not: "REJECTED" },
    };

    if (university && university !== "All") {
      where.university = university;
    }

    if (category && category !== "All") {
      where.business = { businessCategory: category };
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { business: { businessName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const totalCount = await prisma.entrepreneurProfile.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const profiles = await prisma.entrepreneurProfile.findMany({
      where,
      orderBy: { appliedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: true,
        business: { include: { products: true, orders: { where: { status: "VERIFIED" } } } },
      },
    });

    const entrepreneurs = profiles.map((profile) => ({
      id: profile.id,
      fullName: profile.user.name,
      university: profile.university,
      businessName: profile.business?.businessName ?? "—",
      primaryCategory: profile.business?.businessCategory ?? "—",
      productCount: profile.business?.products.length ?? 0,
      salesVolume: profile.business?.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0) ?? 0,
      status: profile.status,
      appliedAt: profile.appliedAt,
    }));

    return NextResponse.json({
      entrepreneurs,
      pagination: { currentPage: page, totalPages, totalCount, pageSize },
    });
  } catch (error) {
    console.error("Get entrepreneurs error:", error);
    return NextResponse.json({ message: "Unable to load entrepreneurs." }, { status: 500 });
  }
}
