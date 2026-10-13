import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isValidEmailFormat, validatePassword } from "./validation";

// Server-side request validation for Route Handlers, built on Zod.
//
// Every schema is .strict(), so a request carrying a field we don't expect
// (e.g. "role", "status", "uploadedById") is rejected with 400 instead of
// being silently ignored or, worse, written to the database.
//
// Kept separate from lib/validation.ts because that file is also imported
// by browser components, and this one depends on next/server.

type Parsed<T> = { data: T; error?: never } | { data?: never; error: NextResponse };

function badRequest(message: string): { error: NextResponse } {
  return { error: NextResponse.json({ message }, { status: 400 }) };
}

function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (issue.code === "unrecognized_keys") {
    return `Unknown field(s): ${issue.keys.join(", ")}.`;
  }
  return issue.message;
}

export function parseData<S extends z.ZodTypeAny>(schema: S, input: unknown): Parsed<z.infer<S>> {
  const result = schema.safeParse(input);
  if (!result.success) return badRequest(firstIssueMessage(result.error));
  return { data: result.data };
}

// Reads a JSON body and validates it. A missing or malformed body is a 400,
// not a 500.
export async function parseJsonBody<S extends z.ZodTypeAny>(
  request: NextRequest,
  schema: S
): Promise<Parsed<z.infer<S>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }
  return parseData(schema, body);
}

// Reads multipart form data and validates it. Text fields arrive as strings
// and files as File objects; every key must be listed in the schema.
export async function parseFormBody<S extends z.ZodTypeAny>(
  request: NextRequest,
  schema: S
): Promise<Parsed<z.infer<S>>> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Request body must be form data.");
  }
  const fields: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of form.entries()) {
    if (key in fields) return badRequest(`Field "${key}" was sent more than once.`);
    fields[key] = value;
  }
  return parseData(schema, fields);
}

export function parseSearchParams<S extends z.ZodTypeAny>(
  request: NextRequest,
  schema: S
): Parsed<z.infer<S>> {
  return parseData(schema, Object.fromEntries(request.nextUrl.searchParams));
}

// ---------------------------------------------------------------------
// Reusable field rules
// ---------------------------------------------------------------------

export const emailField = z
  .string({ required_error: "Email is required.", invalid_type_error: "Email must be text." })
  .trim()
  .min(1, "Email is required.")
  .max(254, "Email is too long.")
  .refine(isValidEmailFormat, "Please enter a valid email address.");

// Same rules as the register form (lib/validation.ts), enforced here so a
// direct API call can't skip them.
export const newPasswordField = z
  .string({ required_error: "Password is required.", invalid_type_error: "Password must be text." })
  .superRefine((value, ctx) => {
    const message = validatePassword(value);
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  });

// Prisma ids in this project are cuids. Checking the shape first means a
// junk id gets a clean 404 instead of reaching the database.
export const idField = z.string().regex(/^[a-z0-9]{20,40}$/i, "Invalid id.");

export function isPrismaError(error: unknown, code: "P2002" | "P2025"): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === code
  );
}
