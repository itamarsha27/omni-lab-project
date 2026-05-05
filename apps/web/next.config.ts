import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@omnilab/db", "@omnilab/lab-content"],
};

export default nextConfig;
