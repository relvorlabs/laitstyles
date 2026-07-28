"use client";

import { ArrowRightLeft, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  useCreateProductTaxonomy,
  useUpdateProductTaxonomy,
} from "@/modules/products/client/hooks";
import type { AdminProduct, ProductTaxonomyItem } from "@/modules/products/types";
import { TaxonomyDeleteDialog } from "@/modules/products/ui/admin/catalogue/taxonomy-delete-dialog";

export function CollectionEditorDialog({
  item,
  itemCount,
  onOpenChange,
  products,
}: {
  item: ProductTaxonomyItem | "new" | null;
  itemCount: number;
  onOpenChange: (open: boolean) => void;
  products: AdminProduct[];
}) {
  const editing = item && item !== "new" ? item : null;
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const create = useCreateProductTaxonomy();
  const update = useUpdateProductTaxonomy();
  useEffect(() => {
    setName(editing?.name ?? "");
    setSelected(
      editing
        ? products
            .filter((product) => product.collection === editing.name)
            .map((product) => product.id)
        : [],
    );
    setQuery("");
    setFeedback(null);
  }, [editing, products]);
  const visible = useMemo(
    () =>
      products.filter((product) =>
        product.name.toLocaleLowerCase("en-NG").includes(query.toLocaleLowerCase("en-NG")),
      ),
    [products, query],
  );
  const moved = products.filter(
    (product) =>
      selected.includes(product.id) && product.collection && product.collection !== editing?.name,
  );
  function toggle(id: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...new Set([...current, id])] : current.filter((entry) => entry !== id),
    );
  }
  async function save() {
    if (!name.trim()) return;
    let target = editing;
    if (!target) {
      const created = await create.mutateAsync({ kind: "collection", name });
      if (!created.ok) return setFeedback(created.error.message);
      target = created.value.item ?? null;
    }
    if (!target)
      return setFeedback("The collection was created but could not be opened for membership.");
    const result = await update.mutateAsync({
      taxonomyId: target.id,
      input: {
        kind: "collection",
        name,
        position: editing?.position ?? itemCount,
        productIds: selected,
      },
    });
    if (!result.ok) return setFeedback(result.error.message);
    onOpenChange(false);
  }
  const pending = create.isPending || update.isPending;
  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={Boolean(item)}>
        <DialogContent className="flex max-h-[92dvh] flex-col overflow-hidden p-0 sm:max-w-3xl">
          <div className="space-y-5 border-b border-border p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="font-serif text-3xl">
                {editing ? "Edit collection story" : "Create collection story"}
              </DialogTitle>
              <DialogDescription>
                Choose products for this editorial grouping. Its cover collage is always derived
                from product covers—there is no separate collection upload.
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="collection-name">Collection name</FieldLabel>
              <Input
                id="collection-name"
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. After-hours tailoring"
                value={name}
              />
            </Field>
            {moved.length ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <p className="flex items-center gap-2 font-semibold">
                  <ArrowRightLeft className="size-4" />
                  Products will move from another collection
                </p>
                <p className="mt-1 text-muted-foreground">
                  {moved.map((product) => `${product.name} (${product.collection})`).join(", ")}
                </p>
              </div>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search products"
                className="pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search catalogue products"
                value={query}
              />
            </div>
            <div className="space-y-2">
              {visible.map((product) => {
                const checked = selected.includes(product.id);
                return (
                  <label
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 hover:bg-accent"
                    htmlFor={`collection-product-${product.id}`}
                    key={product.id}
                  >
                    <Checkbox
                      checked={checked}
                      id={`collection-product-${product.id}`}
                      onCheckedChange={(value) => toggle(product.id, value === true)}
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">{product.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {product.collection
                          ? `Currently in ${product.collection}`
                          : "Not currently in a collection"}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          {feedback ? (
            <p
              aria-live="polite"
              className="mx-6 rounded-xl border border-border bg-surface-interactive p-3 text-sm sm:mx-8"
            >
              {feedback}
            </p>
          ) : null}
          <DialogFooter className="border-t border-border p-6 sm:justify-between sm:px-8">
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
                {pending ? "Saving…" : `Save ${selected.length} products`}
              </Button>
            </div>
          </DialogFooter>
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
