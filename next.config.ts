import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["playwright-core"],
  outputFileTracingIncludes: {
    "/api/onemarkk/file": ["./private/onemarkk-pro-v1.5.0.zip"],
  },
};

export default nextConfig;
