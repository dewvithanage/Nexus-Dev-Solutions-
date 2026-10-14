import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getCurrentUser, signOutEverywhere } from "@/lib/session";

// Ends the session. Clearing the cookie alone isn't enough: a copied token
// would keep working until it expired. Bumping the user's sessionVersion
// makes every token issued so far invalid (see lib/session.ts).
export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await signOutEverywhere(user.id);
  }

  const response = NextResponse.json({ message: "Logged out." });

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}
