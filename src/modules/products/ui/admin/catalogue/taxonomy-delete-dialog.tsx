"use client";

import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteProductTaxonomy } from "@/modules/products/client/hooks";
import type { ProductTaxonomyItem } from "@/modules/products/types";

export function TaxonomyDeleteDialog({
  item,
  open,
  onOpenChange,
  onDeleted,
}: {
  item: ProductTaxonomyItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const mutation = useDeleteProductTaxonomy();
  const error = mutation.data && !mutation.data.ok ? mutation.data.error.message : null;
  async function remove() {
    const result = await mutation.mutateAsync(item.id);
    if (result.ok) {
      onOpenChange(false);
      onDeleted();
    }
  }
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            Delete {item.name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {item.productCount
              ? `This ${item.kind} is connected to ${item.productCount} product${item.productCount === 1 ? "" : "s"}. Reassign them before deletion.`
              : "This catalogue group can be deleted because no products use it."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p
            aria-live="polite"
            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Keep {item.kind}</AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending || item.productCount > 0}
            onClick={remove}
            variant="destructive"
          >
            {mutation.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
