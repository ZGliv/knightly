import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local environment files are not runtime assets. Vercel supplies production
  // configuration, and these files are deliberately excluded from uploads.
  outputFileTracingExcludes: {
    "/*": ["./.env*"],
  },
};

export default nextConfig;
