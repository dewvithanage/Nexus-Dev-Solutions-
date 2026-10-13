# StartupSpark — Web-Based Student Entrepreneur Marketplace Platform

StartupSpark is a centralized online marketplace built for the **Entrepreneurship
Development Unit, University of Sri Jayewardenepura**, connecting student
entrepreneurs with customers on campus. It replaces scattered social media
posts with one platform where students can showcase products and services,
customers can discover and contact them directly, and administrators can
manage the entire marketplace from a single dashboard.

## Client

**Organization:** Entrepreneurship Development Unit, University of Sri Jayewardenepura
**Client:** Mr. Chamika Balasuriya, Instructor

## The Problem

Student entrepreneurs at Startup Spark had no dedicated platform to promote
their products, forcing them to rely on scattered social media posts that
limited their reach. Meanwhile, program administrators had no centralized
way to manage registrations, approve listings, verify sales, or track
entrepreneur performance.

## Key Features

### For Customers (Guest — no account required)
- Browse and search products by category, price, and keyword, with pagination
- View detailed product pages with images, ratings, and reviews
- Add to cart and checkout, with orders confirmed via WhatsApp
- Leave ratings and reviews on products

### For Entrepreneurs
- Register with a university email, pending admin approval
- Manage a business profile and storefront
- Add, edit, and resubmit products (each requiring admin approval)
- Track order and sales history, with real-time revenue/escrow stats
- Upload payment confirmation proof for completed sales
- Receive notifications on registration status, product approval, and orders

### For Administrators
- Approve or reject entrepreneur registrations and product listings
- Verify submitted sales proof and manage disputes
- Rank entrepreneurs by verified sales performance
- Generate platform-wide reports and downloadable PDF summaries
- Manage categories, moderate reviews, and curate the public gallery
- Permanently remove entrepreneurs/products (with safeguards protecting
  historical order data)

## Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (Neon)
- **Auth:** Session-based authentication with bcrypt password hashing
- **Tools:** Git, GitHub, Figma

## Team

| Name | Role |
|---|---|
| A.H.O.P.A. Dias | Team Leader / Project Manager |
| W.R.A. D. H. Jayasingha | Business Analyst |
| W.D.R.S. Withanage | Main Developer |
| A.G.I. Upayangi | QA Engineer |
| K.S.P.K. De Silva | UI/UX Engineer |
