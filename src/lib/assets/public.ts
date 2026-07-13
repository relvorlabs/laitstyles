import { ASSET_PROVIDERS, type AssetProvider } from "@/lib/assets/types";

export function isAssetProvider(value: string): value is AssetProvider {
  return ASSET_PROVIDERS.includes(value as AssetProvider);
}

export function getPublicAssetProvider(): AssetProvider {
  const configuredProvider = process.env.NEXT_PUBLIC_ASSET_PRIMARY_PROVIDER;
  return configuredProvider && isAssetProvider(configuredProvider)
    ? configuredProvider
    : "cloudinary";
}
