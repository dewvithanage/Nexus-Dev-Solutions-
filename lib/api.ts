import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import type { z } from "zod";

import { getCurrentUser } from "./session";

// Shared building blocks for the entrepreneur Route Handlers, so every one
// of them answers the same situations with the same status codes:
//   401 - no valid session (not signed in, expired token, deleted account)
//   403 - signed in, but not as an entrepreneur (e.g. an admin session)
//   400 - body is not valid JSON, fails validation, or has unexpected fields

export function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

// Identity always comes from the server-side session cookie, never from
// the request body or URL. The business returned here is the ONLY business
// an entrepreneur route may read or change.
export async function requireEntrepreneur() {
  const user = await getCurrentUser();

  if (!user) {
    return { error: jsonError("You must be signed in.", 401) } as const;
  }

  const profile = user.entrepreneurProfile;
  const business = profile?.business;

  if (user.role !== "ENTREPRENEUR" || !profile || !business) {
    return { error: jsonError("Only entrepreneurs can do this.", 403) } as const;
  }

  return { user, profile, business } as const;
}

// Turns a failed Zod check into one readable message. Schemas are .strict(),
// so an extra field like "role" or "businessId" shows up as
// "unrecognized_keys" and is rejected instead of being silently ignored.
function firstValidationMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid request.";
  if (issue.code === "unrecognized_keys") {
    return `Unexpected field(s): ${issue.keys.join(", ")}.`;
  }
  return issue.message;
}

export function validationError(error: z.ZodError) {
  return jsonError(firstValidationMessage(error), 400);
}

// Usage: const parsed = await parseJsonBody(request, schema);
//        if (parsed.error) return parsed.error;
//        ...parsed.data is now the validated body.
export async function parseJsonBody<Schema extends z.ZodTypeAny>(
  request: Request,
  schema: Schema
): Promise<{ data?: z.infer<Schema>; error?: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: jsonError("Request body must be valid JSON.", 400) };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: validationError(result.error) };
  }
  return { data: result.data };
}

// P2002 = a unique constraint was violated (e.g. two requests racing to
// create the same record). Callers turn this into a 409 Conflict.
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
