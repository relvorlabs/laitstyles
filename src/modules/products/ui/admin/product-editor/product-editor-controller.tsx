"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { createContext, type ReactNode, use, useCallback, useMemo, useState } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ProductEditorActionSuccess } from "@/lib/admin/shared/types";
import { AdminIcon } from "@/modules/products/ui/admin/admin-icon";
import { ProductImportDialog } from "@/modules/products/ui/admin/import/product-import-dialog";
import { ProductEditorDialog } from "@/modules/products/ui/admin/product-editor/product-editor-dialog";

type ProductEditorControllerValue = {
  openNewProduct: () => void;
  openExistingProduct: (productId: string) => void;
  openProductImport: () => void;
};

const ProductEditorControllerContext = createContext<ProductEditorControllerValue | null>(null);

export function ProductEditorControllerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [result, setResult] = useState<ProductEditorActionSuccess | null>(null);

  const openNewProduct = useCallback(() => {
    setProductId(null);
    setOpen(true);
    setImportOpen(false);
    setResult(null);
  }, []);

  const openExistingProduct = useCallback((nextProductId: string) => {
    setProductId(nextProductId);
    setOpen(true);
    setImportOpen(false);
    setResult(null);
  }, []);
  const openProductImport = useCallback(() => {
    setProductId(null);
    setOpen(false);
    setImportOpen(true);
    setResult(null);
  }, []);

  const value = useMemo(
    () => ({ openNewProduct, openExistingProduct, openProductImport }),
    [openNewProduct, openExistingProduct, openProductImport],
  );

  return (
    <ProductEditorControllerContext value={value}>
      {children}
      <ProductEditorDialog
        onCompleted={setResult}
        onOpenChange={setOpen}
        open={open}
        productId={productId}
      />
      <ProductImportDialog onOpenChange={setImportOpen} open={importOpen} />
      {result ? (
        <Alert
          aria-live="polite"
          className="fixed bottom-4 right-4 z-[80] w-[min(92vw,420px)] border-success/35 bg-card text-card-foreground shadow-xl"
        >
          <AdminIcon className="text-success" icon={CheckmarkCircle02Icon} size={18} />
          <AlertTitle>{result.message}</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            The product is persisted and connected catalogue views have been invalidated.
          </AlertDescription>
          <AlertAction>
            <Button onClick={() => setResult(null)} size="sm" type="button" variant="ghost">
              Dismiss
            </Button>
          </AlertAction>
        </Alert>
      ) : null}
    </ProductEditorControllerContext>
  );
}

export function useProductEditorController() {
  const context = use(ProductEditorControllerContext);
  if (!context) {
    throw new Error(
      "useProductEditorController must be used inside ProductEditorControllerProvider",
    );
  }
  return context;
}
