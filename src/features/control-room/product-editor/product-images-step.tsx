/* eslint-disable @next/next/no-img-element -- Product previews can be blob URLs or arbitrary session-only URLs. */
"use client";

import { useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Delete02Icon,
  ImageAdd01Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getProductEditorFieldError } from "@/features/control-room/product-editor/product-editor-errors";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import type { ProductEditorValues } from "@/lib/control-room/types";

const MAX_IMAGES = 12;

export function ProductImagesStep() {
  const [imageUrl, setImageUrl] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const {
    control,
    getValues,
    register,
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

  function appendPreview(url: string, source: "local-preview" | "url") {
    const existing = getValues("media");
    if (existing.length >= MAX_IMAGES) {
      setFeedback(`A product can have up to ${MAX_IMAGES} images.`);
      return;
    }
    if (existing.some((item) => item.url.trim() === url.trim())) {
      setFeedback("That image is already in this product record.");
      return;
    }
    append({
      id: `media-${crypto.randomUUID()}`,
      url,
      alt: "",
      kind: existing.some((item) => item.kind === "cover")
        ? "detail"
        : "cover",
      position: existing.length,
      source,
    });
    setFeedback("Image added. Add a description and choose the featured cover.");
  }

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        setFeedback(`${file.name} is not an image.`);
        continue;
      }
      appendPreview(URL.createObjectURL(file), "local-preview");
    }
  }

  function addUrlPreview() {
    const value = imageUrl.trim();
    if (!value) return;
    try {
      const parsed = new URL(value);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      setFeedback("Enter a complete http or https image URL.");
      return;
    }
    appendPreview(value, "url");
    setImageUrl("");
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
    const removed = current[index];
    if (removed?.source === "local-preview" && removed.url.startsWith("blob:")) {
      URL.revokeObjectURL(removed.url);
    }

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
          Build the product’s visual record.
        </h2>
        <p className="mt-3 max-w-[700px] text-[13px] leading-6 text-muted-foreground">
          Add up to {MAX_IMAGES} images, edit remote URLs, reorder them, mark defects and choose one featured cover. Local files remain session-only previews until real storage is connected.
        </p>
      </div>

      <div className="grid gap-4 rounded-[18px] border border-dashed border-border bg-surface-sunken p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <Field>
          <FieldLabel htmlFor="product-image-files">Choose image files</FieldLabel>
          <FieldDescription>
            Select several images at once. They preview immediately in this browser session.
          </FieldDescription>
          <Input
            accept="image/*"
            className="h-11 file:mr-3"
            id="product-image-files"
            multiple
            onChange={(event) => addFiles(event.target.files)}
            type="file"
          />
        </Field>
        <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground md:block">
          {fields.length}/{MAX_IMAGES} images
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field>
          <FieldLabel htmlFor="product-image-url">Or add an image URL</FieldLabel>
          <Input
            className="h-11"
            id="product-image-url"
            onChange={(event) => setImageUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addUrlPreview();
              }
            }}
            placeholder="https://…"
            value={imageUrl}
          />
        </Field>
        <Button
          className="h-11 rounded-full px-5"
          disabled={!imageUrl.trim() || fields.length >= MAX_IMAGES}
          onClick={addUrlPreview}
          type="button"
          variant="outline"
        >
          <ControlRoomIcon icon={ImageAdd01Icon} size={17} />
          Add image
        </Button>
      </div>

      {feedback ? (
        <p aria-live="polite" className="rounded-xl border border-border bg-surface-interactive px-4 py-3 text-sm text-surface-interactive-foreground">
          {feedback}
        </p>
      ) : null}

      <Field data-invalid={Boolean(mediaError)}>
        <FieldLabel>Product images</FieldLabel>
        <FieldDescription>
          The featured cover leads grid cards and the storefront. Every image needs a useful description.
        </FieldDescription>
        <FieldError>{mediaError}</FieldError>
      </Field>

      {fields.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field, index) => {
            const media = watchedMedia[index] ?? field;
            const kind = media.kind;
            const altError = getProductEditorFieldError(
              errors,
              `media.${index}.alt`,
            );
            const urlError = getProductEditorFieldError(
              errors,
              `media.${index}.url`,
            );

            return (
              <article
                className="overflow-hidden rounded-[18px] border border-border bg-card"
                key={field.fieldKey}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-surface-sunken">
                  <img
                    alt={media.alt || "Product preview"}
                    className="size-full object-cover"
                    src={media.url}
                  />
                  <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
                    <Badge variant={kind === "cover" ? "default" : "secondary"}>
                      {kind === "cover" ? "Featured cover" : kind}
                    </Badge>
                    <Button
                      aria-label={`Remove image ${index + 1}`}
                      className="size-10 rounded-full bg-surface-raised/92"
                      onClick={() => removePreview(index)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <ControlRoomIcon icon={Delete02Icon} size={16} />
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <Field data-invalid={Boolean(urlError)}>
                    <FieldLabel htmlFor={`media.${index}.url`}>Image URL</FieldLabel>
                    <FieldDescription>
                      {media.source === "local-preview"
                        ? "Local preview URLs cannot be edited. Remove and choose the file again to replace it."
                        : "Edit this URL to replace the image while keeping its order and description."}
                    </FieldDescription>
                    <Input
                      {...register(`media.${index}.url`)}
                      aria-invalid={Boolean(urlError)}
                      className="h-11"
                      id={`media.${index}.url`}
                      readOnly={media.source === "local-preview"}
                    />
                    <FieldError>{urlError}</FieldError>
                  </Field>

                  <Field data-invalid={Boolean(altError)}>
                    <FieldLabel htmlFor={`media.${index}.alt`}>
                      Image description
                    </FieldLabel>
                    <Input
                      {...register(`media.${index}.alt`)}
                      aria-invalid={Boolean(altError)}
                      className="h-11"
                      id={`media.${index}.alt`}
                      placeholder="Front view showing the denim wash and relaxed fit"
                    />
                    <FieldError>{altError}</FieldError>
                  </Field>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      className="rounded-full"
                      disabled={kind === "cover"}
                      onClick={() => setCover(index)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Set as featured cover
                    </Button>
                    <Button
                      className="rounded-full"
                      disabled={kind === "cover"}
                      onClick={() =>
                        setValue(
                          `media.${index}.kind`,
                          kind === "defect" ? "detail" : "defect",
                          { shouldDirty: true },
                        )
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
                        className="size-10 rounded-full"
                        disabled={index === 0}
                        onClick={() => movePreview(index, index - 1)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <ControlRoomIcon icon={ArrowUp01Icon} size={16} />
                      </Button>
                      <Button
                        aria-label="Move image later"
                        className="size-10 rounded-full"
                        disabled={index === fields.length - 1}
                        onClick={() => movePreview(index, index + 1)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <ControlRoomIcon icon={ArrowDown01Icon} size={16} />
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
              <ControlRoomIcon icon={ImageAdd01Icon} size={22} />
            </span>
            <p className="mt-4 font-serif text-[22px] font-medium">
              No product images yet
            </p>
            <p className="mt-2 max-w-[420px] text-[12.5px] leading-5 text-muted-foreground">
              Drafts can be saved without images. Publishing requires one featured cover and useful descriptions.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
