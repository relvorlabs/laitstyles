"use client";

import { FavouriteIcon, ShoppingBag03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { type ReactNode, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { StorefrontCheckoutLine } from "@/modules/checkout/ui/storefront/checkout-sheet";
import { StorefrontCheckoutDialog } from "@/modules/checkout/ui/storefront/storefront-checkout-dialog";
import { useStorefrontCatalogue } from "@/modules/products/client/storefront-catalogue";
import { money } from "@/modules/products/ui/storefront/catalogue-data";
import { getProductDefaultImage } from "@/modules/products/ui/storefront/product-media";
import {
  useStorefrontCart,
  useStorefrontOverlay,
  useStorefrontSavedItems,
} from "@/modules/storefront-shell/client/storefront-runtime";

export function StorefrontCartSheet({ className }: { className?: string }) {
  const router = useRouter();
  const catalogue = useStorefrontCatalogue();
  const cart = useStorefrontCart();
  const saved = useStorefrontSavedItems();
  const overlay = useStorefrontOverlay();

  const cartViews = useMemo(() => {
    const byLineKey = new Map<string, (typeof cart.views)[number]>();
    for (const item of cart.views) {
      if (!item?.lineKey || !item.product?.id) continue;
      byLineKey.set(item.lineKey, item);
    }
    return [...byLineKey.values()];
  }, [cart.views]);

  const checkoutLines = useMemo<StorefrontCheckoutLine[]>(
    () =>
      cartViews.map((item) => ({
        productId: item.product.id,
        variantId: item.variantId,
        quantity: item.lineQty,
      })),
    [cartViews],
  );

  const catalogueUnavailable =
    catalogue.isError || catalogue.data?.availability === "temporarily-unavailable";
  const cartLoading = !catalogueUnavailable && (catalogue.isPending || !cart.hydrated);

  function closeAndShop(): void {
    overlay.close();
    router.push("/products");
  }

  function openCheckout(): void {
    if (cartViews.length === 0 || catalogueUnavailable) return;
    overlay.close();
    window.setTimeout(() => overlay.open("checkoutDialog"), 220);
  }

  function completeCheckout(orderNumber: string): void {
    overlay.close();
    router.push(`/order-confirmation?order=${encodeURIComponent(orderNumber)}`);
  }

  return (
    <>
      <Sheet
        onOpenChange={(open) => {
          if (open) overlay.open("cartDrawer");
          else if (overlay.openId === "cartDrawer") overlay.close();
        }}
        open={overlay.openId === "cartDrawer"}
      >
        <SheetTrigger
          render={
            <Button
              aria-label={`Cart, ${cart.count} ${cart.count === 1 ? "item" : "items"}`}
              className={cn("relative flex items-center justify-center", className)}
              size="icon"
              variant="ghost"
            />
          }
        >
          <HugeiconsIcon aria-hidden="true" icon={ShoppingBag03Icon} size={20} strokeWidth={1.6} />
          {cart.count > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--ink)] px-1 font-mono text-[10px] text-[var(--bone)]">
              {cart.count}
            </span>
          ) : null}
        </SheetTrigger>

        <SheetContent
          className="lst-storefront flex w-full flex-col border-l border-[var(--line)] bg-[var(--bone)] p-0 text-[var(--ink)] sm:max-w-[520px]"
          side="right"
        >
          <SheetHeader className="border-b border-[var(--line)] px-5 py-5 pr-14 text-left sm:px-6">
            <div className="flex items-baseline gap-2">
              <SheetTitle className="font-serif text-3xl font-normal text-[var(--ink)]">
                Your cart
              </SheetTitle>
              <span className="font-mono text-xs text-[var(--muted)] tabular-nums">
                {cart.count}
              </span>
            </div>
            <SheetDescription className="text-xs leading-5 text-[var(--muted)]">
              Review your items before choosing delivery and payment.
            </SheetDescription>
          </SheetHeader>

          {catalogueUnavailable ? (
            <CartMessage
              action={
                <Button onClick={() => void catalogue.refetch()} type="button" variant="outline">
                  Retry
                </Button>
              }
              detail="Your cart has not been cleared. We could not load the product details needed to display it."
              title="Cart details unavailable"
            />
          ) : cartLoading ? (
            <CartMessage
              detail="Your cart will appear as soon as the catalogue is ready."
              title="Loading your cart"
            />
          ) : cartViews.length === 0 ? (
            <EmptyCart onShop={closeAndShop} />
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-5 sm:px-6">
                {cartViews.map(
                  ({ product, lineKey, lineQty, variantLabel, colour, size, unitPriceNaira }) => {
                    const image = getProductDefaultImage(product);
                    const optionLabel = [variantLabel ?? size ?? product.size, colour]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <article
                        className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 border-b border-[var(--line)] py-5"
                        key={lineKey}
                      >
                        <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-[var(--linen)]">
                          {image ? (
                            <CloudImage
                              alt={product.name}
                              className="object-cover"
                              fill
                              sizes="96px"
                              src={image}
                            />
                          ) : (
                            <span
                              aria-label={`${product.name} image unavailable`}
                              className="grid size-full place-items-center px-2 text-center text-[10px] text-[var(--muted)]"
                              role="img"
                            >
                              Image unavailable
                            </span>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-col">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate font-serif text-lg leading-tight">
                                {product.name}
                              </h3>
                              <p className="mt-1 text-xs text-[var(--muted)]">
                                {optionLabel || "Standard option"}
                              </p>
                            </div>
                            <p className="shrink-0 text-sm font-semibold tabular-nums">
                              {money(unitPriceNaira * lineQty)}
                            </p>
                          </div>

                          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                            {product.inventory === "one-of-one" ? (
                              <span className="text-xs text-[var(--muted)]">One-of-one</span>
                            ) : (
                              <div className="inline-flex items-center rounded-md border border-[var(--line)]">
                                <Button
                                  aria-label={`Decrease ${product.name} quantity`}
                                  className="min-h-10 min-w-10"
                                  onClick={() => cart.changeQuantity(lineKey, -1)}
                                  size="icon-sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  −
                                </Button>
                                <span className="min-w-8 text-center font-mono text-xs">
                                  {lineQty}
                                </span>
                                <Button
                                  aria-label={`Increase ${product.name} quantity`}
                                  className="min-h-10 min-w-10"
                                  onClick={() => cart.changeQuantity(lineKey, 1)}
                                  size="icon-sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  +
                                </Button>
                              </div>
                            )}

                            <div className="flex items-center gap-1">
                              <Button
                                className="gap-1.5"
                                onClick={() => {
                                  if (!saved.idSet.has(product.id))
                                    void saved.toggleProduct(product.id);
                                  cart.removeLine(lineKey);
                                }}
                                size="sm"
                                type="button"
                                variant="ghost"
                              >
                                <HugeiconsIcon
                                  aria-hidden="true"
                                  icon={FavouriteIcon}
                                  size={14}
                                  strokeWidth={1.6}
                                />
                                Save for later
                              </Button>
                              <Button
                                onClick={() => cart.removeLine(lineKey)}
                                size="sm"
                                type="button"
                                variant="ghost"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>

              <SheetFooter className="border-t border-[var(--line)] bg-[var(--bone)] px-5 py-5 sm:px-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Subtotal</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Delivery calculated at checkout
                    </p>
                  </div>
                  <p className="font-serif text-2xl tabular-nums">{money(cart.subtotal)}</p>
                </div>
                <Button className="min-h-11 w-full" onClick={openCheckout} type="button">
                  Checkout · {money(cart.subtotal)}
                </Button>
                <Button
                  className="min-h-11 w-full"
                  onClick={closeAndShop}
                  type="button"
                  variant="ghost"
                >
                  Continue shopping
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <StorefrontCheckoutDialog
        lines={checkoutLines}
        onPaid={completeCheckout}
        subtotalMinor={Math.round(cart.subtotal * 100)}
      />
    </>
  );
}

function CartMessage({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-[var(--sage-light)]">
        <HugeiconsIcon aria-hidden="true" icon={ShoppingBag03Icon} size={24} strokeWidth={1.6} />
      </span>
      <div>
        <p className="font-serif text-2xl">{title}</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{detail}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyCart({ onShop }: { onShop: () => void }) {
  return (
    <CartMessage
      action={
        <Button className="min-h-11" onClick={onShop} type="button">
          Continue shopping
        </Button>
      }
      detail="Add a piece and it will stay here while you shop."
      title="Your cart is empty"
    />
  );
}
