"use client";

import Image from "next/image";
import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { money } from "../catalogue-data";
import { IconClose, IconHeart } from "../storefront-icons";
import { useStorefront } from "../storefront-provider";

export function SavedItemsDrawer() {
  const storefront = useStorefront();
  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) storefront.closeAll();
  };

  return (
    <div
      id="savedDrawer"
      className={`overlay${storefront.openId === "savedDrawer" ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Saved items"
      onClick={overlayBackdrop}
    >
      <aside className="drawer">
        <div className="drawer-head">
          <h2>Saved items</h2>
          <Button
            type="button"
            aria-label="Close saved items"
            onClick={storefront.closeAll}
            size="icon-lg"
            variant="ghost"
          >
            <IconClose />
          </Button>
        </div>
        <div id="savedList" className="mt-5 grid gap-3">
          {storefront.savedList.length ? (
            storefront.savedList.map((product) => (
              <article
                key={product.id}
                className="grid grid-cols-[94px_1fr] gap-[13px] border-b border-[var(--line)] pb-[14px]"
              >
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  width={188}
                  height={236}
                  sizes="94px"
                  className="h-[118px] w-[94px] rounded-[4px] object-cover"
                />
                <div>
                  <div className="flex justify-between gap-3">
                    <h3 className="m-0 text-[0.9rem] leading-[1.25]">{product.name}</h3>
                    <Button
                      type="button"
                      aria-label={`Remove ${product.name}`}
                      onClick={() => storefront.toggleSaved(product.id)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      ×
                    </Button>
                  </div>
                  <p className="mt-[5px] text-[0.72rem] text-[var(--muted)]">
                    Size {product.size} · Grade {product.condition} · {product.status}
                  </p>
                  <p className="price mt-2 text-[0.78rem] text-[var(--ink)]">
                    {money(product.price)}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Button
                      size="lg"
                      type="button"
                      onClick={() => storefront.openQuick(product.id)}
                      variant="link"
                    >
                      View details
                    </Button>
                    {product.status === "available" ? (
                      <Button
                        size="lg"
                        type="button"
                        onClick={() =>
                          product.inventory === "variant"
                            ? storefront.openQuick(product.id)
                            : storefront.addToCart(product.id)
                        }
                        variant="outline"
                      >
                        {product.inventory === "variant" ? "Choose size" : "Add to bag"}
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        type="button"
                        onClick={() => storefront.applyShop({ collection: "one-of-one" })}
                        variant="link"
                      >
                        Find similar
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="px-2.5 py-[66px] text-center">
              <div className="mx-auto mb-5 grid size-[78px] place-items-center rounded-full border border-[var(--line)]">
                <IconHeart className="[stroke-width:1.25]" style={{ width: 28, height: 28 }} />
              </div>
              <h3 className="m-0 text-[1.5rem]">No saved pieces yet</h3>
              <p className="mx-auto mb-[22px] mt-2.5 max-w-[20rem] text-[var(--muted)]">
                Tap the heart on any product to keep it close.
              </p>
              <Button type="button" onClick={storefront.closeAll}>
                Browse products
              </Button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
