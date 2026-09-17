import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Categories from the approved Figma design (Home page "Featured Categories").
const categories = [
  { name: "Handmade Crafts", slug: "handmade-crafts", icon: "hand" },
  { name: "Tech & Digital", slug: "tech-digital", icon: "cpu" },
  { name: "Food & Beverages", slug: "food-beverages", icon: "coffee" },
  { name: "Services", slug: "services", icon: "scissors" },
  { name: "Fashion & Apparel", slug: "fashion-apparel", icon: "shirt" },
  { name: "Art", slug: "art", icon: "palette" },
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log(`Seeded ${categories.length} categories.`);

  // ---------------------------------------------------------------
  // ADMIN ACCOUNT — there's no "Admin Registration" page in the 42
  // screens (admins aren't meant to self-sign-up), so we create the
  // first admin account here instead. Log in with these at /admin/login.
  // ---------------------------------------------------------------
  const adminPasswordHash = await bcrypt.hash("Admin@1234", 10);

  await prisma.user.upsert({
    where: { email: "admin@startupspark.lk" },
    update: {},
    create: {
      email: "admin@startupspark.lk",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      name: "Super Admin",
    },
  });

  console.log("Seeded admin account: admin@startupspark.lk / Admin@1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
