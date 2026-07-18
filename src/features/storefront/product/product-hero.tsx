"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import type { Product } from "@/features/storefront/shared/catalogue-data";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";
import { MobileBuyBar } from "./mobile-buy-bar";
import type { ProductDetailPresentation } from "./product-detail-presentation";
import { ProductGallery } from "./product-gallery";
import { ProductPurchasePanel } from "./product-purchase-panel";

export function ProductHero({
  product,
  presentation,
  children,
}: {
  product: Product;
  presentation: ProductDetailPresentation;
  children?: ReactNode;
}) {
  const storefront = useStorefront();
  const [showBar, setShowBar] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const purchaseAnchorRef = useRef<HTMLDivElement>(null);
  const pendingTargetRef = useRef<number | null>(null);

  useEffect(() => {
    storefront.setSelectedVariant(null);
    storefront.setQuickError("");
  }, [storefront.setQuickError, storefront.setSelectedVariant]);

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
    const line = storefront.cart.find((candidate) => candidate.id === product.id);
    if (!line) return;
    const delta = target - line.qty;
    pendingTargetRef.current = null;
    if (delta !== 0) storefront.changeQty(product.id, delta);
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

    const existing = storefront.cart.find((line) => line.id === product.id);
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
          <ProductGallery product={product} />
          {children}
        </div>
        <ProductPurchasePanel
          product={product}
          presentation={presentation}
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
