import type { CloudinaryUploadWidgetResults } from "next-cloudinary";
import { err, ok, type Result } from "@/lib/errors";

export type UploadedCloudinaryAsset = {
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
};

export type CloudinaryUploadIssue = {
  code: "invalid-upload-result";
  message: string;
};

export type CloudinaryUploadStatus = "opening" | "uploading" | "completed" | "cancelled" | "failed";

export function finishCloudinaryUploadQueue(
  status: CloudinaryUploadStatus,
  appended: boolean,
): CloudinaryUploadStatus {
  if (status !== "uploading") return status;
  return appended ? "completed" : "cancelled";
}

export function normalizeCloudinaryUploadResult(
  result: CloudinaryUploadWidgetResults,
): Result<UploadedCloudinaryAsset, CloudinaryUploadIssue> {
  const info = result.info;

  if (!info || typeof info === "string" || !info.public_id?.trim() || !info.secure_url?.trim()) {
    return err({
      code: "invalid-upload-result",
      message: "Cloudinary did not return a usable image.",
    });
  }

  return ok({
    publicId: info.public_id,
    url: info.secure_url,
    width: info.width ?? null,
    height: info.height ?? null,
    format: info.format ?? null,
    bytes: info.bytes ?? null,
  });
}
