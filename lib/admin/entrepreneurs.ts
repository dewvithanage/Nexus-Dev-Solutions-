import { cache } from "react";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pageQuery } from "@/lib/request-validation";

// Data for Entrepreneur Management, Entrepreneur Registration Approval and
// Entrepreneur Details, shared by the Server Component pages and the
// /api/admin/entrepreneurs routes.

export const entrepreneurListQuerySchema = z.object({
  // Entrepreneur Management uses tabs (ACTIVE = everyone not rejected);
  // the Registration Approval queue filters by one exact status instead.
  tab: z.enum(["ACTIVE", "REJECTED"]).default("ACTIVE"),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  search: z.string().trim().max(100).optional(),
  university: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  ...pageQuery(),
});

export type EntrepreneurListQuery = z.infer<typeof entrepreneurListQuerySchema>;

// Filtering (tab, search, university, category) happens in the database,
// together with pagination. If it happened in the browser, a search would
// only look through the 10 rows on the current page.
export async function getEntrepreneurList({
  tab,
  status,
  search,
  university,
  category,
  page,
  pageSize,
}: EntrepreneurListQuery) {
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

  // Counts are calculated by the database, instead of loading every
  // product of every entrepreneur on the page.
  const [totalCount, profiles] = await Promise.all([
    prisma.entrepreneurProfile.count({ where }),
    prisma.entrepreneurProfile.findMany({
      where,
      orderBy: { appliedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        university: true,
        status: true,
        appliedAt: true,
        user: { select: { name: true } },
        business: {
          select: {
            id: true,
            businessName: true,
            businessCategory: true,
            _count: { select: { products: true } },
          },
        },
      },
    }),
  ]);

  // Sales volume = admin-verified sales only, the same rule the dashboard,
  // Reports and Rankings use.
  const businessIds = profiles.flatMap((profile) => (profile.business ? [profile.business.id] : []));
  const verifiedSales = businessIds.length
    ? await prisma.order.groupBy({
        by: ["businessId"],
        where: { businessId: { in: businessIds }, status: "VERIFIED" },
        _sum: { totalAmount: true },
      })
    : [];
  const salesByBusiness = new Map(
    verifiedSales.map((row) => [row.businessId, Number(row._sum.totalAmount ?? 0)])
  );

  // Plain numbers and ISO strings, so this can be sent as JSON or passed
  // from a Server Component to a Client Component.
  const entrepreneurs = profiles.map((profile) => ({
    id: profile.id,
    fullName: profile.user.name,
    university: profile.university,
    businessName: profile.business?.businessName ?? "—",
    primaryCategory: profile.business?.businessCategory ?? "—",
    productCount: profile.business?._count.products ?? 0,
    salesVolume: profile.business ? salesByBusiness.get(profile.business.id) ?? 0 : 0,
    status: profile.status,
    appliedAt: profile.appliedAt.toISOString(),
  }));

  return {
    entrepreneurs,
    pagination: { currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / pageSize)), totalCount, pageSize },
  };
}

export type EntrepreneurList = Awaited<ReturnType<typeof getEntrepreneurList>>;
export type EntrepreneurRow = EntrepreneurList["entrepreneurs"][number];

export function countPendingEntrepreneurs() {
  return prisma.entrepreneurProfile.count({ where: { status: "PENDING" } });
}

// Admin only. Just what the details page shows: never the whole User row
// (no password hash, reset token or session version).
//
// cache(): the page and its generateMetadata share one query per request.
export const getEntrepreneurDetails = cache(async (id: string) => {
  const entrepreneur = await prisma.entrepreneurProfile.findUnique({
    where: { id },
    select: {
      id: true,
      university: true,
      studentId: true,
      bio: true,
      whatsappNumber: true,
      status: true,
      rejectionReason: true,
      appliedAt: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
      business: {
        select: {
          businessName: true,
          description: true,
          products: {
            orderBy: { createdAt: "desc" },
            // A details page doesn't need every product an account has ever
            // listed; the count below is still the real total.
            take: 50,
            select: { id: true, name: true, category: { select: { name: true } } },
          },
          _count: { select: { products: true } },
        },
      },
    },
  });
  if (!entrepreneur) return null;

  return { ...entrepreneur, appliedAt: entrepreneur.appliedAt.toISOString() };
});

export type EntrepreneurDetails = NonNullable<Awaited<ReturnType<typeof getEntrepreneurDetails>>>;
