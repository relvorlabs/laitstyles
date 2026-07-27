"use client";

import { type MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import { useOverlayLifecycle } from "@/hooks/use-overlay-lifecycle";
import { koboToNaira } from "@/lib/money";
import {
  inventoryLabel,
  money,
  productById,
} from "@/modules/products/ui/storefront/catalogue-data";
import {
  openImageViewer,
  subscribeQuickView,
  subscribeTransientOverlayClose,
} from "@/modules/storefront-shell/client/storefront-overlay-events";
import {
  useStorefrontCart,
  useStorefrontCatalogueData,
  useStorefrontOverlay,
  useStorefrontRecent,
  useStorefrontSavedItems,
} from "@/modules/storefront-shell/client/storefront-runtime";
import { IconClose, IconHeart } from "@/modules/storefront-shell/ui/storefront-icons";

export function QuickViewOverlay() {
  const catalogue = useStorefrontCatalogueData();
  const cart = useStorefrontCart();
  const saved = useStorefrontSavedItems();
  const overlay = useStorefrontOverlay();
  const recent = useStorefrontRecent();
  const [productId, setProductId] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const close = useCallback(() => setProductId(null), []);

  useEffect(
    () =>
      subscribeQuickView(({ productId: nextProductId }) => {
        setProductId(nextProductId);
        setImageIndex(0);
        setSelectedVariantId(null);
        setError("");
        recent.add(nextProductId);
      }),
    [recent.add],
  );

  useEffect(() => subscribeTransientOverlayClose(close), [close]);

  const active = useMemo(
    () => (productId ? productById(catalogue.products, productId) : undefined),
    [catalogue.products, productId],
  );
  const variants = active ? (catalogue.variantOptionsByProductId[active.id] ?? []) : [];

  useOverlayLifecycle({ open: Boolean(active), onEscape: close, focusId: "quickView" });

  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) close();
  };

  if (!active) return null;

  const addFromQuick = () => {
    if (active.inventory === "variant") {
      const variant = variants.find((option) => option.id === selectedVariantId);
      if (!variant || variant.availability.available < 1) {
        setError("Choose an available option before adding this piece.");
        return;
      }
      const added = cart.addProduct(
        active.id,
        {
          variantId: variant.id,
          variantLabel: variant.label,
          colour: variant.colour,
          size: variant.size,
          unitPriceNaira: koboToNaira(variant.price ?? active.price * 100),
          maxQuantity: variant.availability.available,
        },
        1,
      );
      if (!added) return;
    } else if (!cart.addProduct(active.id)) {
      return;
    }
    overlay.open("cartDrawer");
  };

  return (
    <div
      aria-label="Product quick view"
      aria-modal="true"
      className="overlay modal-wrap open"
      id="quickView"
      onClick={overlayBackdrop}
      role="dialog"
    >
      <section className="modal">
        <div className="modal-head">
          <span className="eyebrow">Product quick view</span>
          <Button
            aria-label="Close quick view"
            onClick={close}
            size="icon-lg"
            type="button"
            variant="ghost"
          >
            <IconClose />
          </Button>
        </div>
        <div id="quickBody">
          <div className="mt-[22px] grid grid-cols-[1.05fr_0.95fr] gap-[34px] max-[860px]:grid-cols-1 max-[600px]:gap-[18px]">
            <div>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-[var(--linen)]">
                <CloudImage
                  alt={`${active.name}, front view`}
                  className="object-cover [filter:saturate(0.74)]"
                  fill
                  sizes="(min-width: 861px) 50vw, 100vw"
                  src={active.images[imageIndex]}
                />
                <Button
                  aria-label="Open image viewer"
                  className="absolute inset-0"
                  onClick={() => openImageViewer({ productId: active.id, index: imageIndex })}
                  size="lg"
                  type="button"
                  variant="ghost"
                />
              </div>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {active.images.map((src, index) => (
                  <Button
                    aria-label={`View image ${index + 1}`}
                    aria-pressed={index === imageIndex}
                    className="relative aspect-square h-auto overflow-hidden p-0"
                    key={src}
                    onClick={() => setImageIndex(index)}
                    type="button"
                    variant={index === imageIndex ? "secondary" : "outline"}
                  >
                    <CloudImage alt="" className="object-cover" fill sizes="96px" src={src} />
                  </Button>
                ))}
              </div>
            </div>
            <div className="py-1.5">
              <div className="flex flex-wrap gap-[7px]">
                <span className={`badge${active.inventory === "one-of-one" ? " badge-solid" : ""}`}>
                  {inventoryLabel(active.inventory)}
                </span>
                <Button
                  onClick={() => overlay.open("conditionModal")}
                  size="lg"
                  type="button"
                  variant={active.condition === "A+" ? "secondary" : "outline"}
                >
                  Grade {active.condition}
                </Button>
                <Button
                  onClick={() => overlay.open("authModal")}
                  size="lg"
                  type="button"
                  variant="ghost"
                >
                  {active.brandStatus}
                </Button>
              </div>
              <h2
                className="mt-3.5 text-[clamp(2rem,4vw,4rem)] font-[560] leading-[0.95] tracking-[-0.04em] max-[600px]:text-[2.35rem]"
                id="quickTitle"
              >
                {active.name}
              </h2>
              <p className="mt-2.5 text-[0.85rem] text-[var(--muted)]">
                {active.brand} · {active.category} · {active.style}
              </p>
              <p className="price mt-[22px] text-[1.2rem]">{money(active.price)}</p>
              <p className="mt-5 max-w-[31rem] text-[var(--ink-soft)]">
                {active.inventory === "one-of-one"
                  ? "You are buying the exact piece shown in these photographs."
                  : active.inventory === "variant"
                    ? "Choose your available size before adding this piece to the bag."
                    : "Several matching units of this product are currently available."}
              </p>
              <div className="mt-[22px] grid grid-cols-2 gap-2">
                {(
                  [
                    ["Tagged size", active.size],
                    ["Recommended fit", active.fit],
                    ["Condition", `Grade ${active.condition}`],
                    ["Material", active.material],
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <div className="rounded-[4px] border border-[var(--line)] p-[13px]" key={label}>
                    <span className="block text-[0.68rem] text-[var(--muted)]">{label}</span>
                    <strong className="mt-[3px] block text-[0.87rem]">{value}</strong>
                  </div>
                ))}
              </div>
              {active.inventory === "variant" && variants.length > 0 ? (
                <div className="mt-[23px]">
                  <div className="mb-2.5 flex justify-between gap-5 text-[0.78rem]">
                    <strong>Select size</strong>
                    <Button
                      onClick={() => overlay.open("measureModal")}
                      size="lg"
                      type="button"
                      variant="link"
                    >
                      Size guide
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((variant) => {
                      const disabled = variant.availability.available < 1;
                      const selected = selectedVariantId === variant.id;
                      return (
                        <Button
                          aria-pressed={selected}
                          className="min-w-12 disabled:line-through"
                          disabled={disabled}
                          key={variant.id}
                          onClick={() => {
                            setSelectedVariantId(variant.id);
                            setError("");
                          }}
                          size="lg"
                          type="button"
                          variant={selected ? "default" : "outline"}
                        >
                          {variant.label}
                        </Button>
                      );
                    })}
                  </div>
                  <p
                    className="mt-[7px] min-h-[19px] text-[0.75rem] text-[var(--error)]"
                    id="quickError"
                  >
                    {error}
                  </p>
                </div>
              ) : (
                <div className="mt-[23px]">
                  <div className="mb-2.5 flex justify-between gap-5 text-[0.78rem]">
                    <strong>Fit details</strong>
                    <Button
                      onClick={() => overlay.open("measureModal")}
                      size="lg"
                      type="button"
                      variant="link"
                    >
                      View measurements
                    </Button>
                  </div>
                </div>
              )}
              {active.flaw !== "None" ? (
                <Button
                  className="mt-[18px] h-auto w-full justify-start text-left"
                  onClick={() => openImageViewer({ productId: active.id, index: 4 })}
                  type="button"
                  variant="ghost"
                >
                  <span>
                    <strong>Disclosed detail:</strong> {active.flaw}. <u>View detail image</u>
                  </span>
                </Button>
              ) : null}
              <div className="mt-6 grid grid-cols-[1fr_auto] gap-2 max-[600px]:grid-cols-[1fr_48px]">
                <Button
                  className="w-full"
                  disabled={active.status !== "available"}
                  onClick={addFromQuick}
                  type="button"
                >
                  {active.status === "available" ? "Add to bag" : active.status}
                </Button>
                <Button
                  aria-label={`${saved.idSet.has(active.id) ? "Remove" : "Save"} ${active.name}`}
                  onClick={() => saved.toggleProduct(active.id)}
                  size="icon-lg"
                  type="button"
                  variant={saved.idSet.has(active.id) ? "secondary" : "outline"}
                >
                  <IconHeart filled={saved.idSet.has(active.id)} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
