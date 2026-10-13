import type { Prisma } from "@prisma/client";

// What the public (guests) may see. A product is public only when an admin
// approved it AND its seller's registration is approved, so rejecting an
// entrepreneur hides all their listings at once.
export const publicProductWhere = {
  status: "APPROVED",
  business: { entrepreneurProfile: { status: "APPROVED" } },
} satisfies Prisma.ProductWhereInput;

export const publicBusinessWhere = {
  entrepreneurProfile: { status: "APPROVED" },
} satisfies Prisma.BusinessWhereInput;
