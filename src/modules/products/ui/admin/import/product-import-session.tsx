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
import type { ProductEditorActionSuccess } from "@/lib/admin/shared/types";
import { createProductEditorValues } from "@/modules/products/editor-defaults";
import { filterDuplicateProductImportChildren, prepareProductImport } from "@/modules/products/import/prepare";
import {
  editedProductImportCount,
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
  onSessionEmpty,
}: {
  initialState: ProductImportSessionState;
  onRequestClose: () => void;
  registerCloseRequest?: (handler: () => void) => void;
  onSessionEmpty?: () => void;
}) {
  const [state, dispatch] = useReducer(productImportSessionReducer, initialState);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [appendIssue, setAppendIssue] = useState<string | null>(null);
  const [appendNotice, setAppendNotice] = useState<string | null>(null);
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

  const handleAddFile = useCallback(async (file: File) => {
    const prepared = prepareProductImport({ fileName: file.name, size: file.size, text: await file.text() });
    if (!prepared.ok) { setAppendIssue(prepared.error.message); setAppendNotice(null); return; }
    if (!prepared.value.children.length) { setAppendIssue("The import file does not contain any products."); setAppendNotice(null); return; }
    const result = filterDuplicateProductImportChildren(state.children, prepared.value.children);
    if (!result.accepted.length) {
      setAppendIssue(null);
      setAppendNotice(`${result.skippedCount} duplicate${result.skippedCount === 1 ? "" : "s"} skipped.`);
      return;
    }
    dispatch({ type: "append", children: result.accepted, ignoredAssetCount: prepared.value.ignoredAssetCount });
    setAppendIssue(null);
    setAppendNotice(`${result.accepted.length} product${result.accepted.length === 1 ? "" : "s"} appended${result.skippedCount ? `; ${result.skippedCount} duplicate${result.skippedCount === 1 ? "" : "s"} skipped` : ""}.`);
  }, [state.children]);

  const handleDelete = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setAppendIssue(null); setAppendNotice(null);
    const count = editedProductImportCount(state, ids);
    if (count) { setDeleteIds(ids); return; }
    dispatch({ type: "remove", importIds: ids });
    if (state.children.length === ids.filter((id) => state.children.some((c) => c.importId === id)).length) onSessionEmpty?.();
  }, [onSessionEmpty, state]);

  const confirmDelete = useCallback(() => {
    if (!deleteIds) return;
    dispatch({ type: "remove", importIds: deleteIds });
    setAppendIssue(null); setAppendNotice(null);
    if (state.children.length === deleteIds.filter((id) => state.children.some((c) => c.importId === id)).length) onSessionEmpty?.();
    setDeleteIds(null);
  }, [deleteIds, onSessionEmpty, state]);

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
        navigationMode="unrestricted"
        queueNavigation={
          <ProductImportQueue
            ignoredAssetCount={state.ignoredAssetCount}
            items={state.children}
            onSelect={(importId) => dispatch({ type: "select", importId })}
            selectedImportId={state.selectedImportId}
            selectedImportIds={state.selectedImportIds}
            onAddFile={handleAddFile}
            onToggleSelection={(importId) => dispatch({ type: "toggle-selection", importId })}
            onSelectAll={() => dispatch({ type: "select-all" })}
            onClearSelection={() => dispatch({ type: "clear-selection" })}
            onDelete={handleDelete}
            appendIssue={appendIssue}
            appendNotice={appendNotice}
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
      <AlertDialog open={Boolean(deleteIds)} onOpenChange={(open) => { if (!open) setDeleteIds(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard edited import drafts?</AlertDialogTitle><AlertDialogDescription>{editedProductImportCount(state, deleteIds ?? []) === 1 ? "1 edited draft will be lost. Saved catalogue products will remain." : `${editedProductImportCount(state, deleteIds ?? [])} edited drafts will be lost. Saved catalogue products will remain.`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep reviewing</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={confirmDelete}>Delete imports</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
