import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "./lib/auth";
import { SESSION_COOKIE_NAME } from "./lib/session";

// This runs before every request. It protects:
//   /entrepreneur/dashboard/*  -> must be logged in as ENTREPRENEUR
//   /admin/*  (except /admin/login) -> must be logged in as ADMIN
// Public pages and API routes are left alone here; each API route should
// still check the session itself before writing to the database.

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isEntrepreneurArea =
    pathname.startsWith("/entrepreneur") &&
    pathname !== "/entrepreneur/login" &&
    pathname !== "/entrepreneur/register" &&
    pathname !== "/entrepreneur/forgot-password" &&
    pathname !== "/entrepreneur/reset-password";

  const isAdminArea =
    pathname.startsWith("/admin") && pathname !== "/admin/login";

  if (!isEntrepreneurArea && !isAdminArea) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginPath = isAdminArea ? "/admin/login" : "/entrepreneur/login";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  if (isEntrepreneurArea && session.role !== "ENTREPRENEUR") {
    return NextResponse.redirect(new URL("/entrepreneur/login", request.url));
  }

  if (isAdminArea && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/entrepreneur/:path*", "/admin/:path*"],
};
