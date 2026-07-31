"use client";

import { useEffect } from "react";
import { useStorefrontUiStore } from "@/stores/storefront-ui.store";

export function ProductRecentViewTracker({ productId }: { productId: string }) {
  const addRecent = useStorefrontUiStore((state) => state.addRecent);

  useEffect(() => {
    addRecent(productId);
  }, [addRecent, productId]);

  return null;
}
