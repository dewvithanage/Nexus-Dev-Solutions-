// "Food & Beverages" -> "food-beverages". Used for category URLs.
export function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
