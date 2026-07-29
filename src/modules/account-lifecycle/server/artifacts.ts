import "server-only";

import { v2 as cloudinary } from "cloudinary";
import { AccountLifecycleError } from "@/modules/account-lifecycle/types";
import { getAssetServerConfig } from "@/server/assets/config";

function configureCloudinary() {
  const { cloudName, apiKey, apiSecret } = getAssetServerConfig().cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new AccountLifecycleError(
      "EXPORT_STORAGE_UNAVAILABLE",
      "Account export storage is not configured.",
    );
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export async function storeAccountExportArtifact(input: {
  customerId: string;
  exportId: string;
  payload: unknown;
}): Promise<string> {
  configureCloudinary();
  const publicId = `laitstyles/account-exports/${input.customerId}/${input.exportId}`;

  const result = await new Promise<{ public_id: string }>((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: "raw",
        type: "authenticated",
        format: "json",
        overwrite: false,
      },
      (error, uploaded) => {
        if (error || !uploaded) {
          reject(error ?? new Error("Cloudinary did not return an export artifact."));
          return;
        }
        resolve(uploaded);
      },
    );
    upload.end(Buffer.from(JSON.stringify(input.payload), "utf8"));
  });

  return result.public_id;
}

export async function readAccountExportArtifact(storageKey: string, now: Date): Promise<string> {
  configureCloudinary();
  const downloadUrl = cloudinary.utils.private_download_url(storageKey, "json", {
    resource_type: "raw",
    type: "authenticated",
    expires_at: Math.floor(now.getTime() / 1_000) + 60,
    attachment: false,
  });
  const response = await fetch(downloadUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new AccountLifecycleError(
      "EXPORT_STORAGE_UNAVAILABLE",
      "The export artifact could not be retrieved.",
    );
  }
  return response.text();
}

export async function deleteAccountExportArtifact(storageKey: string): Promise<void> {
  configureCloudinary();
  await cloudinary.uploader.destroy(storageKey, {
    resource_type: "raw",
    type: "authenticated",
    invalidate: true,
  });
}
