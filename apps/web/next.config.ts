import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Monorepo root, so file-tracing for the standalone build picks up
  // workspace packages (@4ef/shared) resolved outside apps/web.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  images: {
    remotePatterns: [
      // Dev: MinIO, matching S3_PUBLIC_URL in apps/api/.env.example.
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/media/**",
      },
      // Prod: S3, matching infrastructure/modules/storage's public_url_base.
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
