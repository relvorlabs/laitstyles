"use client";

import Image from "next/image";
import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { inventoryLabel, money } from "../catalogue-data";
import { IconClose } from "../storefront-icons";
import { useStorefront } from "../storefront-provider";

export function LegacyCartDrawer() {
  const storefront = useStorefront();
  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) storefront.closeAll();
  };

  return (
    <div
      id="legacyCartDrawer"
      className="overlay"
      hidden
      role="dialog"
      aria-modal="true"
      aria-label="Shopping bag"
      onClick={overlayBackdrop}
    >
      <aside className="drawer">
        <div className="drawer-head">
          <h2>Shopping bag</h2>
          <Button
            type="button"
            aria-label="Close shopping bag"
            onClick={storefront.closeAll}
            size="icon-lg"
            variant="ghost"
          >
            <IconClose />
          </Button>
        </div>
        <div id="cartList" className="mt-5 grid gap-3">
          {storefront.cartLines.length ? (
            storefront.cartLines.map(({ product, lineQty, size }) => (
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
                      onClick={() => storefront.removeFromCart(product.id)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      ×
                    </Button>
                  </div>
                  <p className="mt-[5px] text-[0.72rem] text-[var(--muted)]">
                    {size ? `Size ${size} · ` : ""}
                    {inventoryLabel(product.inventory)} · Grade {product.condition}
                  </p>
                  <p className="price mt-2 text-[0.78rem] text-[var(--ink)]">
                    {money(product.price)}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    {product.inventory === "one-of-one" ? (
                      <span className="inventory-note">Quantity 1</span>
                    ) : (
                      <div className="inline-grid grid-cols-[34px_38px_34px] overflow-hidden rounded-[4px] border border-[var(--line)]">
                        <Button
                          size="lg"
                          type="button"
                          aria-label={`Decrease ${product.name} quantity`}
                          onClick={() => storefront.changeQty(product.id, -1)}
                          variant="ghost"
                        >
                          −
                        </Button>
                        <span className="grid place-items-center border-x border-[var(--line)] text-[0.78rem]">
                          {lineQty}
                        </span>
                        <Button
                          size="lg"
                          type="button"
                          aria-label={`Increase ${product.name} quantity`}
                          onClick={() => storefront.changeQty(product.id, 1)}
                          variant="ghost"
                        >
                          +
                        </Button>
                      </div>
                    )}
                    <Button
                      size="lg"
                      type="button"
                      onClick={() => storefront.toggleSaved(product.id)}
                      variant="link"
                    >
                      Move to saved
                    </Button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="px-2.5 py-[66px] text-center">
              <div className="mx-auto mb-5 grid size-[78px] place-items-center rounded-full border border-[var(--line)]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="h-7 w-7 [stroke-width:1.25]"
                  aria-hidden="true"
                >
                  <path d="M6 7h12l1 13H5L6 7Z" />
                  <path d="M9 9V6a3 3 0 0 1 6 0v3" />
                </svg>
              </div>
              <h3 className="m-0 text-[1.5rem]">Your bag is empty</h3>
              <p className="mx-auto mb-[22px] mt-2.5 max-w-[20rem] text-[var(--muted)]">
                Start with the latest drop or choose a one-of-one piece.
              </p>
              <Button type="button" onClick={storefront.closeAll}>
                Continue shopping
              </Button>
            </div>
          )}
        </div>
        <div
          id="cartSummary"
          className="sticky bottom-[-24px] -mx-6 -mb-6 mt-7 border-t border-[var(--line)] bg-[var(--bone)] px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-5 max-[600px]:-mx-[18px] max-[600px]:-mb-[18px] max-[600px]:px-[18px]"
        >
          <div className="flex justify-between gap-5">
            <span>Subtotal</span>
            <strong id="subtotal" className="price">
              {money(storefront.subtotal)}
            </strong>
          </div>
          <p className="mb-4 mt-2 text-[0.75rem] text-[var(--muted)]">
            Delivery is calculated from your state and location.
          </p>
          <Button
            id="checkoutButton"
            className="w-full"
            type="button"
            disabled={!storefront.cartLines.length}
            onClick={() =>
              storefront.showToast("Checkout is represented as the next flow in this prototype.")
            }
          >
            Continue to checkout
          </Button>
        </div>
      </aside>
    </div>
  );
}
