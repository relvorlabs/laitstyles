export const ASSET_PROVIDERS = ["cloudinary", "cloudflare-r2"] as const;

export type AssetProvider = (typeof ASSET_PROVIDERS)[number];

export type AssetVisibility = "public" | "signed";

export type StoredAssetReference = {
  provider: AssetProvider;
  visibility: AssetVisibility;
  key: string;
  publicUrl: string;
  alt: string;
  width: number | null;
  height: number | null;
};

export type AssetRemotePattern = {
  protocol: "https";
  hostname: string;
  pathname?: string;
};
