import type { NextConfig } from "next";
import { getConfiguredAssetRemotePatterns } from "./src/lib/assets/remote-patterns";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/p/:slug",
        destination: "/products/:slug",
        permanent: true,
      },
      {
        source: "/shop/category/:slug",
        destination: "/products?category=:slug",
        permanent: true,
      },
      {
        source: "/shop",
        destination: "/products",
        permanent: true,
      },
    ];
  },
  images: {
    // The current prototype catalog uses externally optimized Pexels delivery URLs.
    // Serving them directly avoids blocking Next's image optimizer on that upstream host.
    unoptimized: true,
    remotePatterns: [
      ...getConfiguredAssetRemotePatterns(),
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/photos/**",
      },
    ],
  },
};

export default nextConfig;
