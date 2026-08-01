"use client";

import { CldUploadButton } from "next-cloudinary";
import { useRef, useState } from "react";
import { type ButtonVariantProps, buttonVariants } from "@/components/ui/button";
import {
  normalizeCloudinaryUploadResult,
  type UploadedCloudinaryAsset,
} from "@/lib/assets/client/cloudinary-upload";

export type CloudUploadStatus =
  | "idle"
  | "opening"
  | "uploading"
  | "completed"
  | "cancelled"
  | "failed";

export type CloudUploadIssue = {
  code: "invalid-upload-result" | "upload-failed";
  message: string;
};

type CloudUploadButtonProps = ButtonVariantProps & {
  folder: string;
  label: string;
  multiple?: boolean;
  maxFiles?: number;
  disabled?: boolean;
  onAsset: (asset: UploadedCloudinaryAsset) => boolean | undefined;
  onComplete?: () => void;
  onStatusChange?: (status: CloudUploadStatus) => void;
  onError?: (issue: CloudUploadIssue) => void;
};

function CloudUploadButton({
  folder,
  label,
  multiple = false,
  maxFiles,
  disabled = false,
  size,
  variant,
  onAsset,
  onComplete,
  onStatusChange,
  onError,
}: CloudUploadButtonProps) {
  const [status, setStatus] = useState<CloudUploadStatus>("idle");
  const accepted = useRef(false);
  const busy = status === "opening" || status === "uploading";
  const accessibleLabel = busy
    ? status === "opening"
      ? "Opening image uploader"
      : "Uploading images"
    : label;

  function setLifecycle(nextStatus: CloudUploadStatus) {
    setStatus(nextStatus);
    onStatusChange?.(nextStatus);
  }

  function reportError(issue: CloudUploadIssue) {
    setLifecycle("failed");
    onError?.(issue);
  }

  return (
    <CldUploadButton
      aria-label={accessibleLabel}
      className={buttonVariants({ size, variant })}
      data-slot="button"
      disabled={disabled || busy}
      onError={() =>
       { reportError({ code: "upload-failed", message: "Image upload failed. Try again." });
         setStatus("failed");}
      }
      onOpen={() => {
        accepted.current = false;
        setLifecycle("opening");
      }}
      onClose={() => {
        setLifecycle("cancelled");
      }}
      onQueuesEnd={() => {
        const completed = accepted.current;
        setLifecycle(completed ? "completed" : status === "failed" ? "failed" : "cancelled");
        if (completed) onComplete?.();
      }}
      onQueuesStart={() => {
        accepted.current = false;
        setLifecycle("uploading");
      }}
      onSuccess={(result) => {
        const normalized = normalizeCloudinaryUploadResult(result);
        if (!normalized.ok) {
          reportError({ code: "invalid-upload-result", message: normalized.error.message });
          return;
        }

        if (onAsset(normalized.value) !== false) accepted.current = true;
      }}
      options={{
        folder,
        multiple,
        maxFiles,
        sources: ["local", "camera", "google_drive", "unsplash"],
        clientAllowedFormats: ["png", "jpg", "jpeg", "webp", "avif"],
      }}
      signatureEndpoint="/api/v1/admin/assets/sign"
    >
      <span>{busy ? accessibleLabel : label}</span>
      <span aria-live="polite" className="sr-only">
        {status === "idle" ? "" : accessibleLabel}
      </span>
      {busy ? (
        <span
          aria-hidden
          className="fixed inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-sm"
        >
          <span className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm text-card-foreground shadow-lg">
            <span className="size-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
            {accessibleLabel}
          </span>
        </span>
      ) : null}
    </CldUploadButton>
  );
}

export { CloudUploadButton };
