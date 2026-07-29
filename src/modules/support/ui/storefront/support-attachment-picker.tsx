"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { uploadSupportAttachmentRequest } from "@/modules/support/client/api";
import type { ValidatedTicketAttachment } from "@/modules/support/types";

export function SupportAttachmentPicker({
  value,
  onChange,
}: {
  value: ValidatedTicketAttachment[];
  onChange: (next: ValidatedTicketAttachment[]) => void;
}) {
  const [status, setStatus] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setStatus("Uploading attachment...");
    try {
      const uploaded = [];
      for (const file of Array.from(files).slice(0, Math.max(0, 5 - value.length))) {
        uploaded.push(await uploadSupportAttachmentRequest(file));
      }
      onChange([...value, ...uploaded]);
      setStatus(null);
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "The attachment upload failed.");
    }
  }

  return (
    <div>
      <label className="text-sm font-semibold" htmlFor="support-attachments">
        Attach files
      </label>
      <Input
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        className="mt-2"
        disabled={value.length >= 5 || status === "Uploading attachment..."}
        id="support-attachments"
        multiple
        onChange={(event) => upload(event.currentTarget.files)}
        type="file"
      />
      <p className="mt-2 text-sm text-[var(--acc-muted)]">
        Up to five JPG, PNG, WebP or PDF files; 10 MB each.
      </p>
      {status ? (
        <p className="mt-2 text-sm" role="status">
          {status}
        </p>
      ) : null}
      {value.length ? (
        <ul className="mt-2 text-sm">
          {value.map((attachment) => (
            <li key={attachment.assetId}>{attachment.fileName}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
