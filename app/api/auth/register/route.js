import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { db } from "../../../../prisma/db";

// This function handles entrepreneur registration
export async function POST(request) {
  try {
    // Get registration details from the form
    const body = await request.json();

    const {
      fullName,
      email,
      phone,
      businessName, 
      password,
    } = body;

    // Check required fields
    if (!fullName || !email || !password) {
      return NextResponse.json(
        {
          message: "Full name, email and password are required.",
        },
        {
          status: 400,
        }
      );
    }

    // Check whether the email is already registered
    const existingEntrepreneur =
      await db.orm.public.Entrepreneur
        .where({
          email: email,
        })
        .first();

    if (existingEntrepreneur) {
      return NextResponse.json(
        {
          message: "An account with this email already exists.",
        },
        {
          status: 409,
        }
      );
    }

    // Hash the password before saving it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the entrepreneur account
    const entrepreneur =
      await db.orm.public.Entrepreneur.create({
        fullName,
        email,
        password: hashedPassword,
        phone: phone || null,
        businessName: businessName || null,
        status: "PENDING",
      });

    // Return successful registration response
    return NextResponse.json(
      {
        message: "Registration successful.",
        entrepreneur: {
          id: entrepreneur.id,
          fullName: entrepreneur.fullName,
          email: entrepreneur.email,
          status: entrepreneur.status,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Registration error:", error);

    return NextResponse.json(
      {
        message: "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}