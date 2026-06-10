import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: { document: "/offline" },
  workboxOptions: {
    skipWaiting: true,
    navigateFallbackDenylist: [/^\/api\//, /^\/checkout/, /^\/admin/],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/(?:res\.cloudinary\.com|images\.unsplash\.com)\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "remote-images",
          expiration: { maxEntries: 60, maxAgeSeconds: 604800 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^\/api\/courses(\?.*)?$/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "api-courses",
          expiration: { maxEntries: 5, maxAgeSeconds: 300 },
          cacheableResponse: { statuses: [200] },
        },
      },
      // All other API routes (auth, payments, admin, enrollments) — never cache
      {
        urlPattern: /^\/api\/.*/,
        handler: "NetworkOnly",
      },
      // Pages — network first with 10s fallback to cache
      {
        urlPattern: /^\/(?!api\/|_next\/)/,
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
          cacheableResponse: { statuses: [200] },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // ─── Image optimization ────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "uploadthing.com" },
      { protocol: "https", hostname: "i0.wp.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // ─── Compression ──────────────────────────────────────────────────
  compress: true,

  // ─── PDF generation — keep out of webpack bundle ──────────────────
  serverExternalPackages: ["@react-pdf/renderer", "pdf-parse", "pdfjs-dist"],

  // ─── Bundle Prisma schema + migration files into the admin migration
  //     API routes so they're readable at runtime in serverless builds ──
  outputFileTracingIncludes: {
    "/api/admin/migrations": ["./prisma/schema.prisma", "./prisma/migrations/**/*", "./prisma.config.ts"],
    "/api/admin/migrations/deploy": ["./prisma/schema.prisma", "./prisma/migrations/**/*", "./prisma.config.ts"],
  },

  // ─── Tree-shake heavy barrel-export packages ──────────────────────
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-select",
    ],
  },

  // ─── Security & caching headers ───────────────────────────────────
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
        ],
      },
      {
        // Cache static assets aggressively
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
