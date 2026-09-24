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
  // DEMO ENTREPRENEUR + DEMO ORDER
  // ---------------------------------------------------------------
  const demoCategory = await prisma.category.findUnique({ where: { slug: "handmade-crafts" } });
  if (!demoCategory) return;

  const demoPasswordHash = await bcrypt.hash("Demo@1234", 10);

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
          business: { create: { businessName: "Stanford Wool" } },
        },
      },
    },
    include: { entrepreneurProfile: { include: { business: true } } },
  });

  const business = demoUser.entrepreneurProfile?.business;
  if (!business) return;

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
      items: { create: { productId: demoProduct.id, quantity: 1, unitPriceAtOrder: 1500 } },
    },
  });

  // Demo images live in /public/images/ (NOT /public/uploads/), because
  // /public/uploads/ is gitignored (meant for real user uploads, not
  // permanent project assets) — these demo photos need to actually be
  // committed to the repo so the whole team sees them.
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

  // A demo review — "Trending" only shows products with a 4+ star
  // average, so without at least one good review the demo product
  // would never actually appear there.
  const existingDemoReview = await prisma.review.findFirst({
    where: { productId: demoProduct.id },
  });
  if (!existingDemoReview) {
    await prisma.review.create({
      data: {
        productId: demoProduct.id,
        reviewerName: "Sithu De Silva",
        rating: 5,
        comment: "This sweater is literally the softest thing I own. Picked it up right outside the campus library.",
      },
    });
  }

  // ---------------------------------------------------------------
  // 3 MORE DEMO PRODUCTS — each with a real photo and review, so
  // "Trending Innovations" on the Home page has more than one item.
  // ---------------------------------------------------------------
  const techCategory = await prisma.category.findUnique({ where: { slug: "tech-digital" } });
  const foodCategory = await prisma.category.findUnique({ where: { slug: "food-beverages" } });
  const artCategory = await prisma.category.findUnique({ where: { slug: "art" } });
  const servicesCategory = await prisma.category.findUnique({ where: { slug: "services" } });
  const fashionCategory = await prisma.category.findUnique({ where: { slug: "fashion-apparel" } });

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
      description: "An AI-powered study planner that organizes your syllabus into a daily schedule.",
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
      description: "Handmade matcha cookies baked fresh daily using ceremonial grade green tea.",
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
      description: "A hand-painted watercolor portrait of your pet, made to order.",
      price: 700,
      category: artCategory,
      imageUrl: "/images/demo-portrait.png",
      reviewerName: "Sandun Dissanayake",
      rating: 4,
      comment: "Beautiful work, captured my dog perfectly.",
    },
    // Original illustrations (not stock photos, avoids any copyright
    // concern) since no real photos exist for these 2 demo products yet.
    {
      id: "demo-product-resume",
      name: "Resume & CV Design Service",
      description: "Professional resume design and formatting, turned around within 48 hours.",
      price: 500,
      category: servicesCategory,
      imageUrl: "/images/demo-resume.svg",
      reviewerName: "Nadeesha Fonseka",
      rating: 5,
      comment: "Got interview callbacks within a week of using this resume!",
    },
    {
      id: "demo-product-totebag",
      name: "Custom Tie-Dye Tote Bag",
      description: "Hand-dyed canvas tote bags, each one-of-a-kind, made to order.",
      price: 850,
      category: fashionCategory,
      imageUrl: "/images/demo-totebag.svg",
      reviewerName: "Ravindu Silva",
      rating: 4,
      comment: "Super unique, gets compliments every time I use it.",
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

    const existingReview = await prisma.review.findFirst({ where: { productId: item.id } });
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

    // Only create/update the image if this product actually has one —
    // the last 2 demo products don't, and that's fine (same as any
    // real product before its entrepreneur uploads photos).
    if (item.imageUrl) {
      const existingImage = await prisma.productImage.findFirst({ where: { productId: item.id } });
      if (!existingImage) {
        await prisma.productImage.create({
          data: { productId: item.id, url: item.imageUrl, sortOrder: 0 },
        });
      } else {
        await prisma.productImage.updateMany({
          where: { productId: item.id },
          data: { url: item.imageUrl },
        });
      }
    }
  }

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

  console.log(`Demo data ready. Test with:`);
  console.log(`  Reviews page:  /products/${demoProduct.id}/reviews`);
  console.log(`  Order confirmation: /order-confirmation/${demoOrder.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
