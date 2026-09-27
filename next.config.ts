import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fvtgziymuvywlhytbzon.supabase.co",
      },
    ],
  },
  pageExtensions: ["mdx", "ts", "tsx"],
  outputFileTracingExcludes: {
    "*": [
      "node_modules/next/dist/server/capsize-font-metrics.json",
      "node_modules/@better-auth/kysely-adapter/**/*",
      "node_modules/@better-auth/mongo-adapter/**/*",
      "node_modules/@better-auth/prisma-adapter/**/*",
      "node_modules/@better-auth/memory-adapter/**/*",
      "node_modules/better-auth/dist/adapters/kysely-adapter/**/*",
      "node_modules/better-auth/dist/adapters/mongodb-adapter/**/*",
      "node_modules/better-auth/dist/adapters/prisma-adapter/**/*",
      "node_modules/better-auth/dist/adapters/memory-adapter/**/*",
    ],
  },
  outputFileTracingIncludes: {
    "*": ["./node_modules/pg-cloudflare/dist/**", "./node_modules/pg-cloudflare/esm/**"],
  },
  serverExternalPackages: [
    "pg",
    "drizzle-orm",
    "@better-auth/kysely-adapter",
    "@better-auth/mongo-adapter",
    "@better-auth/prisma-adapter",
    "@better-auth/memory-adapter",
  ],
  experimental: {
    mdxRs: true,
    optimizePackageImports: ["lucide-react", "@aws-sdk/client-s3", "better-auth"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
