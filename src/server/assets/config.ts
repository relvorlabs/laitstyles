import { isAssetProvider } from "@/lib/assets/public";
import type { AssetProvider } from "@/lib/assets/types";

export type AssetServerConfig = {
  primaryProvider: AssetProvider;
  cloudinary: {
    cloudName: string;
    apiKey?: string;
    apiSecret?: string;
    uploadPreset?: string;
  };
  cloudflareR2: {
    accountId?: string;
    bucketName?: string;
    publicHost?: string;
  };
};

export function getAssetServerConfig(): AssetServerConfig {
  assertServerRuntime();

  return {
    primaryProvider: getPrimaryAssetProvider(),
    cloudinary: {
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "",
      apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
      uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
    },
    cloudflareR2: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      publicHost: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_HOST,
    },
  };
}

export function assertAssetServerConfig(): AssetServerConfig {
  const config = getAssetServerConfig();
  const missing: string[] = [];

  if (config.primaryProvider === "cloudinary" && !config.cloudinary.cloudName) {
    missing.push("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
  }

  if (config.primaryProvider === "cloudflare-r2") {
    if (!config.cloudflareR2.bucketName) {
      missing.push("CLOUDFLARE_R2_BUCKET_NAME");
    }
    if (!config.cloudflareR2.publicHost) {
      missing.push("NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_HOST");
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing asset provider environment variables: ${missing.join(", ")}`);
  }

  return config;
}

function getPrimaryAssetProvider(): AssetProvider {
  const configuredProvider = process.env.ASSET_PRIMARY_PROVIDER;
  return configuredProvider && isAssetProvider(configuredProvider)
    ? configuredProvider
    : "cloudinary";
}

function assertServerRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("Asset server configuration cannot run in the browser.");
  }
}
