import type { CloudinaryUploadWidgetResults } from "next-cloudinary";
import { describe, expect, it } from "vitest";
import { finishCloudinaryUploadQueue, normalizeCloudinaryUploadResult } from "./cloudinary-upload";

describe("normalizeCloudinaryUploadResult", () => {
  it("normalizes a complete widget success result", () => {
    expect(
      normalizeCloudinaryUploadResult({
        info: {
          public_id: "laitstyles/products/coat",
          secure_url: "https://res.cloudinary.com/store/image/upload/v1/coat.jpg",
          width: 1200,
          height: 1500,
          format: "jpg",
          bytes: 2048,
        },
      } as CloudinaryUploadWidgetResults),
    ).toEqual({
      ok: true,
      value: expect.objectContaining({ publicId: "laitstyles/products/coat" }),
    });
  });

  it.each([
    { info: undefined },
    { info: "pending" },
    { info: { public_id: "", secure_url: "" } },
  ])("rejects incomplete success metadata", (result) =>
    expect(normalizeCloudinaryUploadResult(result as never)).toMatchObject({ ok: false }));
});

describe("finishCloudinaryUploadQueue", () => {
  it("keeps a multi-file queue pending until its end and completes only after an appended image", () => {
    expect(finishCloudinaryUploadQueue("uploading", true)).toBe("completed");
  });

  it.each(["failed", "cancelled"] as const)("preserves %s status at queue end", (status) => {
    expect(finishCloudinaryUploadQueue(status, true)).toBe(status);
  });

  it("cancels an upload queue with no appended image", () => {
    expect(finishCloudinaryUploadQueue("uploading", false)).toBe("cancelled");
  });
});
