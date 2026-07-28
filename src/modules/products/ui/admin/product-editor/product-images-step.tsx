"use client";

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Delete02Icon,
  ImageAdd01Icon,
} from "@hugeicons/core-free-icons";
import type { CloudinaryUploadWidgetResults } from "next-cloudinary";
import { CldUploadButton } from "next-cloudinary";
import { useRef, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getProductEditorFieldError } from "@/modules/products/ui/admin/product-editor/product-editor-errors";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import type { ProductEditorValues } from "@/lib/admin/shared/types";
import {
  finishCloudinaryUploadQueue,
  normalizeCloudinaryUploadResult,
  type UploadedCloudinaryAsset,
} from "@/lib/assets/client/cloudinary-upload";

const MAX_IMAGES = 12;
type UploadStatus = "opening" | "uploading" | "completed" | "cancelled" | "failed";

const uploadStatusMessage: Record<UploadStatus, string> = {
  opening: "Opening image uploader.",
  uploading: "Uploading images.",
  completed: "Image upload completed.",
  cancelled: "Image upload cancelled.",
  failed: "Image upload failed. Try again.",
};

export function ProductImagesStep() {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const uploadAppended = useRef(false);
  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<ProductEditorValues>();
  const watchedMedia = useWatch({ control, name: "media" }) ?? [];
  const { fields, append, move, replace } = useFieldArray({
    control,
    name: "media",
    keyName: "fieldKey",
  });
  const mediaError = getProductEditorFieldError(errors, "media");
  const remainingSlots = Math.max(0, MAX_IMAGES - fields.length);
  const uploadActive = uploadStatus === "opening" || uploadStatus === "uploading";

  function handleUploadSuccess(result: CloudinaryUploadWidgetResults) {
    const normalized = normalizeCloudinaryUploadResult(result);
    if (!normalized.ok) {
      setUploadStatus("failed");
      setFeedback(normalized.error.message);
      return;
    }
    if (!addUploadedImage(normalized.value)) setUploadStatus("failed");
  }

  function addUploadedImage(image: UploadedCloudinaryAsset) {
    const existing = getValues("media");
    if (existing.length >= MAX_IMAGES) {
      setFeedback(`A product can have up to ${MAX_IMAGES} images.`);
      return false;
    }
    if (existing.some((item) => item.publicId === image.publicId)) {
      setFeedback("That image is already in this product record.");
      return false;
    }

    append({
      id: `media-${crypto.randomUUID()}`,
      publicId: image.publicId,
      url: image.url,
      width: image.width,
      height: image.height,
      format: image.format,
      bytes: image.bytes,
      alt: "",
      kind: existing.some((item) => item.kind === "cover") ? "detail" : "cover",
      position: existing.length,
      source: "upload",
    });
    uploadAppended.current = true;
    setFeedback("Image added. Add a description and choose the featured cover.");
    return true;
  }

  function setCover(index: number) {
    const next = getValues("media").map((item, itemIndex) => ({
      ...item,
      kind:
        itemIndex === index
          ? ("cover" as const)
          : item.kind === "cover"
            ? ("detail" as const)
            : item.kind,
    }));
    replace(next);
    setFeedback("Featured cover updated.");
  }

  function removePreview(index: number) {
    const current = getValues("media");
    const next = current.filter((_, itemIndex) => itemIndex !== index);
    if (next.length && !next.some((item) => item.kind === "cover")) {
      next[0] = { ...next[0], kind: "cover" };
    }
    replace(next.map((item, position) => ({ ...item, position })));
    setFeedback("Image removed. The first remaining image becomes cover when needed.");
  }

  function movePreview(from: number, to: number) {
    move(from, to);
    const reordered = getValues("media").map((item, position) => ({
      ...item,
      position,
    }));
    setValue("media", reordered, { shouldDirty: true });
  }

  return (
    <section aria-labelledby="product-images-title" className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Product recognition
        </p>
        <h2
          className="mt-2 font-serif text-[30px] font-medium leading-tight sm:text-[36px]"
          id="product-images-title"
        >
          Build the productâ€™s visual record.
        </h2>
        <p className="mt-3 max-w-[700px] text-[13px] leading-6 text-muted-foreground">
          Upload up to {MAX_IMAGES} images, reorder them, mark defects and choose one featured
          cover. Every image uploads directly to Cloudinary.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-dashed border-border bg-surface-sunken p-4">
        <div>
          <p className="text-[12.5px] font-semibold">Upload product images</p>
          <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
            Select one or more images. They upload straight to Cloudinary and preview here.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground md:block">
            {fields.length}/{MAX_IMAGES} images
          </span>
          {remainingSlots > 0 && !uploadActive ? (
            <CldUploadButton
              className={buttonVariants({ size: "lg", variant: "outline" })}
              data-slot="button"
              onClose={() =>
                setUploadStatus((current) =>
                  current === "opening" || current === "uploading" ? "cancelled" : current,
                )
              }
              onError={() => {
                setUploadStatus("failed");
                setFeedback("That upload failed. Try again.");
              }}
              onOpen={() => {
                uploadAppended.current = false;
                setFeedback(null);
                setUploadStatus("opening");
              }}
              onQueuesEnd={() =>
                setUploadStatus((current) =>
                  current ? finishCloudinaryUploadQueue(current, uploadAppended.current) : current,
                )
              }
              onQueuesStart={() => setUploadStatus("uploading")}
              onSuccess={handleUploadSuccess}
              options={{
                multiple: true,
                maxFiles: remainingSlots,
                sources: ["local", "camera"],
                clientAllowedFormats: ["png", "jpg", "jpeg", "webp", "avif"],
                folder: "laitstyles/products",
              }}
              signatureEndpoint="/api/v1/admin/assets/sign"
            >
              <AdminIcon icon={ImageAdd01Icon} size={17} />
              {uploadActive ? "Uploading images" : "Upload images"}
            </CldUploadButton>
          ) : (
            <span
              className={buttonVariants({
                size: "lg",
                variant: "outline",
                className: "pointer-events-none opacity-50",
              })}
            >
              <AdminIcon icon={ImageAdd01Icon} size={17} />
              Upload images
            </span>
          )}
        </div>
      </div>

      {uploadStatus || feedback ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-border bg-surface-interactive px-4 py-3 text-sm text-surface-interactive-foreground"
        >
          {feedback ?? (uploadStatus ? uploadStatusMessage[uploadStatus] : null)}
        </p>
      ) : null}

      <Field data-invalid={Boolean(mediaError)}>
        <FieldLabel>Product images</FieldLabel>
        <FieldDescription>
          The featured cover leads grid cards and the storefront. Every image needs a useful
          description.
        </FieldDescription>
        <FieldError>{mediaError}</FieldError>
      </Field>

      {fields.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field, index) => {
            const media = watchedMedia[index] ?? field;
            const kind = media.kind;
            const altError = getProductEditorFieldError(errors, `media.${index}.alt`);

            return (
              <article
                className="overflow-hidden rounded-[18px] border border-border bg-card"
                key={field.fieldKey}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-surface-sunken">
                  <CloudImage
                    alt={media.alt || "Product preview"}
                    className="object-cover"
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    src={media.url}
                  />
                  <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
                    <Badge variant={kind === "cover" ? "default" : "secondary"}>
                      {kind === "cover" ? "Featured cover" : kind}
                    </Badge>
                    <Button
                      aria-label={`Remove image ${index + 1}`}
                      onClick={() => removePreview(index)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <AdminIcon icon={Delete02Icon} size={16} />
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <Field data-invalid={Boolean(altError)}>
                    <FieldLabel htmlFor={`media.${index}.alt`}>Image description</FieldLabel>
                    <Input
                      aria-invalid={Boolean(altError)}
                      id={`media.${index}.alt`}
                      inputSize="lg"
                      isValid={!altError && media.alt.trim().length > 0}
                      onChange={(event) =>
                        setValue(`media.${index}.alt`, event.target.value, { shouldDirty: true })
                      }
                      placeholder="Front view showing the denim wash and relaxed fit"
                      value={media.alt}
                    />
                    <FieldError>{altError}</FieldError>
                  </Field>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      disabled={kind === "cover"}
                      onClick={() => setCover(index)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Set as featured cover
                    </Button>
                    <Button
                      disabled={kind === "cover"}
                      onClick={() =>
                        setValue(`media.${index}.kind`, kind === "defect" ? "detail" : "defect", {
                          shouldDirty: true,
                        })
                      }
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      {kind === "defect" ? "Mark as detail" : "Mark defect"}
                    </Button>
                    <span className="ml-auto flex gap-1">
                      <Button
                        aria-label="Move image earlier"
                        disabled={index === 0}
                        onClick={() => movePreview(index, index - 1)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <AdminIcon icon={ArrowUp01Icon} size={16} />
                      </Button>
                      <Button
                        aria-label="Move image later"
                        disabled={index === fields.length - 1}
                        onClick={() => movePreview(index, index + 1)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <AdminIcon icon={ArrowDown01Icon} size={16} />
                      </Button>
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="grid min-h-52 place-items-center rounded-[18px] border border-dashed border-border bg-card p-8 text-center">
          <div>
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-secondary">
              <AdminIcon icon={ImageAdd01Icon} size={22} />
            </span>
            <p className="mt-4 font-serif text-[22px] font-medium">No product images yet</p>
            <p className="mt-2 max-w-[420px] text-[12.5px] leading-5 text-muted-foreground">
              Drafts can be saved without images. Publishing requires one featured cover and useful
              descriptions.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
