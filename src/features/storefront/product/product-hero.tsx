"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import type { Product } from "@/features/storefront/shared/catalogue-data";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";
import type { ProductDetail as CanonicalProductDetail } from "@/lib/storefront/types";
import { MobileBuyBar } from "./mobile-buy-bar";
import type { ProductDetailPresentation } from "./product-detail-presentation";
import { ProductGallery } from "./product-gallery";
import { ProductPurchasePanel } from "./product-purchase-panel";
import { useProductSelection } from "./use-product-selection";

export function ProductHero({
  product,
  detail,
  presentation,
  children,
}: {
  product: Product;
  detail: CanonicalProductDetail;
  presentation: ProductDetailPresentation;
  children?: ReactNode;
}) {
  const storefront = useStorefront();
  const selection = useProductSelection(detail);
  const [showBar, setShowBar] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const purchaseAnchorRef = useRef<HTMLDivElement>(null);
  const pendingTargetRef = useRef<number | null>(null);

  // Mirror the reducer's resolved size into the storefront provider so the
  // existing cart guardrails / variant selection stay in sync with the panel.
  useEffect(() => {
    storefront.setSelectedVariant(selection.selectedSize);
    storefront.setQuickError("");
  }, [selection.selectedSize, storefront.setQuickError, storefront.setSelectedVariant]);

  const colourLabel = selection.selectedColour ?? product.colour ?? "";

  useEffect(() => {
    const element = purchaseAnchorRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting), {
      rootMargin: "0px 0px -8px 0px",
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const target = pendingTargetRef.current;
    if (target === null) return;
    const line = storefront.cart.find((candidate) => candidate.productId === product.id);
    if (!line) return;
    const delta = target - line.qty;
    pendingTargetRef.current = null;
    if (delta !== 0) storefront.changeQty(line.key, delta);
    storefront.open("cartDrawer");
  }, [product.id, storefront.cart, storefront.changeQty, storefront.open]);

  const isVariant = product.inventory === "variant";
  const available = product.status === "available";
  const canAdd = available && (!isVariant || Boolean(storefront.selectedVariant));

  const addSelectedQuantity = () => {
    if (isVariant && !storefront.selectedVariant) {
      storefront.setQuickError("Choose an available size before adding this piece.");
      return;
    }

    const existing = storefront.cart.find((line) => line.productId === product.id);
    if (product.inventory === "one-of-one" && existing) {
      storefront.addToCart(product.id);
      storefront.open("cartDrawer");
      return;
    }

    const initialQuantity = existing?.qty ?? 0;
    const target = Math.min(product.stock, initialQuantity + quantity);
    if (quantity > 1) pendingTargetRef.current = target;
    storefront.addToCart(product.id);
    if (quantity === 1) storefront.open("cartDrawer");
  };

  return (
    <>
      <section className="mx-auto grid max-w-[1500px] gap-8 px-4 pb-14 sm:px-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(390px,0.82fr)] lg:gap-12 lg:px-8">
        <div className="min-w-0">
          <ProductGallery product={product} media={selection.media} colourLabel={colourLabel} />
          {children}
        </div>
        <ProductPurchasePanel
          product={product}
          presentation={presentation}
          selection={selection}
          anchorRef={purchaseAnchorRef}
          canAdd={canAdd}
          quantity={quantity}
          onQuantityChange={setQuantity}
          onAdd={addSelectedQuantity}
          onBuyNow={addSelectedQuantity}
        />
      </section>
      <MobileBuyBar
        product={product}
        visible={showBar}
        canAdd={canAdd}
        quantity={quantity}
        onAdd={addSelectedQuantity}
      />
    </>
  );
}
