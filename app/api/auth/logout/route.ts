import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

// Clears the session cookie. Called when the user clicks "Logout".
export async function POST() {
  const response = NextResponse.json({ message: "Logged out." });

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}
