import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  transpilePackages: [
    "@deliveryos/ui-system",
    "@deliveryos/shared-types",
    "@deliveryos/shared-utils",
  ],

  experimental: {
    optimizePackageImports: ["@deliveryos/ui-system"],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.deliveryos.com" }],
  },
};

export default nextConfig;
