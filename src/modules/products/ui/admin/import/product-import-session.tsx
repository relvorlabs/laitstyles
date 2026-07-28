"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
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
import { createProductEditorValues } from "@/modules/products/editor-defaults";
import type { ProductEditorActionSuccess } from "@/lib/admin/shared/types";
import {
  hasUnsavedProductImportChanges,
  productImportSessionReducer,
} from "@/modules/products/import/session";
import type { ProductImportSessionState } from "@/modules/products/import/types";
import { ProductImportQueue } from "@/modules/products/ui/admin/import/product-import-queue";
import { ProductEditorSurface } from "@/modules/products/ui/admin/product-editor/product-editor-dialog";

export function ProductImportSession({
  initialState,
  onRequestClose,
  registerCloseRequest,
}: {
  initialState: ProductImportSessionState;
  onRequestClose: () => void;
  registerCloseRequest?: (handler: () => void) => void;
}) {
  const [state, dispatch] = useReducer(productImportSessionReducer, initialState);
  const [discardOpen, setDiscardOpen] = useState(false);
  const selectedChild = state.children.find((child) => child.importId === state.selectedImportId);

  const requestClose = useCallback(() => {
    if (hasUnsavedProductImportChanges(state)) {
      setDiscardOpen(true);
      return;
    }
    onRequestClose();
  }, [onRequestClose, state]);

  useEffect(() => {
    registerCloseRequest?.(requestClose);
  }, [registerCloseRequest, requestClose]);

  const updateSelectedValues = useCallback(
    (values: NonNullable<typeof selectedChild>["values"]) => {
      if (!selectedChild) return;
      dispatch({ type: "update-values", importId: selectedChild.importId, values });
    },
    [selectedChild],
  );

  const setSelectedStatus = useCallback(
    (status: "saving" | "saved" | "failed") => {
      if (!selectedChild) return;
      dispatch({ type: "set-status", importId: selectedChild.importId, status });
    },
    [selectedChild],
  );

  const handleCompleted = useCallback(
    (result: ProductEditorActionSuccess) => {
      if (!selectedChild) return;
      dispatch({
        type: "update-values",
        importId: selectedChild.importId,
        values: createProductEditorValues(result.product),
      });
      dispatch({
        type: "set-persisted",
        importId: selectedChild.importId,
        persistence:
          result.intent === "draft"
            ? "draft"
            : result.intent === "schedule"
              ? "scheduled"
              : "published",
      });
    },
    [selectedChild],
  );

  if (!selectedChild) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">This import did not contain any products.</p>
      </div>
    );
  }

  return (
    <>
      <ProductEditorSurface
        closeAfterSave={false}
        initialValues={selectedChild.values}
        key={selectedChild.importId}
        manageDiscardConfirmation={false}
        onCompleted={handleCompleted}
        onPersistenceStatusChange={setSelectedStatus}
        onRequestClose={requestClose}
        onValuesChange={updateSelectedValues}
        queueNavigation={
          <ProductImportQueue
            ignoredAssetCount={state.ignoredAssetCount}
            items={state.children}
            onNext={() => dispatch({ type: "select-next" })}
            onPrevious={() => dispatch({ type: "select-previous" })}
            onSelect={(importId) => dispatch({ type: "select", importId })}
            selectedImportId={state.selectedImportId}
          />
        }
      />

      <AlertDialog onOpenChange={setDiscardOpen} open={discardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard imported product drafts?</AlertDialogTitle>
            <AlertDialogDescription>
              Unsaved imported products exist only in this browser. Saved products will remain in
              the catalogue, but the remaining drafts will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep reviewing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDiscardOpen(false);
                onRequestClose();
              }}
              variant="destructive"
            >
              Discard import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
