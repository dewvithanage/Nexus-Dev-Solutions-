import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { verifySessionToken } from "./auth";

export const SESSION_COOKIE_NAME = "startup_spark_session";

// Reads the session cookie, verifies it, and loads the matching User
// (with their EntrepreneurProfile + Business, if they are an entrepreneur).
// Returns null if there is no valid session.
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
    include: {
      entrepreneurProfile: {
        include: { business: true },
      },
    },
  });

  return user;
}
