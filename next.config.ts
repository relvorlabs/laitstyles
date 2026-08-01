import type { NextConfig } from "next";
import { getConfiguredAssetRemotePatterns } from "./src/lib/assets/remote-patterns";

const nextConfig: NextConfig = {
  // Temporarily disabled: experimental Cache Components was leaving the
  // storefront's top-level Suspense boundary (StorefrontRouteBoundary)
  // permanently hidden/unhydrated in dev, breaking all interactivity
  // (quick view, hover, etc.) with no console error. Re-enable once
  // confirmed fixed upstream or the boundary is reworked to avoid it.
  cacheComponents: true,
  images: {
    // The current prototype catalog uses externally optimized Pexels delivery URLs.
    // Serving them directly avoids blocking Next's image optimizer on that upstream host.
    unoptimized: true,
    remotePatterns: [
      ...getConfiguredAssetRemotePatterns(),
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  allowedDevOrigins: [
    "https://laitstyle.localhost",
    "https://www.laitstyles.com",
    "http://localhost:3000",
    "http://localhost:4267"
  ],
};

export default nextConfig;
