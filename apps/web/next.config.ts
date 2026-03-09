import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@alana/database",
    "@alana/domain",
    "@alana/orchestration",
    "@alana/shared",
  ],
};

export default nextConfig;
