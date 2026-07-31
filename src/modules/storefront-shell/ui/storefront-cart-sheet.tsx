"use client";

import { FavouriteIcon, ShoppingBag03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { subscribeToStorefrontCheckoutResume } from "@/modules/checkout/client/recovery-events";
import {
  StorefrontCheckoutSheet,
  type StorefrontCheckoutLine,
} from "@/modules/checkout/ui/storefront/checkout-sheet";
import { money, type Product } from "@/modules/products/ui/storefront/catalogue-data";
import { getProductDefaultImage } from "@/modules/products/ui/storefront/product-media";
import {
  useStorefrontCart,
  useStorefrontCatalogueData,
  useStorefrontOverlay,
  useStorefrontSavedItems,
} from "@/modules/storefront-shell/client/storefront-runtime";

type CartSheetView = "bag" | "checkout";

export function StorefrontCartSheet({ className }: { className?: string }) {
  const router = useRouter();
  const { products } = useStorefrontCatalogueData();
  const cart = useStorefrontCart();
  const saved = useStorefrontSavedItems();
  const overlay = useStorefrontOverlay();
  const [view, setView] = useState<CartSheetView>("bag");

  const cartViews = useMemo(() => {
    const byLineKey = new Map<string, (typeof cart.views)[number]>();
    for (const item of cart.views) {
      if (!item?.lineKey || !item.product?.id) continue;
      byLineKey.set(item.lineKey, item);
    }
    return Array.from(byLineKey.values());
  }, [cart.views]);

  const recommendations = useMemo(() => {
    const cartProductIds = new Set(cartViews.map((item) => item.product.id));
    return uniqueProducts(products)
      .filter((product) => product.status === "available" && !cartProductIds.has(product.id))
      .slice(0, 3);
  }, [cartViews, products]);

  const checkoutLines = useMemo<StorefrontCheckoutLine[]>(
    () =>
      cartViews.map((item) => ({
        productId: item.product.id,
        variantId: item.variantId,
        quantity: item.lineQty,
      })),
    [cartViews],
  );

  useEffect(() => {
    if (overlay.openId !== "cartDrawer" || cartViews.length === 0) setView("bag");
  }, [cartViews.length, overlay.openId]);

  useEffect(() => subscribeToStorefrontCheckoutResume(() => setView("checkout")), []);

  function completeCheckout(orderNumber: string): void {
    setView("bag");
    overlay.close();
    router.push(`/order-confirmation?order=${encodeURIComponent(orderNumber)}`);
  }

  return (
    <Sheet
      onOpenChange={(open) => {
        if (open) {
          overlay.open("cartDrawer");
          return;
        }
        setView("bag");
        overlay.close();
      }}
      open={overlay.openId === "cartDrawer"}
    >
      <SheetTrigger
        render={
          <Button
            aria-label={`Bag, ${cart.count} ${cart.count === 1 ? "item" : "items"}`}
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
        className="lst-storefront flex w-full flex-col border-l border-[var(--line)] bg-[var(--bone)] p-0 text-[var(--ink)] sm:max-w-[680px]"
        side="right"
      >
        {view === "checkout" && cartViews.length > 0 ? (
          <StorefrontCheckoutSheet
            active={overlay.openId === "cartDrawer"}
            lines={checkoutLines}
            onBack={() => setView("bag")}
            onPaid={completeCheckout}
            subtotalMinor={Math.round(cart.subtotal * 100)}
          />
        ) : (
          <>
            <SheetHeader className="border-b border-[var(--line)] px-5 py-5 text-left sm:px-8 sm:py-7">
              <div className="flex flex-wrap items-end justify-between gap-4 pr-8">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--muted)]">
                    Your private edit
                  </p>
                  <div className="mt-2 flex items-baseline gap-3">
                    <SheetTitle className="font-serif text-4xl font-normal italic text-[var(--ink)] sm:text-5xl">
                      The bag
                    </SheetTitle>
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] tabular-nums">
                      {cart.count} {cart.count === 1 ? "piece" : "pieces"}
                    </span>
                  </div>
                </div>
                {cartViews.length > 0 ? (
                  <span className="rounded-full border border-[var(--line)] bg-[var(--sage-light)] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em]">
                    Nationwide delivery
                  </span>
                ) : null}
              </div>
              <SheetDescription className="max-w-lg text-xs leading-5 text-[var(--muted)]">
                Review the pieces in your edit, then choose any saved Nigerian address during
                checkout. Your bag remains available if the payment window is closed.
              </SheetDescription>
            </SheetHeader>

            {cartViews.length === 0 ? (
              <EmptyBag
                onShop={() => {
                  overlay.close();
                  router.push("/products");
                }}
              />
            ) : (
              <>
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-4 px-5 py-5 sm:px-8 sm:py-7">
                    {cartViews.map(
                      ({ product, lineKey, lineQty, variantLabel, unitPriceNaira }, index) => {
                        const defaultImage = getProductDefaultImage(product);
                        return (
                          <article
                            className="group overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-[var(--bone-2)]"
                            key={`cart-line:${lineKey}`}
                          >
                            <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[148px_minmax(0,1fr)] sm:gap-6 sm:p-5">
                              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.1rem] bg-[var(--linen)]">
                                {defaultImage ? (
                                  <CloudImage
                                    alt={product.name}
                                    className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                                    fill
                                    sizes="(max-width: 640px) 112px, 148px"
                                    src={defaultImage}
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
                                <span className="absolute left-2 top-2 rounded-full bg-[var(--bone)]/90 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] backdrop-blur">
                                  Edit {String(index + 1).padStart(2, "0")}
                                </span>
                              </div>
                              <div className="flex min-w-0 flex-col">
                                <div>
                                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
                                    Grade {product.condition} · {variantLabel ?? product.size}
                                  </p>
                                  <h3 className="mt-2 font-serif text-xl leading-tight sm:text-2xl">
                                    {product.name}
                                  </h3>
                                  <p className="mt-2 text-sm text-[var(--muted)]">
                                    {product.brand} · {product.material}
                                  </p>
                                </div>
                                <div className="mt-auto pt-5">
                                  <div className="flex flex-wrap items-end justify-between gap-3">
                                    <div>
                                      <p className="font-serif text-2xl">
                                        {money(unitPriceNaira * lineQty)}
                                      </p>
                                      {lineQty > 1 ? (
                                        <p className="mt-1 text-[10px] text-[var(--muted)]">
                                          {money(unitPriceNaira)} each
                                        </p>
                                      ) : null}
                                    </div>
                                    {product.inventory === "one-of-one" ? (
                                      <span className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                                        One-of-one
                                      </span>
                                    ) : (
                                      <div className="inline-flex h-9 items-center rounded-full border border-[var(--line)] bg-[var(--bone)]">
                                        <Button
                                          aria-label={`Decrease ${product.name} quantity`}
                                          className="rounded-full"
                                          onClick={() => cart.changeQuantity(lineKey, -1)}
                                          size="icon-sm"
                                          type="button"
                                          variant="ghost"
                                        >
                                          −
                                        </Button>
                                        <span className="min-w-7 text-center font-mono text-xs">
                                          {lineQty}
                                        </span>
                                        <Button
                                          aria-label={`Increase ${product.name} quantity`}
                                          className="rounded-full"
                                          onClick={() => cart.changeQuantity(lineKey, 1)}
                                          size="icon-sm"
                                          type="button"
                                          variant="ghost"
                                        >
                                          +
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3">
                                    <Button
                                      className="gap-1.5 rounded-full"
                                      onClick={() => {
                                        if (!saved.idSet.has(product.id)) void saved.toggleProduct(product.id);
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
                                      Move to saved
                                    </Button>
                                    <Button
                                      className="rounded-full"
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
                            </div>
                          </article>
                        );
                      },
                    )}
                  </div>

                  {recommendations.length > 0 ? (
                    <section className="border-t border-[var(--line)] bg-[var(--bone-2)] px-5 py-7 sm:px-8">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
                            Complete the edit
                          </p>
                          <h3 className="mt-1 font-serif text-2xl">Consider these pieces</h3>
                        </div>
                        <span className="text-[10px] text-[var(--muted)]">Tap to add</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {recommendations.map((product) => {
                          const defaultImage = getProductDefaultImage(product);
                          return (
                            <Button
                              className="group h-auto min-w-0 justify-start rounded-[1.2rem] border border-[var(--line)] bg-[var(--bone)] p-2 text-left hover:bg-[var(--bone)]"
                              key={`cart-recommendation:${product.id}`}
                              onClick={() => cart.addProduct(product.id)}
                              type="button"
                              variant="ghost"
                            >
                              <span className="min-w-0">
                                <span className="relative block aspect-[4/5] overflow-hidden rounded-[0.9rem] bg-[var(--linen)]">
                                  {defaultImage ? (
                                    <CloudImage
                                      alt={product.name}
                                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                      fill
                                      sizes="(max-width: 640px) 42vw, 180px"
                                      src={defaultImage}
                                    />
                                  ) : (
                                    <span className="grid size-full place-items-center px-2 text-center text-[10px] text-[var(--muted)]">
                                      Image unavailable
                                    </span>
                                  )}
                                </span>
                                <span className="mt-2 block truncate font-serif text-sm">
                                  {product.name}
                                </span>
                                <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
                                  Add · {money(product.price)}
                                </span>
                              </span>
                            </Button>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}
                </div>

                <div className="border-t border-[var(--line)] bg-[var(--bone)] px-5 py-5 sm:px-8 sm:py-6">
                  <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--bone-2)] p-5 shadow-[0_18px_60px_rgba(24,23,20,0.05)]">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
                          The edit
                        </p>
                        <span className="mt-1 block text-xs text-[var(--muted)]">
                          Delivery is quoted from your chosen address
                        </span>
                      </div>
                      <span className="font-serif text-3xl sm:text-4xl">{money(cart.subtotal)}</span>
                    </div>
                    <Button
                      className="mt-5 h-12 w-full rounded-full text-sm uppercase tracking-[0.12em]"
                      onClick={() => setView("checkout")}
                      type="button"
                    >
                      Arrange delivery & payment
                    </Button>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--muted)]">
                      <span>Nationwide</span>
                      <span>Secure payment</span>
                      <span>Verified order</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EmptyBag({ onShop }: { onShop: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex size-20 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--sage-light)] text-[var(--ink)]">
        <HugeiconsIcon aria-hidden="true" icon={ShoppingBag03Icon} size={30} strokeWidth={1.5} />
      </span>
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--muted)]">
          Your private edit
        </p>
        <p className="mt-2 font-serif text-3xl italic">The bag is waiting</p>
        <p className="mx-auto mt-2 max-w-[340px] text-sm leading-relaxed text-[var(--muted)]">
          Choose a piece from the archive and build an edit that feels entirely yours.
        </p>
      </div>
      <Button className="min-w-48 rounded-full" onClick={onShop} size="lg" type="button">
        Enter the archive
      </Button>
    </div>
  );
}

function uniqueProducts(products: readonly Product[]): Product[] {
  const byId = new Map<string, Product>();
  for (const product of products) {
    if (!product?.id) continue;
    byId.set(product.id, product);
  }
  return Array.from(byId.values());
}
