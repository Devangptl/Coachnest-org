import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow images from common CDN/hosting sources for thumbnails
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "uploadthing.com" },
    ],
  },
};

export default nextConfig;
