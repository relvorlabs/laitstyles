import "server-only";

import { v2 as cloudinary } from "cloudinary";
import { getAssetServerConfig } from "@/server/assets/config";

export type CloudinarySignParams = Record<string, string | number>;

export function signCloudinaryUploadParams(paramsToSign: CloudinarySignParams): string {
  const { apiSecret } = getAssetServerConfig().cloudinary;
  if (!apiSecret) {
    throw new Error("CLOUDINARY_API_SECRET is not configured on this server.");
  }

  return cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
}
