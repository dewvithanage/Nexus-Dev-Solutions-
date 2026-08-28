import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { db } from "../../../../prisma/db";

// This function handles entrepreneur login
export async function POST(request) {
  try {
    // Get email and password from the login form
    const body = await request.json();

    const { email, password } = body;

    // Check whether email and password are entered
    if (!email || !password) {
      return NextResponse.json(
        {
          message: "Email and password are required.",
        },
        {
          status: 400,
        }
      );
    }

    // Find the entrepreneur using the email
    const entrepreneur = await db.orm.public.Entrepreneur
      .where({
        email: email,
      })
      .first();

    // Check whether the email exists
    if (!entrepreneur) {
      return NextResponse.json(
        {
          message: "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }

    // Compare the entered password with the hashed password
    const passwordIsCorrect = await bcrypt.compare(
      password,
      entrepreneur.password
    );

    // Check whether the password is correct
    if (!passwordIsCorrect) {
      return NextResponse.json(
        {
          message: "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }

    // Return entrepreneur details after successful login
    return NextResponse.json(
      {
        message: "Login successful.",
        entrepreneur: {
          id: entrepreneur.id,
          fullName: entrepreneur.fullName,
          email: entrepreneur.email,
          businessName: entrepreneur.businessName,
          status: entrepreneur.status,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Login error:", error);

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