"use client";

import Image from "next/image";
import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { inventoryLabel, money } from "../catalogue-data";
import { IconClose, IconHeart } from "../storefront-icons";
import { useStorefront } from "../storefront-provider";

export function QuickViewOverlay() {
  const storefront = useStorefront();
  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) storefront.closeAll();
  };
  const active = storefront.activeProduct;

  return (
    <div
      id="quickView"
      className={`overlay modal-wrap${storefront.openId === "quickView" ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Product quick view"
      onClick={overlayBackdrop}
    >
      <section className="modal">
        <div className="modal-head">
          <span className="eyebrow">Product quick view</span>
          <Button
            type="button"
            aria-label="Close quick view"
            onClick={storefront.closeAll}
            size="icon-lg"
            variant="ghost"
          >
            <IconClose />
          </Button>
        </div>
        {active ? (
          <div id="quickBody">
            <div className="mt-[22px] grid grid-cols-[1.05fr_0.95fr] gap-[34px] max-[860px]:grid-cols-1 max-[600px]:gap-[18px]">
              <div>
                <div className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-[var(--linen)]">
                  <Image
                    src={active.images[storefront.imageIndex]}
                    alt={`${active.name}, front view`}
                    fill
                    sizes="(min-width: 861px) 50vw, 100vw"
                    className="object-cover [filter:saturate(0.74)]"
                  />
                  <Button
                    size="lg"
                    type="button"
                    aria-label="Open image viewer"
                    className="absolute inset-0"
                    onClick={() => storefront.openViewer(storefront.imageIndex)}
                    variant="ghost"
                  />
                </div>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {active.images.map((src, index) => (
                    <Button
                      key={src}
                      className="relative aspect-square h-auto overflow-hidden p-0"
                      type="button"
                      aria-label={`View image ${index + 1}`}
                      aria-pressed={index === storefront.imageIndex}
                      onClick={() => storefront.setImageIndex(index)}
                      variant={index === storefront.imageIndex ? "secondary" : "outline"}
                    >
                      <Image src={src} alt="" fill sizes="96px" className="object-cover" />
                    </Button>
                  ))}
                </div>
              </div>
              <div className="py-1.5">
                <div className="flex flex-wrap gap-[7px]">
                  <span
                    className={`badge${active.inventory === "one-of-one" ? " badge-solid" : ""}`}
                  >
                    {inventoryLabel(active.inventory)}
                  </span>
                  <Button
                    size="lg"
                    variant={active.condition === "A+" ? "secondary" : "outline"}
                    type="button"
                    onClick={() => storefront.open("conditionModal")}
                  >
                    Grade {active.condition}
                  </Button>
                  <Button
                    size="lg"
                    type="button"
                    onClick={() => storefront.open("authModal")}
                    variant="ghost"
                  >
                    {active.brandStatus}
                  </Button>
                </div>
                <h2
                  id="quickTitle"
                  className="mt-3.5 text-[clamp(2rem,4vw,4rem)] font-[560] leading-[0.95] tracking-[-0.04em] max-[600px]:text-[2.35rem]"
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
                    <div key={label} className="rounded-[4px] border border-[var(--line)] p-[13px]">
                      <span className="block text-[0.68rem] text-[var(--muted)]">{label}</span>
                      <strong className="mt-[3px] block text-[0.87rem]">{value}</strong>
                    </div>
                  ))}
                </div>
                {active.inventory === "variant" && active.variants ? (
                  <div className="mt-[23px]">
                    <div className="mb-2.5 flex justify-between gap-5 text-[0.78rem]">
                      <strong>Select size</strong>
                      <Button
                        size="lg"
                        type="button"
                        onClick={() => storefront.open("measureModal")}
                        variant="link"
                      >
                        Size guide
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {active.variants.map((variant, index) => {
                        const disabled =
                          index === (active.variants?.length ?? 0) - 1 && active.stock < 5;
                        const selected = storefront.selectedVariant === variant;
                        return (
                          <Button
                            size="lg"
                            key={variant}
                            className="min-w-12 disabled:line-through"
                            type="button"
                            disabled={disabled}
                            aria-pressed={selected}
                            onClick={() => {
                              storefront.setSelectedVariant(variant);
                              storefront.setQuickError("");
                            }}
                            variant={selected ? "default" : "outline"}
                          >
                            {variant}
                          </Button>
                        );
                      })}
                    </div>
                    <p
                      id="quickError"
                      className="mt-[7px] min-h-[19px] text-[0.75rem] text-[var(--error)]"
                    >
                      {storefront.quickError}
                    </p>
                  </div>
                ) : (
                  <div className="mt-[23px]">
                    <div className="mb-2.5 flex justify-between gap-5 text-[0.78rem]">
                      <strong>Fit details</strong>
                      <Button
                        size="lg"
                        type="button"
                        onClick={() => storefront.open("measureModal")}
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
                    type="button"
                    onClick={() => storefront.openViewer(4)}
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
                    type="button"
                    disabled={active.status !== "available"}
                    onClick={() => storefront.addFromQuick(active.id)}
                  >
                    {active.status === "available" ? "Add to bag" : active.status}
                  </Button>
                  <Button
                    type="button"
                    aria-label={`${storefront.saved.has(active.id) ? "Remove" : "Save"} ${active.name}`}
                    onClick={() => storefront.toggleSaved(active.id)}
                    size="icon-lg"
                    variant={storefront.saved.has(active.id) ? "secondary" : "outline"}
                  >
                    <IconHeart filled={storefront.saved.has(active.id)} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
