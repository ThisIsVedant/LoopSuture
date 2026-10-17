import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["falkordb"],
  turbopack: { rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } } },
};
export default nextConfig;
