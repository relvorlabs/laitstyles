"use client";

import { useCallback, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { prepareProductImport } from "@/modules/products/import/prepare";
import type {
  ProductImportFileIssue,
  ProductImportSessionState,
} from "@/modules/products/import/types";
import { ProductImportSession } from "@/modules/products/ui/admin/import/product-import-session";

export function ProductImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const closeRequest = useRef<() => void>(() => {});
  const [session, setSession] = useState<ProductImportSessionState | null>(null);
  const [issue, setIssue] = useState<ProductImportFileIssue | null>(null);

  const closeImmediately = useCallback(() => {
    setSession(null);
    setIssue(null);
    onOpenChange(false);
  }, [onOpenChange]);

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const prepared = prepareProductImport({ fileName: file.name, size: file.size, text });
    if (!prepared.ok) {
      setIssue(prepared.error);
      return;
    }
    if (!prepared.value.children.length) {
      setIssue({
        code: "invalid-import",
        message: "The import file does not contain any products.",
      });
      return;
    }
    setIssue(null);
    setSession({
      source: file.name.toLocaleLowerCase("en-NG").endsWith(".csv") ? "csv" : "json",
      children: prepared.value.children,
      selectedImportId: prepared.value.children[0]?.importId ?? null,
      selectedImportIds: [],
      ignoredAssetCount: prepared.value.ignoredAssetCount,
    });
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          if (session) closeRequest.current();
          else closeImmediately();
        }
      }}
      open={open}
    >
      <DialogContent className="flex max-h-[min(92dvh,900px)] flex-col gap-0 overflow-hidden p-0 sm:w-[min(96vw,1340px)] sm:max-w-[1340px]">
        {session ? (
          <ProductImportSession
            initialState={session}
            key={session.children[0]?.importId}
            onRequestClose={closeImmediately}
            registerCloseRequest={(handler) => {
              closeRequest.current = handler;
            }}
            onSessionEmpty={() => {
              setSession(null);
              setIssue(null);
            }}
          />
        ) : (
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Product import
              </p>
              <DialogTitle className="font-serif text-[30px] font-medium">
                Review product drafts
              </DialogTitle>
              <DialogDescription className="max-w-xl leading-6">
                Choose a CSV or JSON file to prepare browser-only product drafts. Nothing is
                uploaded or saved until you save each active product.
              </DialogDescription>
            </DialogHeader>
            <label
              className="mt-8 grid max-w-xl gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-5 text-sm font-medium"
              htmlFor="product-import-file"
            >
              Choose a CSV or JSON import file
              <Input
                accept=".csv,.json,text/csv,application/json"
                aria-describedby="product-import-file-help"
                id="product-import-file"
                onChange={(event) => void handleFileChange(event.currentTarget.files?.[0])}
                type="file"
              />
              <span
                className="text-xs font-normal leading-5 text-muted-foreground"
                id="product-import-file-help"
              >
                Up to 1,000 products or 10 MB. Images and media are intentionally ignored.
              </span>
            </label>
            {issue ? (
              <Alert className="mt-5 max-w-xl" variant="destructive">
                <AlertTitle>Import file could not be prepared</AlertTitle>
                <AlertDescription>{issue.message}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
