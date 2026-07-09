/* eslint-disable @next/next/no-img-element -- Product previews can be blob URLs or arbitrary session-only URLs. */
"use client";

import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
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

export function ProductImagesStep() {
  const [imageUrl, setImageUrl] = useState("");
  const {
    control,
    getValues,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<ProductEditorValues>();
  const { fields, append, move, replace } = useFieldArray({
    control,
    name: "media",
    keyName: "fieldKey",
  });
  const mediaError = getProductEditorFieldError(errors, "media");

  function appendPreview(url: string, source: "local-preview" | "url") {
    const existing = getValues("media");
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
  }

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      appendPreview(URL.createObjectURL(file), "local-preview");
    }
  }

  function addUrlPreview() {
    const value = imageUrl.trim();
    if (!value) return;
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
          These are session-only previews. Files are not uploaded or stored and will disappear after a refresh.
        </p>
      </div>

      <div className="grid gap-4 rounded-[18px] border border-dashed border-border bg-secondary/35 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <Field>
          <FieldLabel htmlFor="product-image-files">Choose image files</FieldLabel>
          <FieldDescription>
            Select one or more local files to preview in this browser session.
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
          No upload occurs
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field>
          <FieldLabel htmlFor="product-image-url">Or add an image URL</FieldLabel>
          <Input
            className="h-11"
            id="product-image-url"
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://…"
            value={imageUrl}
          />
        </Field>
        <Button
          className="h-11 rounded-full px-5"
          disabled={!imageUrl.trim()}
          onClick={addUrlPreview}
          type="button"
          variant="outline"
        >
          <ControlRoomIcon icon={ImageAdd01Icon} size={17} />
          Add preview
        </Button>
      </div>

      <Field data-invalid={Boolean(mediaError)}>
        <FieldLabel>Image previews</FieldLabel>
        <FieldDescription>
          Choose one cover, describe every image, and mark defects honestly.
        </FieldDescription>
        <FieldError>{mediaError}</FieldError>
      </Field>

      {fields.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field, index) => {
            const kind = getValues(`media.${index}.kind`);
            const altError = getProductEditorFieldError(
              errors,
              `media.${index}.alt`,
            );

            return (
              <article
                className="overflow-hidden rounded-[18px] border border-border bg-card"
                key={field.fieldKey}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
                  <img
                    alt={getValues(`media.${index}.alt`) || "Product preview"}
                    className="size-full object-cover"
                    src={field.url}
                  />
                  <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
                    <Badge variant={kind === "cover" ? "default" : "secondary"}>
                      {kind}
                    </Badge>
                    <Button
                      aria-label={`Remove image ${index + 1}`}
                      className="size-9 rounded-full bg-background/90"
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
                  <Field data-invalid={Boolean(altError)}>
                    <FieldLabel htmlFor={`media.${index}.alt`}>
                      Image description
                    </FieldLabel>
                    <Input
                      {...register(`media.${index}.alt`)}
                      aria-invalid={Boolean(altError)}
                      className="h-11"
                      id={`media.${index}.alt`}
                      placeholder="Front view showing the botanical print"
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
                      Use as cover
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
                        className="size-9 rounded-full"
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <ControlRoomIcon icon={ArrowUp01Icon} size={16} />
                      </Button>
                      <Button
                        aria-label="Move image later"
                        className="size-9 rounded-full"
                        disabled={index === fields.length - 1}
                        onClick={() => move(index, index + 1)}
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
              No image previews yet
            </p>
            <p className="mt-2 max-w-[420px] text-[12.5px] leading-5 text-muted-foreground">
              Drafts can be saved without images. Publishing requires exactly one cover image.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
