import type { NextConfig } from "next";

const repoName = "BibleReader";
const isProduction = process.env.NODE_ENV === "production";
const basePath = isProduction ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath
  },
  images: {
    unoptimized: true
  },
  allowedDevOrigins: ["192.168.0.151", "localhost", "127.0.0.1"]
};

export default nextConfig;
