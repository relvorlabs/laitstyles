import type { AssetRemotePattern } from "@/lib/assets/types";

const configuredCloudflareHost = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_HOST;

export function getConfiguredAssetRemotePatterns(): AssetRemotePattern[] {
  return [
    {
      protocol: "https",
      hostname: "drive.google.com",
      pathname: "/thumbnail",
    },
    {
      protocol: "https",
      hostname: "res.cloudinary.com",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "imagedelivery.net",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "*.r2.dev",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "images.pexels.com",
      pathname: "/photos/**",
    },
    ...(configuredCloudflareHost
      ? [
          {
            protocol: "https" as const,
            hostname: configuredCloudflareHost,
            pathname: "/**",
          },
        ]
      : []),
  ];
}
