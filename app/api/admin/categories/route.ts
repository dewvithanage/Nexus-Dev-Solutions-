import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const ITEMS_PER_PAGE = 10;

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Number(params.get("pageSize")) || ITEMS_PER_PAGE;

    const totalCount = await prisma.category.count();
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json({
      categories,
      pagination: { currentPage: page, totalPages, totalCount, pageSize },
    });
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json({ message: "Unable to load categories." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body as { name?: string };

    if (!name || !name.trim()) {
      return NextResponse.json({ message: "Category name is required." }, { status: 400 });
    }

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const category = await prisma.category.create({
      data: { name: name.trim(), slug },
    });

    return NextResponse.json({ message: "Category created.", category });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ message: "A category with this name already exists." }, { status: 409 });
    }
    console.error("Create category error:", error);
    return NextResponse.json({ message: "Unable to create category." }, { status: 500 });
  }
}
