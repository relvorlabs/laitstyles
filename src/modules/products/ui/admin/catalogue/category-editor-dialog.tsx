"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import type { CloudinaryUploadWidgetResults } from "next-cloudinary";
import { CldUploadButton } from "next-cloudinary";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { normalizeCloudinaryUploadResult } from "@/lib/assets/client/cloudinary-upload";
import {
  useCreateProductTaxonomy,
  useUpdateProductTaxonomy,
} from "@/modules/products/client/hooks";
import type { ProductTaxonomyItem } from "@/modules/products/types";
import { TaxonomyDeleteDialog } from "@/modules/products/ui/admin/catalogue/taxonomy-delete-dialog";

export function CategoryEditorDialog({
  item,
  itemCount,
  onOpenChange,
}: {
  item: ProductTaxonomyItem | "new" | null;
  itemCount: number;
  onOpenChange: (open: boolean) => void;
}) {
  const editing = item && item !== "new" ? item : null;
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const create = useCreateProductTaxonomy();
  const update = useUpdateProductTaxonomy();
  useEffect(() => {
    setName(editing?.name ?? "");
    setImageUrl(editing?.imageUrl ?? null);
    setFeedback(null);
  }, [editing]);
  function uploaded(result: CloudinaryUploadWidgetResults) {
    const normalized = normalizeCloudinaryUploadResult(result);
    if (!normalized.ok) {
      setFeedback(normalized.error.message);
      return;
    }
    setImageUrl(normalized.value.url);
    setFeedback("Image ready locally. Save the category to keep it.");
  }
  async function save() {
    if (!name.trim()) return;
    if (editing) {
      const result = await update.mutateAsync({
        taxonomyId: editing.id,
        input: { kind: "category", name, imageUrl, position: editing.position },
      });
      if (!result.ok) return setFeedback(result.error.message);
      onOpenChange(false);
      return;
    }
    const created = await create.mutateAsync({ kind: "category", name });
    if (!created.ok) return setFeedback(created.error.message);
    if (created.value.item) {
      const saved = await update.mutateAsync({
        taxonomyId: created.value.item.id,
        input: { kind: "category", name, imageUrl, position: itemCount },
      });
      if (!saved.ok) return setFeedback(saved.error.message);
    }
    onOpenChange(false);
  }
  const pending = create.isPending || update.isPending;
  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={Boolean(item)}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
          <div className="relative aspect-[16/7] bg-surface-sunken">
            {imageUrl ? (
              <CloudImage
                alt="Category preview"
                className="object-cover"
                fill
                sizes="640px"
                src={imageUrl}
              />
            ) : (
              <div className="grid size-full place-items-center text-muted-foreground">
                <ImagePlus className="size-10" />
              </div>
            )}
          </div>
          <div className="space-y-6 p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="font-serif text-3xl">
                {editing ? "Edit category" : "Create category"}
              </DialogTitle>
              <DialogDescription>
                Use one strong image to make this storefront destination recognisable. Uploading
                alone does not save the category.
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="category-name">Category name</FieldLabel>
              <Input
                id="category-name"
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Archive outerwear"
                value={name}
              />
            </Field>
            <Field>
              <FieldLabel>Category image</FieldLabel>
              <FieldDescription>
                The preview remains local until you choose Save category.
              </FieldDescription>
              <div className="flex flex-wrap gap-2">
                <CldUploadButton
                  className={buttonVariants({ variant: "outline" })}
                  data-slot="button"
                  onSuccess={uploaded}
                  options={{
                    multiple: false,
                    sources: ["local", "camera"],
                    folder: "laitstyles/categories",
                  }}
                  signatureEndpoint="/api/v1/admin/assets/sign"
                >
                  {" "}
                  <ImagePlus className="size-4" />
                  {imageUrl ? "Replace image" : "Upload image"}
                </CldUploadButton>
                {imageUrl ? (
                  <Button
                    onClick={() => {
                      setImageUrl(null);
                      setFeedback("Image removed locally. Save to apply the change.");
                    }}
                    type="button"
                    variant="ghost"
                  >
                    Remove preview
                  </Button>
                ) : null}
              </div>
            </Field>
            {feedback ? (
              <p
                aria-live="polite"
                className="rounded-xl border border-border bg-surface-interactive p-3 text-sm"
              >
                {feedback}
              </p>
            ) : null}
            <DialogFooter className="gap-2 sm:justify-between">
              {editing ? (
                <Button onClick={() => setDeleteOpen(true)} type="button" variant="ghost">
                  <Trash2 />
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button onClick={() => onOpenChange(false)} type="button" variant="ghost">
                  Cancel
                </Button>
                <Button disabled={pending || !name.trim()} onClick={save} type="button">
                  {pending ? "Saving…" : "Save category"}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      {editing ? (
        <TaxonomyDeleteDialog
          item={editing}
          onDeleted={() => onOpenChange(false)}
          onOpenChange={setDeleteOpen}
          open={deleteOpen}
        />
      ) : null}
    </>
  );
}
