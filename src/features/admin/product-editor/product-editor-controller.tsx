"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { createContext, type ReactNode, use, useCallback, useMemo, useState } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ProductEditorDialog } from "@/features/admin/product-editor/product-editor-dialog";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import type { ProductEditorActionSuccess } from "@/lib/admin/shared/types";

type ProductEditorControllerValue = {
  openNewProduct: () => void;
  openExistingProduct: (productId: string) => void;
};

const ProductEditorControllerContext = createContext<ProductEditorControllerValue | null>(null);

export function ProductEditorControllerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [result, setResult] = useState<ProductEditorActionSuccess | null>(null);

  const openNewProduct = useCallback(() => {
    setProductId(null);
    setOpen(true);
    setResult(null);
  }, []);

  const openExistingProduct = useCallback((nextProductId: string) => {
    setProductId(nextProductId);
    setOpen(true);
    setResult(null);
  }, []);

  const value = useMemo(
    () => ({ openNewProduct, openExistingProduct }),
    [openNewProduct, openExistingProduct],
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
      {result ? (
        <Alert
          aria-live="polite"
          className="fixed bottom-4 right-4 z-[80] w-[min(92vw,420px)] border-success/35 bg-card text-card-foreground shadow-xl"
        >
          <AdminIcon className="text-success" icon={CheckmarkCircle02Icon} size={18} />
          <AlertTitle>{result.message}</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Catalogue views now use this session-only product record. Refreshing resets the
            prototype.
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
