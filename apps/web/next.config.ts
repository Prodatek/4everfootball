import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Monorepo root, so file-tracing for the standalone build picks up
  // workspace packages (@4ef/shared) resolved outside apps/web.
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
