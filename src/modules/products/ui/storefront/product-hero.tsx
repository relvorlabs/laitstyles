"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import type { ProductDetail as CanonicalProductDetail } from "@/lib/storefront/types";
import {
  useStorefrontCart,
  useStorefrontOverlay,
} from "@/modules/storefront-shell/client/storefront-runtime";
import type { Product } from "./catalogue-data";
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
  const cart = useStorefrontCart();
  const overlay = useStorefrontOverlay();
  const selection = useProductSelection(detail);
  const [showBar, setShowBar] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectionError, setSelectionError] = useState("");
  const purchaseAnchorRef = useRef<HTMLDivElement>(null);
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

  const isVariant = product.inventory === "variant";
  const available = product.status === "available";
  const canAdd = available && (!isVariant || Boolean(selection.selectedVariant));

  const addSelectedQuantity = () => {
    if (isVariant && !selection.selectedVariant) {
      setSelectionError("Choose an available size before adding this piece.");
      return;
    }

    setSelectionError("");
    const variant = selection.selectedVariant;
    const added = cart.addProduct(
      product.id,
      variant
        ? {
            variantId: variant.id,
            variantLabel: variant.label,
            colour: variant.colour,
            size: variant.size,
            unitPriceNaira: selection.displayPrice,
            maxQuantity: selection.availableQuantity,
          }
        : null,
      quantity,
    );
    if (added) overlay.open("cartDrawer");
  };

  return (
    <>
      <section className="mx-auto grid max-w-[1500px] gap-8 px-4 pb-14 sm:px-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(390px,0.82fr)] lg:gap-12 lg:px-8">
        <div className="min-w-0">
          <ProductGallery colourLabel={colourLabel} media={selection.media} product={product} />
          {children}
        </div>
        <ProductPurchasePanel
          anchorRef={purchaseAnchorRef}
          canAdd={canAdd}
          error={selectionError}
          onAdd={addSelectedQuantity}
          onBuyNow={addSelectedQuantity}
          onClearError={() => setSelectionError("")}
          onQuantityChange={setQuantity}
          presentation={presentation}
          product={product}
          quantity={quantity}
          selection={selection}
        />
      </section>
      <MobileBuyBar
        canAdd={canAdd}
        onAdd={addSelectedQuantity}
        product={product}
        quantity={quantity}
        visible={showBar}
      />
    </>
  );
}
