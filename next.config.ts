import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["playwright-core"],
  outputFileTracingIncludes: {
    "/api/onemarkk/file": ["./private/onemarkk-pro-v1.6.3.zip"],
  },
};

export default nextConfig;
