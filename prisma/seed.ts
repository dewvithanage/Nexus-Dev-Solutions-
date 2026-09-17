import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Categories from the approved Figma design (Home page "Featured Categories").
// These are the only categories that exist until an admin adds more via
// Category Management (Himasha's page).
const categories = [
  { name: "Handmade Crafts", slug: "handmade-crafts", icon: "hand" },
  { name: "Tech & Digital", slug: "tech-digital", icon: "cpu" },
  { name: "Food & Beverages", slug: "food-beverages", icon: "coffee" },
  { name: "Services", slug: "services", icon: "scissors" },
  { name: "Fashion & Apparel", slug: "fashion-apparel", icon: "shirt" },
  { name: "Art", slug: "art", icon: "palette" },
];

async function main() {
  // Insert the 6 categories above. "upsert" means: if a category with
  // this slug already exists, leave it alone; otherwise create it. This
  // makes it safe to run this seed script over and over without making
  // duplicate categories every time.
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
  // This gives the team a real, working example to test against —
  // login credentials, an approved product, and a placed order —
  // without needing to manually register and get approved every time
  // someone sets up the project fresh.
  // ---------------------------------------------------------------

  const demoCategory = await prisma.category.findUnique({ where: { slug: "handmade-crafts" } });
  if (!demoCategory) return; // Safety check: don't continue if seeding categories somehow failed.

  // Never store a plain-text password — hash it the same way the real
  // registration API does.
  const demoPasswordHash = await bcrypt.hash("Demo@1234", 10);

  // Creates one entrepreneur account, already APPROVED (skips the usual
  // admin approval step, since this is just test data, not a real
  // registration going through the real flow).
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
    // We need the business's id further down, so ask Prisma to include
    // it in what gets returned here.
    include: { entrepreneurProfile: { include: { business: true } } },
  });

  const business = demoUser.entrepreneurProfile?.business;
  if (!business) return;

  // One approved demo product belonging to that business.
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

  // One demo order for that product — lets anyone test the WhatsApp
  // Confirmation page and the Sales/Orders pages without having to
  // place a real order through the actual checkout flow first.
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

  // Attach the real cardigan photo (provided by the team) to the demo
  // product, so it's not just a blank box on the Home/Marketplace pages.
  // The "if not already there" check stops this from adding a duplicate
  // image every time the seed script is re-run.
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

  // A 5-star review — "Trending Innovations" on the Home page only shows
  // products with a 4+ star average, so without at least one good review
  // this product would never actually show up there.
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
  // 3 MORE DEMO PRODUCTS
  // Added so "Trending Innovations" on the Home page shows more than
  // just one item — each needs to be APPROVED and have a good review to
  // actually qualify for that section (same rule as the cardigan above).
  // None of these have photos yet, so they'll show a plain placeholder
  // box on the site until real images are uploaded for them.
  // ---------------------------------------------------------------
  const techCategory = await prisma.category.findUnique({ where: { slug: "tech-digital" } });
  const foodCategory = await prisma.category.findUnique({ where: { slug: "food-beverages" } });
  const artCategory = await prisma.category.findUnique({ where: { slug: "art" } });

  const extraProducts = [
    {
      id: "demo-product-planner",
      name: "Syllabus Study Planner AI",
      description: "An AI-powered study planner that organizes your syllabus into a daily schedule.",
      price: 1200,
      category: techCategory,
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
      reviewerName: "Sandun Dissanayake",
      rating: 4,
      comment: "Beautiful work, captured my dog perfectly.",
    },
  ];

  // Loop through and create each one, same upsert pattern as above so
  // re-running this script never creates duplicates.
  for (const item of extraProducts) {
    // Skip silently if a category is somehow missing — shouldn't happen
    // since the categories are seeded first, but this avoids a crash.
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
  }

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
    // Always close the database connection when the script finishes,
    // whether it succeeded or failed.
    await prisma.$disconnect();
  });