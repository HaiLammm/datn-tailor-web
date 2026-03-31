import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Silence workspace root warning from multiple lockfiles
  outputFileTracingRoot: path.join(__dirname, "../"),

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/uploads/**",
      },
    ],
  },

  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    return [
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
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
