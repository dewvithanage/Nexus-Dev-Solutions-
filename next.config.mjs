const isDev = process.env.NODE_ENV !== "production";

// Uploaded images are stored in Vercel Blob in production (see lib/upload.ts)
// and served from the store's own domain.
const BLOB_HOST = "*.public.blob.vercel-storage.com";

// Google Analytics (public pages only, after the visitor accepts cookies;
// see components/analytics/GoogleAnalytics.tsx).
const GA_SCRIPT = "https://www.googletagmanager.com";
const GA_CONNECT = "https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com";

// Content-Security-Policy: the site only loads its own scripts, styles,
// images and fonts (next/font serves Google fonts from this site). WhatsApp
// links are normal navigation and aren't affected. Next.js needs inline
// scripts for hydration, and eval/websockets only in development (hot reload).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${GA_SCRIPT}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://${BLOB_HOST} https://*.google-analytics.com https://*.googletagmanager.com`,
  "font-src 'self' data:",
  `connect-src 'self' ${GA_CONNECT}${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Don't let other sites put this one in a frame (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Browsers must trust the declared file type (matters for uploads).
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't advertise the framework in every response.
  poweredByHeader: false,
  // next/image may resize uploaded images from our Blob store, and nothing else.
  images: {
    remotePatterns: [{ protocol: "https", hostname: BLOB_HOST, pathname: "/uploads/**" }],
  },
  // pdfkit (PDF reports) reads its built-in font files from disk at runtime.
  // Keep it out of the bundle and ship those files with the report routes, or
  // the reports fail on Vercel.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/admin/reports/**": ["./node_modules/pdfkit/js/data/**/*"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
