import { NextResponse } from "next/server";

import { db } from "../../../prisma/db";

// Add a new product
export async function POST(request) {
  try {
    // Get product details from the form
    const body = await request.json();

    const {
      entrepreneurId,
      name,
      category,
      description,
      price,
      quantity,
    } = body;

    // Validate required fields
    if (
      !entrepreneurId ||
      !name ||
      !category ||
      !price ||
      quantity === undefined
    ) {
      return NextResponse.json(
        {
          message: "Please fill in all required fields.",
        },
        {
          status: 400,
        }
      );
    }

    // Save product in PostgreSQL
    const product = await db.orm.public.Product.create({
      entrepreneurId: Number(entrepreneurId),
      name,
      category,
      description: description || null,
      price: Number(price),
      quantity: Number(quantity),
      status: "PENDING",
    });

    return NextResponse.json(
      {
        message: "Product added successfully.",
        product,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Add product error:", error);

    return NextResponse.json(
      {
        message: "Unable to add product.",
      },
      {
        status: 500,
      }
    );
  }
}

// Get products added by one entrepreneur
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const entrepreneurId = searchParams.get("entrepreneurId");

    if (!entrepreneurId) {
      return NextResponse.json(
        {
          message: "Entrepreneur ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    // Load products from PostgreSQL
    const products = await db.orm.public.Product
      .where({
        entrepreneurId: Number(entrepreneurId),
      })
      .all();

    return NextResponse.json(
      {
        products,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Get products error:", error);

    return NextResponse.json(
      {
        message: "Unable to load products.",
      },
      {
        status: 500,
      }
    );
  }
}