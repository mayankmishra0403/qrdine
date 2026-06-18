import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "bcryptjs", "ioredis"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.ritambharat.software",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/((?!_next/static|icons/|manifest\\.json|sw\\.js).*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "CDN-Cache-Control", value: "no-cache" },
          { key: "Cloudflare-CDN-Cache-Control", value: "no-cache" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
