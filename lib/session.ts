import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { verifySessionToken } from "./auth";

export const SESSION_COOKIE_NAME = "startup_spark_session";

// Reads the session cookie, verifies it, and loads the matching User
// (with their EntrepreneurProfile + Business, if they are an entrepreneur).
// Returns null if there is no valid session.
//
// A token is only accepted while its sessionVersion matches the user's
// current one. Logout, a password reset or an admin rejecting the account
// increases the user's sessionVersion (see signOutEverywhere), which makes
// every token issued before that stop working, even copies of the cookie.
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    omit: { sessionVersion: false },
    include: {
      entrepreneurProfile: {
        include: { business: true },
      },
    },
  });

  if (!user || user.sessionVersion !== (payload.sessionVersion ?? -1)) {
    return null;
  }

  // The role in the token is only a hint for middleware; the database is
  // the source of truth for everything else.
  if (user.role !== payload.role) {
    return null;
  }

  const { sessionVersion: _sessionVersion, ...rest } = user;
  return rest;
}

// Ends every existing session for this user.
export async function signOutEverywhere(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
}
