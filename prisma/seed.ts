import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Categories from the approved Figma design
const categories = [
  { name: "Handmade Crafts", slug: "handmade-crafts" },
  { name: "Tech & Digital", slug: "tech-digital" },
  { name: "Food & Beverages", slug: "food-beverages" },
  { name: "Services", slug: "services" },
  { name: "Fashion & Apparel", slug: "fashion-apparel" },
  { name: "Art", slug: "art" },
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

  await seedAdmin();

  // Demo products, reviews and an order are for local development only.
  // They must never be added to the real database, so they are opt-in.
  if (process.env.SEED_DEMO_DATA !== "true") {
    console.log("Skipped demo data (set SEED_DEMO_DATA=true to add it on a local database).");
    return;
  }

  // ---------------------------------------------------------------
  // DEMO DATA
  // Lets the team test Reviews and WhatsApp Confirmation.
  // ---------------------------------------------------------------

  const demoCategory = await prisma.category.findUnique({
    where: { slug: "handmade-crafts" },
  });

  if (!demoCategory) return;

  const demoPasswordHash = await bcrypt.hash(requiredEnv("SEED_DEMO_PASSWORD"), 10);

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
              businessName: "Sarah's Wool Studio",
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
      deliveryLocation: "USJ main library entrance",
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

  // Demo product image
  const existingDemoImage = await prisma.productImage.findFirst({
    where: { productId: demoProduct.id },
  });

  if (!existingDemoImage) {
    await prisma.productImage.create({
      data: {
        productId: demoProduct.id,
        url: "/images/demo-cardigan.png",
        sortOrder: 0,
      },
    });
  } else {
    await prisma.productImage.updateMany({
      where: { productId: demoProduct.id },
      data: { url: "/images/demo-cardigan.png" },
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
  // Additional demo products
  // ---------------------------------------------------------------

  const techCategory = await prisma.category.findUnique({
    where: { slug: "tech-digital" },
  });

  const foodCategory = await prisma.category.findUnique({
    where: { slug: "food-beverages" },
  });

  const artCategory = await prisma.category.findUnique({
    where: { slug: "art" },
  });

  const servicesCategory = await prisma.category.findUnique({
    where: { slug: "services" },
  });

  const fashionCategory = await prisma.category.findUnique({
    where: { slug: "fashion-apparel" },
  });

  const extraProducts: {
    id: string;
    name: string;
    description: string;
    price: number;
    category: { id: string } | null;
    imageUrl?: string;
    reviewerName: string;
    rating: number;
    comment: string;
  }[] = [
    {
      id: "demo-product-planner",
      name: "Syllabus Study Planner AI",
      description:
        "An AI-powered study planner that organizes your syllabus into a daily schedule.",
      price: 1200,
      category: techCategory,
      imageUrl: "/images/demo-planner.png",
      reviewerName: "Andiana",
      rating: 5,
      comment: "This planner completely changed how I study for exams!",
    },
    {
      id: "demo-product-cookies",
      name: "Fresh Matcha Cookies",
      description:
        "Handmade matcha cookies baked fresh daily using ceremonial grade green tea.",
      price: 270,
      category: foodCategory,
      imageUrl: "/images/demo-cookies.png",
      reviewerName: "Ishini Perera",
      rating: 5,
      comment: "Best cookies on campus, hands down.",
    },
    {
      id: "demo-product-portrait",
      name: "Custom Pet Watercolor Portraits",
      description:
        "A hand-painted watercolor portrait of your pet, made to order.",
      price: 700,
      category: artCategory,
      imageUrl: "/images/demo-portrait.png",
      reviewerName: "Sandun Dissanayake",
      rating: 4,
      comment: "Beautiful work, captured my dog perfectly.",
    },
    {
      id: "demo-product-resume",
      name: "Resume & CV Design Service",
      description:
        "Professional resume design and formatting, turned around within 48 hours.",
      price: 500,
      category: servicesCategory,
      imageUrl: "/images/demo-resume.svg",
      reviewerName: "Nadeesha Fonseka",
      rating: 5,
      comment:
        "Got interview callbacks within a week of using this resume!",
    },
    {
      id: "demo-product-totebag",
      name: "Custom Tie-Dye Tote Bag",
      description:
        "Hand-dyed canvas tote bags, each one-of-a-kind, made to order.",
      price: 850,
      category: fashionCategory,
      imageUrl: "/images/demo-totebag.svg",
      reviewerName: "Ravindu Silva",
      rating: 4,
      comment:
        "Super unique, gets compliments every time I use it.",
    },
  ];

  for (const item of extraProducts) {
    if (!item.category) continue;

    await prisma.product.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        businessId: business.id,
        categoryId: item.category.id,
        name: item.name,
        description: item.description,
        price: item.price,
        stockQuantity: 10,
        status: "APPROVED",
      },
    });

    const existingReview = await prisma.review.findFirst({
      where: { productId: item.id },
    });

    if (!existingReview) {
      await prisma.review.create({
        data: {
          productId: item.id,
          reviewerName: item.reviewerName,
          rating: item.rating,
          comment: item.comment,
        },
      });
    }

    if (item.imageUrl) {
      const existingImage = await prisma.productImage.findFirst({
        where: { productId: item.id },
      });

      if (!existingImage) {
        await prisma.productImage.create({
          data: {
            productId: item.id,
            url: item.imageUrl,
            sortOrder: 0,
          },
        });
      } else {
        await prisma.productImage.updateMany({
          where: { productId: item.id },
          data: { url: item.imageUrl },
        });
      }
    }
  }

  console.log("Demo data ready. Test with:");
  console.log(`  Reviews page: /products/${demoProduct.id}/reviews`);
  console.log(`  Demo order id: ${demoOrder.id} (visible in the demo entrepreneur's Orders page)`);
}

// Passwords never live in this file: it is on GitHub, so anything written
// here is public. They come from environment variables instead.
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 12) {
    throw new Error(`${name} must be set (at least 12 characters) to run the seed.`);
  }
  return value;
}

// ---------------------------------------------------------------
// ADMIN ACCOUNT
// Admins are created through the seed instead of self-registration.
// An existing admin's password is never overwritten.
// ---------------------------------------------------------------
async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@startupspark.lk";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin account ${email} already exists; password left unchanged.`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(requiredEnv("SEED_ADMIN_PASSWORD"), 10),
      role: "ADMIN",
      name: "Super Admin",
    },
  });

  console.log(`Created admin account ${email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });