"use client";

import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
  useArchiveProduct,
  useDeleteProduct,
  useRestoreProduct,
} from "@/lib/admin/inventory/inventory-mutations";
import type { ProductLifecycle } from "@/lib/admin/shared/types";

type PendingAction = "archive" | "restore" | "delete" | null;

export function InventoryProductLifecycleActions({
  productId,
  productName,
  lifecycle,
  onDeleted,
}: {
  productId: string;
  productName: string;
  lifecycle: ProductLifecycle;
  onDeleted: () => void;
}) {
  const archiveProductMutation = useArchiveProduct();
  const restoreProductMutation = useRestoreProduct();
  const deleteProductMutation = useDeleteProduct();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function runAction() {
    if (!pendingAction) return;
    const result =
      pendingAction === "archive"
        ? await archiveProductMutation.mutateAsync(productId)
        : pendingAction === "restore"
          ? await restoreProductMutation.mutateAsync(productId)
          : await deleteProductMutation.mutateAsync(productId);

    setPendingAction(null);
    if (!result.ok) {
      setFeedback(result.error.message);
      return;
    }
    setFeedback(result.value.message);
    if (result.value.deleted) onDeleted();
  }

  const destructive = pendingAction === "delete";
  const actionLabel =
    pendingAction === "archive"
      ? "Archive product"
      : pendingAction === "restore"
        ? "Restore product"
        : "Delete permanently";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {lifecycle === "archived" ? (
          <Button
            onClick={() => {
              setFeedback(null);
              setPendingAction("restore");
            }}
            type="button"
            variant="outline"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Restore product
          </Button>
        ) : (
          <Button
            onClick={() => {
              setFeedback(null);
              setPendingAction("archive");
            }}
            type="button"
            variant="outline"
          >
            <Archive aria-hidden="true" className="size-4" />
            Archive product
          </Button>
        )}
        <Button
          onClick={() => {
            setFeedback(null);
            setPendingAction("delete");
          }}
          type="button"
          variant="destructive"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Delete permanently
        </Button>
      </div>

      {feedback ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-border bg-surface-interactive px-3 py-2 text-sm leading-5 text-surface-interactive-foreground"
        >
          {feedback}
        </p>
      ) : null}

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        open={Boolean(pendingAction)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "archive"
                ? `${productName} will be unpublished and removed from every selling channel, while stock and sales history remain available.`
                : pendingAction === "restore"
                  ? `${productName} will return as an unpublished active product so you can review it before selling again.`
                  : `Permanent deletion is allowed only when ${productName} has no orders, holds, stock movements, reviews, returns or customer saves. Otherwise the operation will be blocked and you should archive it.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={runAction}
              variant={destructive ? "destructive" : "default"}
            >
              {actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
