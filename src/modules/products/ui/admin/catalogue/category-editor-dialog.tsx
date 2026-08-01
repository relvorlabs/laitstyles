"use client";

import { Delete02Icon, ImageAdd01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import { CloudUploadButton } from "@/components/ui/cloud-upload-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { UploadedCloudinaryAsset } from "@/lib/assets/client/cloudinary-upload";
import {
  useCreateProductTaxonomy,
  useUpdateProductTaxonomy,
} from "@/modules/products/client/hooks";
import type { ProductTaxonomyItem } from "@/modules/products/types";
import { AdminIcon } from "@/modules/products/ui/admin/admin-icon";
import { TaxonomyDeleteDialog } from "@/modules/products/ui/admin/catalogue/taxonomy-delete-dialog";

type UploadStatus = "opening" | "uploading" | "completed" | "cancelled" | "failed";

const uploadStatusMessage: Record<UploadStatus, string> = {
  opening: "Opening category image uploader.",
  uploading: "Uploading category image.",
  completed: "Category image upload completed. Save the category to keep it.",
  cancelled: "Category image upload cancelled.",
  failed: "Category image upload failed. Try again.",
};

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
  const [submitted, setSubmitted] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const create = useCreateProductTaxonomy();
  const update = useUpdateProductTaxonomy();
  useEffect(() => {
    setName(editing?.name ?? "");
    setImageUrl(editing?.imageUrl ?? null);
    setFeedback(null);
    setSubmitted(false);
    setUploadStatus(null);
  }, [editing]);
  function uploaded(image: UploadedCloudinaryAsset) {
    setImageUrl(image.url);
    setFeedback(null);
    return true;
  }
  async function save() {
    setSubmitted(true);
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
    const created = await create.mutateAsync({
      kind: "category",
      name,
      imageUrl,
      position: itemCount,
    });
    if (!created.ok) return setFeedback(created.error.message);
    onOpenChange(false);
  }
  const pending = create.isPending || update.isPending;
  const uploadActive = uploadStatus === "opening" || uploadStatus === "uploading";
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
                <AdminIcon icon={ImageAdd01Icon} size={40} />
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
            <Field data-invalid={submitted && !name.trim()}>
              <FieldLabel htmlFor="category-name">Category name</FieldLabel>
              <Input
                aria-invalid={submitted && !name.trim()}
                id="category-name"
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Archive outerwear"
                value={name}
              />
              {submitted && !name.trim() ? <FieldError>Enter a category name.</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel>Category image</FieldLabel>
              <FieldDescription>
                The preview remains local until you choose Save category.
              </FieldDescription>
              <div className="flex flex-wrap gap-2">
                <CloudUploadButton
                  folder="laitstyles/categories"
                  label={imageUrl ? "Replace image" : "Upload image"}
                  multiple={false}
                  onAsset={uploaded}
                  onError={(issue) => setFeedback(issue.message)}
                  onStatusChange={(status) => {
                    if (status !== "idle") setUploadStatus(status);
                  }}
                  variant="outline"
                />
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
            {feedback || uploadStatus ? (
              <p
                aria-live="polite"
                className="rounded-xl border border-border bg-surface-interactive p-3 text-sm"
              >
                {feedback ?? (uploadStatus ? uploadStatusMessage[uploadStatus] : null)}
              </p>
            ) : null}
            <DialogFooter className="gap-2 sm:justify-between">
              {editing ? (
                <Button onClick={() => setDeleteOpen(true)} type="button" variant="ghost">
                  <AdminIcon icon={Delete02Icon} size={18} />
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button onClick={() => onOpenChange(false)} type="button" variant="ghost">
                  Cancel
                </Button>
                <Button disabled={pending || uploadActive} onClick={save} type="button">
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
