import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // Images come from R2 through /media, which the Worker's image optimizer cannot reach.
  images: { unoptimized: true },
  pageExtensions: ["mdx", "ts", "tsx"],
  experimental: {
    mdxRs: true,
    optimizePackageImports: ["lucide-react"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
