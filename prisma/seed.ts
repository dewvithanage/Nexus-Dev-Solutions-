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
  // Seed categories
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log(`Seeded ${categories.length} categories.`);

  // ---------------------------------------------------------------
  // DEMO DATA
  // Lets the team test Reviews and WhatsApp Confirmation
  // without waiting for admin approval pages.
  // ---------------------------------------------------------------

  const demoCategory = await prisma.category.findUnique({
    where: { slug: "handmade-crafts" },
  });

  if (!demoCategory) return;

  const demoPasswordHash = await bcrypt.hash("Demo@1234", 10);

  // Create demo entrepreneur
  const demoUser = await prisma.user.upsert({
    where: { email: "demo.entrepreneur@fhss.sjp.ac.lk" },
    update: {},
    create: {
      email: "demo.entrepreneur@fhss.sjp.ac.lk",
      passwordHash: demoPasswordHash,
      role: "ENTREPRENEUR",
      name: "Sarah Perera",
      phone: "+94771234567",
      entrepreneurProfile: {
        create: {
          whatsappNumber: "+94771234567",
          status: "APPROVED",
          business: {
            create: {
              businessName: "Stanford Wool",
            },
          },
        },
      },
    },
    include: {
      entrepreneurProfile: {
        include: {
          business: true,
        },
      },
    },
  });

  const business = demoUser.entrepreneurProfile?.business;

  if (!business) return;

  // Create demo product
  const demoProduct = await prisma.product.upsert({
    where: { id: "demo-product-cardigan" },
    update: {},
    create: {
      id: "demo-product-cardigan",
      businessId: business.id,
      categoryId: demoCategory.id,
      name: "Hand-Knitted Wool Cardigan",
      description:
        "Every cardigan is crafted with 100% natural merino wool. Cozy, durable, and designed with premium cable stitch pattern.",
      price: 1500,
      stockQuantity: 10,
      onCampusPickup: true,
      status: "APPROVED",
    },
  });

  // Create demo order
  const demoOrder = await prisma.order.upsert({
    where: { id: "demo-order-1024" },
    update: {},
    create: {
      id: "demo-order-1024",
      businessId: business.id,
      buyerName: "Imesha Hansani",
      buyerPhone: "+94770001111",
      deliveryLocation: "Stanford Green Library main entrance",
      totalAmount: 1500,
      items: {
        create: {
          productId: demoProduct.id,
          quantity: 1,
          unitPriceAtOrder: 1500,
        },
      },
    },
  });

  // Add a real demo product image
  const existingDemoImage = await prisma.productImage.findFirst({
    where: { productId: demoProduct.id },
  });

  if (!existingDemoImage) {
    await prisma.productImage.create({
      data: {
        productId: demoProduct.id,
        url: "/uploads/products/demo-cardigan.png",
        sortOrder: 0,
      },
    });
  }

  // Add a demo review
  const existingDemoReview = await prisma.review.findFirst({
    where: { productId: demoProduct.id },
  });

  if (!existingDemoReview) {
    await prisma.review.create({
      data: {
        productId: demoProduct.id,
        reviewerName: "Sithu De Silva",
        rating: 5,
        comment:
          "This sweater is literally the softest thing I own. Picked it up right outside the campus library.",
      },
    });
  }

  // ---------------------------------------------------------------
  // ADMIN ACCOUNT
  // Admins are created through the seed instead of self-registration.
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

  console.log("Demo data ready. Test with:");
  console.log(`  Reviews page: /products/${demoProduct.id}/reviews`);
  console.log(
    `  Order confirmation: /order-confirmation/${demoOrder.id}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });