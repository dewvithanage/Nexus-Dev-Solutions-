import { NextResponse } from "next/server";
import { getCurrentUser } from "./session";
import { isPrismaError } from "./request-validation";
import { UploadValidationError } from "./upload";

// Shared access checks and error handling for Route Handlers, so every
// endpoint answers the same way:
//   401 not signed in · 403 signed in but not allowed · 404 not found
//   409 conflicts with the current state · 400 invalid input

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function jsonError(status: number, message: string) {
  return NextResponse.json({ message }, { status });
}

export async function requireAdmin(): Promise<
  { admin: CurrentUser; error?: never } | { admin?: never; error: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) return { error: jsonError(401, "Not authenticated.") };
  if (user.role !== "ADMIN") return { error: jsonError(403, "Forbidden.") };
  return { admin: user };
}

type EntrepreneurContext = {
  user: CurrentUser;
  profile: NonNullable<CurrentUser["entrepreneurProfile"]>;
  business: NonNullable<NonNullable<CurrentUser["entrepreneurProfile"]>["business"]>;
};

// approvedOnly (the default): only entrepreneurs an admin has APPROVED may
// sell. Pending and rejected accounts can still sign in and see their own
// status, but every route that creates or changes shop data refuses them.
export async function requireEntrepreneur(
  { approvedOnly = true }: { approvedOnly?: boolean } = {}
): Promise<
  | (EntrepreneurContext & { error?: undefined })
  | { error: NextResponse; user?: undefined; profile?: undefined; business?: undefined }
> {
  const user = await getCurrentUser();
  if (!user) return { error: jsonError(401, "Not authenticated.") };

  const profile = user.entrepreneurProfile;
  const business = profile?.business;
  if (user.role !== "ENTREPRENEUR" || !profile || !business) {
    return { error: jsonError(403, "Forbidden.") };
  }

  if (approvedOnly && profile.status !== "APPROVED") {
    return {
      error: jsonError(
        403,
        profile.status === "PENDING"
          ? "Your account is waiting for admin approval. You can do this once it is approved."
          : "Your application was not approved, so this isn't available."
      ),
    };
  }

  return { user, profile, business };
}

// Turns known errors into the right status code instead of a generic 500.
// Raw database errors are only logged on the server, never sent to users.
export function handleRouteError(
  error: unknown,
  context: string,
  { notFound = "Not found.", conflict = "This conflicts with existing data.", fallback = "Something went wrong." } = {}
) {
  if (error instanceof UploadValidationError) return jsonError(400, error.message);
  if (isPrismaError(error, "P2025")) return jsonError(404, notFound);
  if (isPrismaError(error, "P2002")) return jsonError(409, conflict);
  if (error instanceof SyntaxError) return jsonError(400, "Request body must be valid JSON.");
  console.error(`${context}:`, error);
  return jsonError(500, fallback);
}
