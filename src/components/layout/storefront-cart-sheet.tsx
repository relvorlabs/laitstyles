"use client";

import { FavouriteIcon, ShoppingBag03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { money, products } from "@/features/storefront/home-lab/data";
import { useStorefront } from "@/features/storefront/home-lab/storefront-context";
import { cn } from "@/lib/utils";

export function StorefrontCartSheet({ className }: { className?: string }) {
  const storefront = useStorefront();
  const recommendations = products
    .filter(
      (product) =>
        product.status === "available" && !storefront.cart.some((line) => line.id === product.id),
    )
    .slice(0, 2);

  return (
    <Sheet
      open={storefront.openId === "cartDrawer"}
      onOpenChange={(open) => (open ? storefront.open("cartDrawer") : storefront.closeAll())}
    >
      <SheetTrigger
        render={
          <Button
            aria-label={`Bag, ${storefront.cartCount} ${storefront.cartCount === 1 ? "item" : "items"}`}
            className={cn(
              "relative flex size-11 items-center justify-center rounded-full text-[var(--ink)] transition-colors hover:bg-[var(--sage-light)]",
              className,
            )}
            size="icon"
            variant="ghost"
          />
        }
      >
        <HugeiconsIcon aria-hidden="true" icon={ShoppingBag03Icon} size={20} strokeWidth={1.6} />
        {storefront.cartCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--ink)] px-1 font-mono text-[10px] text-[var(--bone)]">
            {storefront.cartCount}
          </span>
        ) : null}
      </SheetTrigger>

      <SheetContent
        /* `lst-lab` scopes the portalled sheet so the prototype's var aliases
           (--bone/--ink/--line/--muted/--linen/--bone-2/--sage-light) resolve — Base UI
           portals to <body>, outside the storefront's .lst-lab root; without it the panel
           renders transparent/unstyled. */
        className="lst-lab flex w-full flex-col border-l border-[var(--line)] bg-[var(--bone)] p-0 text-[var(--ink)] sm:max-w-[470px]"
        side="right"
      >
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5 text-left">
          <div className="flex items-baseline gap-2">
            <SheetTitle className="font-serif text-3xl font-normal italic text-[var(--ink)]">
              Your bag
            </SheetTitle>
            <span className="font-mono text-xs text-[var(--muted)] tabular-nums">
              {storefront.cartCount}
            </span>
          </div>
          <SheetDescription className="text-xs text-[var(--muted)]">
            Guest selections stay with this browsing session. Sign in when you are ready to keep
            them with your account.
          </SheetDescription>
        </SheetHeader>

        {storefront.cartLines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-[var(--sage-light)] text-[var(--ink)]">
              <HugeiconsIcon
                aria-hidden="true"
                icon={ShoppingBag03Icon}
                size={26}
                strokeWidth={1.6}
              />
            </span>
            <div>
              <p className="font-serif text-2xl">Your bag is waiting</p>
              <p className="mt-1 max-w-[300px] text-sm leading-relaxed text-[var(--muted)]">
                Add a piece from the archive and it will stay here as you move through the shop.
              </p>
            </div>
            <Link
              className={cn(buttonVariants({ size: "lg" }), "rounded-full px-7")}
              href="/shop"
              onClick={storefront.closeAll}
            >
              Shop the archive
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {storefront.cartLines.map(({ product, lineQty, variant }) => (
                <article
                  className="grid grid-cols-[88px_1fr] gap-4 border-b border-[var(--line)] py-5"
                  key={product.id}
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-[var(--linen)]">
                    <Image
                      alt={product.name}
                      className="object-cover"
                      fill
                      sizes="88px"
                      src={product.images[0]}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                      Grade {product.condition} · {variant ?? product.size}
                    </p>
                    <h3 className="mt-1 truncate font-serif text-lg">{product.name}</h3>
                    <p className="mt-1 text-sm font-semibold">{money(product.price)}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      {product.inventory === "one-of-one" ? (
                        <span className="text-xs text-[var(--muted)]">One-of-one</span>
                      ) : (
                        <div className="inline-flex h-8 items-center rounded-full border border-[var(--line)]">
                          <Button
                            aria-label={`Decrease ${product.name} quantity`}
                            className="grid size-8 place-items-center rounded-full hover:bg-[var(--sage-light)]"
                            onClick={() => storefront.changeQty(product.id, -1)}
                            size="icon"
                            variant="ghost"
                          >
                            −
                          </Button>
                          <span className="min-w-6 text-center font-mono text-xs">{lineQty}</span>
                          <Button
                            aria-label={`Increase ${product.name} quantity`}
                            className="grid size-8 place-items-center rounded-full hover:bg-[var(--sage-light)]"
                            onClick={() => storefront.changeQty(product.id, 1)}
                            size="icon"
                            variant="ghost"
                          >
                            +
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs">
                        <button
                          className="inline-flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--ink)]"
                          onClick={() => {
                            if (!storefront.saved.has(product.id))
                              storefront.toggleSaved(product.id);
                            storefront.removeFromCart(product.id);
                          }}
                          type="button"
                        >
                          <HugeiconsIcon icon={FavouriteIcon} size={14} strokeWidth={1.6} />
                          Save
                        </button>
                        <button
                          className="text-[var(--muted)] underline underline-offset-4 hover:text-[var(--ink)]"
                          onClick={() => storefront.removeFromCart(product.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              {recommendations.length > 0 ? (
                <section className="py-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    Complete the edit
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {recommendations.map((product) => (
                      <button
                        className="group text-left"
                        key={product.id}
                        onClick={() => storefront.addToCart(product.id)}
                        type="button"
                      >
                        <span className="relative block aspect-[4/3] overflow-hidden rounded-sm bg-[var(--linen)]">
                          <Image
                            alt=""
                            className="object-cover transition-transform group-hover:scale-[1.03]"
                            fill
                            sizes="190px"
                            src={product.images[0]}
                          />
                        </span>
                        <span className="mt-2 block truncate text-xs font-medium">
                          {product.name}
                        </span>
                        <span className="block text-[11px] text-[var(--muted)]">
                          Add · {money(product.price)}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
            <div className="border-t border-[var(--line)] bg-[var(--bone-2)] px-6 py-5">
              <div className="mb-4 flex items-end justify-between">
                <span className="text-sm text-[var(--muted)]">Subtotal</span>
                <span className="font-serif text-2xl">{money(storefront.subtotal)}</span>
              </div>
              <Button className="h-12 w-full rounded-full" render={<Link href="/checkout" />}>
                Continue to checkout
              </Button>
              <p className="mt-3 text-center text-[11px] leading-4 text-[var(--muted)]">
                Availability is confirmed at checkout. Delivery is calculated next.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
