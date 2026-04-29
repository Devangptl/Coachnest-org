import type { NextConfig } from "next";

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

export default nextConfig;
