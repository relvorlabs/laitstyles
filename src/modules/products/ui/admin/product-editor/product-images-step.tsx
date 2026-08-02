"use client";

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Delete02Icon,
  ImageAdd01Icon,
} from "@hugeicons/core-free-icons";
import { useEffect, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import { CloudUploadButton } from "@/components/ui/cloud-upload-button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import type { ProductEditorValues } from "@/lib/admin/shared/types";
import type { UploadedCloudinaryAsset } from "@/lib/assets/client/cloudinary-upload";
import { AdminIcon } from "@/modules/products/ui/admin/admin-icon";
import { getProductEditorFieldError } from "@/modules/products/ui/admin/product-editor/product-editor-errors";

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
  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<ProductEditorValues>();
  const productName = useWatch({ control, name: "name" }) ?? "";
  const watchedMedia = useWatch({ control, name: "media" }) ?? [];
  const { fields, append, move, replace } = useFieldArray({
    control,
    name: "media",
    keyName: "fieldKey",
  });

  useEffect(() => {
    const current = getValues("media");
    const next = current.map((item, index) =>
      item.alt.trim() ? item : { ...item, alt: inferEditorMediaAlt(productName, item.kind, index) },
    );
    if (next.some((item, index) => item.alt !== current[index]?.alt)) {
      setValue("media", next, { shouldDirty: true, shouldValidate: false });
    }
  }, [getValues, productName, setValue]);

  const mediaError = getProductEditorFieldError(errors, "media");
  const remainingSlots = Math.max(0, MAX_IMAGES - fields.length);

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

    const kind = existing.some((item) => item.kind === "cover") ? "detail" : "cover";
    append({
      id: `media-${crypto.randomUUID()}`,
      publicId: image.publicId,
      url: image.url,
      width: image.width,
      height: image.height,
      format: image.format,
      bytes: image.bytes,
      alt: inferEditorMediaAlt(productName, kind, existing.length),
      kind,
      position: existing.length,
      source: "upload",
    });
    setFeedback(
      kind === "cover"
        ? "Image added and selected as the featured cover."
        : "Image added. Its accessibility description was generated automatically.",
    );
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
      alt: inferEditorMediaAlt(
        productName,
        itemIndex === index ? "cover" : item.kind === "cover" ? "detail" : item.kind,
        itemIndex,
      ),
    }));
    replace(next);
    setFeedback("Featured cover updated. Storefront cards will use this image.");
  }

  function removePreview(index: number) {
    const current = getValues("media");
    const next = current.filter((_, itemIndex) => itemIndex !== index);
    if (next.length && !next.some((item) => item.kind === "cover")) {
      next[0] = { ...next[0], kind: "cover" };
    }
    replace(
      next.map((item, position) => ({
        ...item,
        position,
        alt: inferEditorMediaAlt(productName, item.kind, position),
      })),
    );
    setFeedback("Image removed. The first remaining image becomes cover when needed.");
  }

  function movePreview(from: number, to: number) {
    move(from, to);
    const reordered = getValues("media").map((item, position) => ({
      ...item,
      position,
      alt: inferEditorMediaAlt(productName, item.kind, position),
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
          Build the product’s visual record.
        </h2>
        <p className="mt-3 max-w-[700px] text-[13px] leading-6 text-muted-foreground">
          Upload up to {MAX_IMAGES} images, reorder them, mark defects and choose one featured
          cover. Accessibility descriptions are inferred automatically from the product and image
          role.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-dashed border-border bg-surface-sunken p-4">
        <div>
          <p className="text-[12.5px] font-semibold">Upload product images</p>
          <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
            Select one or more images. The first image becomes the cover until you choose another.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground md:block">
            {fields.length}/{MAX_IMAGES} images
          </span>
          <CloudUploadButton
            disabled={remainingSlots === 0}
            folder="laitstyles/products"
            label="Upload images"
            maxFiles={remainingSlots}
            multiple
            onAsset={(image) => {
              const accepted = addUploadedImage(image);
              if (!accepted) setUploadStatus("failed");
              return accepted;
            }}
            onError={(issue) => setFeedback(issue.message)}
            onStatusChange={(status) => {
              if (status !== "idle") setUploadStatus(status);
            }}
            size="lg"
            variant="outline"
          />
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
          The featured cover leads grid cards and the storefront. Select another image at any time.
        </FieldDescription>
        <FieldError>{mediaError}</FieldError>
      </Field>

      {fields.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field, index) => {
            const media = watchedMedia[index] ?? field;
            const kind = media.kind;
            return (
              <article
                className="overflow-hidden rounded-[18px] border border-border bg-card"
                key={field.fieldKey}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-surface-sunken">
                  <CloudImage
                    alt={media.alt || inferEditorMediaAlt(productName, kind, index)}
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
                  <p className="text-xs leading-5 text-muted-foreground">
                    Accessibility: {media.alt || inferEditorMediaAlt(productName, kind, index)}
                  </p>
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
                      onClick={() => {
                        const nextKind = kind === "defect" ? "detail" : "defect";
                        setValue(`media.${index}.kind`, nextKind, { shouldDirty: true });
                        setValue(
                          `media.${index}.alt`,
                          inferEditorMediaAlt(productName, nextKind, index),
                          { shouldDirty: true },
                        );
                      }}
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
              Drafts can be saved without images. Publishing requires one featured cover.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function inferEditorMediaAlt(
  productName: string,
  kind: ProductEditorValues["media"][number]["kind"],
  position: number,
): string {
  const name = productName.trim() || "Product";
  const view =
    kind === "cover" ? "featured view" : kind === "defect" ? "condition detail" : "detail view";
  return `${name} — ${view} ${position + 1}`;
}
