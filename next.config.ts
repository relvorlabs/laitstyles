import type { NextConfig } from "next";
import { getConfiguredAssetRemotePatterns } from "./src/lib/assets/remote-patterns";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: getConfiguredAssetRemotePatterns(),
  },
};

export default nextConfig;
