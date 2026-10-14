import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireAdmin } from "@/lib/api-auth";
import { pageQuery, parseSearchParams } from "@/lib/request-validation";

const listQuerySchema = z.object({
  // Entrepreneur Management uses tabs (ACTIVE = everyone not rejected);
  // the Registration Approval queue filters by one exact status instead.
  tab: z.enum(["ACTIVE", "REJECTED"]).default("ACTIVE"),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  search: z.string().trim().max(100).optional(),
  university: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  ...pageQuery(),
});

// NOTE: filtering (tab, search, university, category) happens HERE,
// server-side, together with pagination. If filtering stayed client-side,
// a search would only look through the 10 rows on the current page.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const query = parseSearchParams(request, listQuerySchema);
    if (query.error) return query.error;
    const { tab, status, search, university, category, page, pageSize } = query.data;

    const where: Prisma.EntrepreneurProfileWhereInput = {
      status: status ?? (tab === "REJECTED" ? "REJECTED" : { not: "REJECTED" }),
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

    // Counts and totals are calculated by the database, instead of loading
    // every product and order of every entrepreneur on the page.
    const profiles = await prisma.entrepreneurProfile.findMany({
      where,
      orderBy: { appliedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { name: true } },
        business: { include: { _count: { select: { products: true } } } },
      },
    });

    const businessIds = profiles.flatMap((profile) => (profile.business ? [profile.business.id] : []));
    const verifiedSales = await prisma.order.groupBy({
      by: ["businessId"],
      where: { businessId: { in: businessIds }, status: "VERIFIED" },
      _sum: { totalAmount: true },
    });
    const salesByBusiness = new Map(
      verifiedSales.map((row) => [row.businessId, Number(row._sum.totalAmount ?? 0)])
    );

    const entrepreneurs = profiles.map((profile) => ({
      id: profile.id,
      fullName: profile.user.name,
      university: profile.university,
      businessName: profile.business?.businessName ?? "—",
      primaryCategory: profile.business?.businessCategory ?? "—",
      productCount: profile.business?._count.products ?? 0,
      salesVolume: profile.business ? salesByBusiness.get(profile.business.id) ?? 0 : 0,
      status: profile.status,
      appliedAt: profile.appliedAt,
    }));

    return NextResponse.json({
      entrepreneurs,
      pagination: { currentPage: page, totalPages, totalCount, pageSize },
    });
  } catch (error) {
    return handleRouteError(error, "Get entrepreneurs error", { fallback: "Unable to load entrepreneurs." });
  }
}
