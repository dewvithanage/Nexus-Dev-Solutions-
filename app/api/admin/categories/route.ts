import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json({
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        description: category.description,
        productCount: category._count.products,
      })),
    });
  } catch (error) {
    console.error("Get admin categories error:", error);
    return NextResponse.json({ message: "Unable to load categories." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const { name, description, icon } = (await request.json()) as {
      name?: string;
      description?: string;
      icon?: string;
    };

    if (!name) {
      return NextResponse.json({ message: "Category name is required." }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: { name, slug: slugify(name), description, icon: icon || "hand" },
    });

    return NextResponse.json({ message: "Category created.", category }, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json({ message: "Unable to create category. The name may already exist." }, { status: 500 });
  }
}
