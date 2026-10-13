import { z } from "zod";

import { isValidEmailFormat, validatePassword } from "./validation";

// Server-side request schemas for the entrepreneur API. Every object schema
// is .strict(): a field the endpoint does not expect (role, businessId,
// status, userId, ...) makes the request fail with 400 instead of being
// quietly passed on to the database.

// An empty or whitespace-only string from a form means "not provided".
function blankToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

// For nullable database columns: a blank form field clears the value.
function blankToNull(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

function text(label: string, max: number) {
  return z
    .string({ invalid_type_error: `${label} must be text.` })
    .trim()
    .max(max, `${label} must be at most ${max} characters.`);
}

function requiredText(label: string, max: number) {
  return z
    .string({ required_error: `${label} is required.`, invalid_type_error: `${label} must be text.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be at most ${max} characters.`);
}

function optionalNullableText(label: string, max: number) {
  return z.preprocess(blankToNull, text(label, max).nullable()).optional();
}

const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,19}$/;
const phoneNumber = (label: string) =>
  z
    .string({ invalid_type_error: `${label} must be text.` })
    .trim()
    .regex(PHONE_PATTERN, `${label} must be a valid phone number, e.g. +94771234567.`);

const email = z
  .string({ required_error: "Email is required.", invalid_type_error: "Email must be text." })
  .trim()
  .toLowerCase()
  .max(254, "Email is too long.")
  .refine(isValidEmailFormat, "Please enter a valid email address.");

const newPassword = (label: string) =>
  z
    .string({ required_error: `${label} is required.`, invalid_type_error: `${label} must be text.` })
    .superRefine((value, ctx) => {
      const message = validatePassword(value);
      if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    });

// ---------------------------------------------------------------- auth

export const registerSchema = z
  .object({
    fullName: requiredText("Full name", 100),
    email,
    password: newPassword("Password"),
    phone: z.preprocess(blankToUndefined, phoneNumber("Contact number").optional()),
    whatsappNumber: z.preprocess(blankToUndefined, phoneNumber("WhatsApp number").optional()),
    businessName: z.preprocess(blankToUndefined, text("Business name", 100).optional()),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string({ required_error: "Email and password are required." }).trim().min(1, "Email and password are required.").max(254),
    password: z.string({ required_error: "Email and password are required." }).min(1, "Email and password are required.").max(200),
  })
  .strict();

export const forgotPasswordSchema = z.object({ email }).strict();

export const resetPasswordSchema = z
  .object({
    // Tokens are 32 random bytes in hex (see forgot-password).
    token: z
      .string({ required_error: "Reset token is required." })
      .regex(/^[a-f0-9]{64}$/, "This reset link is invalid or has expired. Please request a new one."),
    newPassword: newPassword("New password"),
  })
  .strict();

// ---------------------------------------------------------------- profile

// A website without a scheme ("myshop.lk") is accepted and stored as
// https://myshop.lk. Anything that is not http(s) (javascript:, data:, ...)
// is rejected, so the value is always safe to use as a link.
const websiteUrl = z.preprocess(
  (value) => {
    const blank = blankToNull(value);
    if (typeof blank === "string" && !/^[a-z][a-z0-9+.-]*:/i.test(blank.trim())) {
      return `https://${blank.trim()}`;
    }
    return blank;
  },
  z
    .string()
    .trim()
    .max(200, "Website must be at most 200 characters.")
    .url("Website must be a valid web address.")
    .refine((value) => /^https?:\/\//i.test(value), "Website must start with http:// or https://.")
    .nullable()
    .optional()
);

export const profileUpdateSchema = z
  .object({
    // Business
    businessName: requiredText("Business name", 100).optional(),
    description: optionalNullableText("Business description", 1000),
    businessCategory: optionalNullableText("Business category", 60),
    instagramHandle: optionalNullableText("Instagram handle", 60),
    websiteUrl,
    businessHours: optionalNullableText("Business hours", 100),
    pickupLocationNotes: optionalNullableText("Pickup location notes", 300),
    // EntrepreneurProfile
    university: optionalNullableText("Faculty", 100),
    whatsappNumber: phoneNumber("WhatsApp number").optional(),
    bio: optionalNullableText("Bio", 300),
  })
  .strict();

// ---------------------------------------------------------------- products

const productFields = {
  name: requiredText("Product name", 120),
  categoryId: requiredText("Category", 50),
  description: requiredText("Description", 2000),
  // Matches the Decimal(10, 2) column: positive, at most 2 decimal places.
  price: z
    .number({ required_error: "Price is required.", invalid_type_error: "Price must be a number." })
    .positive("Price must be greater than 0.")
    .max(99_999_999.99, "Price is too large.")
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, "Price can have at most 2 decimal places."),
  stockQuantity: z
    .number({ required_error: "Stock quantity is required.", invalid_type_error: "Stock quantity must be a number." })
    .int("Stock quantity must be a whole number greater than or equal to 0.")
    .min(0, "Stock quantity must be a whole number greater than or equal to 0.")
    .max(1_000_000, "Stock quantity is too large."),
  tags: z
    .array(text("Tag", 30).min(1, "Tags cannot be empty."), { invalid_type_error: "Tags must be a list." })
    .max(10, "A product can have at most 10 tags."),
  onCampusPickup: z.boolean({ invalid_type_error: "onCampusPickup must be true or false." }),
  areaDropOff: z.boolean({ invalid_type_error: "areaDropOff must be true or false." }),
  postingEnabled: z.boolean({ invalid_type_error: "postingEnabled must be true or false." }),
};

export const productCreateSchema = z
  .object({
    ...productFields,
    tags: productFields.tags.optional(),
    onCampusPickup: productFields.onCampusPickup.optional(),
    areaDropOff: productFields.areaDropOff.optional(),
    postingEnabled: productFields.postingEnabled.optional(),
  })
  .strict();

export const productUpdateSchema = z
  .object(productFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "No changes were provided.");

// ---------------------------------------------------------------- sales proof

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const salesConfirmationSchema = z
  .object({
    deliveryDate: z
      .string({ required_error: "A proof photo and delivery date are required." })
      .min(1, "A proof photo and delivery date are required.")
      .transform((value) => new Date(value))
      .refine((date) => !Number.isNaN(date.getTime()), "Delivery date is not a valid date.")
      // One day of slack covers time-zone differences between browser and server.
      .refine((date) => date.getTime() <= Date.now() + ONE_DAY_MS, "Delivery date cannot be in the future."),
    notes: z.preprocess(blankToNull, text("Notes", 1000).nullable()).optional(),
  })
  .strict();
