import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  compress: true,
  poweredByHeader: false,
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["unpdf", "mammoth"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: [
      "@remixicon/react",
      "lucide-react",
      "framer-motion",
      "three",
      "sonner",
      "react-aria-components",
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/host/:code",
        destination: "/buat-ruang-kuis/:code",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/host/:code",
        destination: "/buat-ruang-kuis/:code",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
