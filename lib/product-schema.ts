import { z } from "zod";
import { idField, requiredText } from "./request-validation";

// What an entrepreneur may set on their own product. Status, owner
// (businessId), ratings and admin notes are never accepted from the
// browser: .strict() rejects them with 400.
export const productFields = {
  name: requiredText(120, "Product name"),
  categoryId: idField,
  description: requiredText(5000, "Description"),
  price: z
    .number({ required_error: "Price is required.", invalid_type_error: "Price must be a number." })
    .min(0, "Price can't be negative.")
    .max(10_000_000, "Price is too high.")
    .multipleOf(0.01, "Price can have at most 2 decimal places."),
  stockQuantity: z
    .number({ required_error: "Stock quantity is required.", invalid_type_error: "Stock quantity must be a number." })
    .int("Stock quantity must be a whole number.")
    .min(0, "Stock quantity can't be negative.")
    .max(1_000_000, "Stock quantity is too high."),
  tags: z
    .array(z.string().trim().min(1).max(30, "Each tag can be at most 30 characters."))
    .max(10, "At most 10 tags.")
    .default([]),
  onCampusPickup: z.boolean().default(false),
  areaDropOff: z.boolean().default(false),
  postingEnabled: z.boolean().default(false),
};

export const createProductSchema = z.object(productFields).strict();

// Editing sends only the fields that changed.
export const updateProductSchema = z
  .object({
    name: productFields.name.optional(),
    categoryId: productFields.categoryId.optional(),
    description: productFields.description.optional(),
    price: productFields.price.optional(),
    stockQuantity: productFields.stockQuantity.optional(),
    tags: productFields.tags.optional(),
    onCampusPickup: z.boolean().optional(),
    areaDropOff: z.boolean().optional(),
    postingEnabled: z.boolean().optional(),
  })
  .strict();
