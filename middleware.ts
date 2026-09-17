import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "./lib/auth";
import { SESSION_COOKIE_NAME } from "./lib/session";

// This runs before every request. It protects:
//   /entrepreneur/*  (except login/register/forgot/reset) -> ENTREPRENEUR
//   /admin/*  (except /admin/login) -> ADMIN
//   /api/admin/*  -> ADMIN  (the admin API routes themselves, not just
//                            the admin pages — added when building the
//                            Entrepreneur Approval feature, since a
//                            missing check here would let anyone call
//                            these endpoints directly without logging in)
// Every admin API route should ALSO re-check the session itself before
// writing to the database (defense in depth) — middleware alone isn't
// considered enough on its own for something this sensitive.

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isEntrepreneurArea =
    pathname.startsWith("/entrepreneur") &&
    pathname !== "/entrepreneur/login" &&
    pathname !== "/entrepreneur/register" &&
    pathname !== "/entrepreneur/forgot-password" &&
    pathname !== "/entrepreneur/reset-password";

  const isAdminArea =
    (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) &&
    pathname !== "/admin/login";

  if (!isEntrepreneurArea && !isAdminArea) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // API routes should get a clean 401 JSON response, not an HTML redirect
  // — a fetch() call following a redirect to a login PAGE would just
  // confusingly receive HTML instead of the JSON it expected.
  const isApiRoute = pathname.startsWith("/api");

  if (!session) {
    if (isApiRoute) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }
    const loginPath = isAdminArea ? "/admin/login" : "/entrepreneur/login";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  if (isEntrepreneurArea && session.role !== "ENTREPRENEUR") {
    if (isApiRoute) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/entrepreneur/login", request.url));
  }

  if (isAdminArea && session.role !== "ADMIN") {
    if (isApiRoute) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/entrepreneur/:path*", "/admin/:path*", "/api/admin/:path*"],
};
