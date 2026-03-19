import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Silence workspace root warning from multiple lockfiles
  outputFileTracingRoot: path.join(__dirname, "../"),
  
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    return [
      {
        source: "/api/v1/:path*/",
        destination: `${backendUrl}/api/v1/:path*/`,
      },
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
