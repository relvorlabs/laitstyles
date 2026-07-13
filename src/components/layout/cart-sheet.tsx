"use client";

import { Clock, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatHoldTime, useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { naira } from "@/lib/catalogue";

export function CartSheet({ compact = false }: { compact?: boolean }) {
  const { heldItems, release, rehold } = useShop();
  const activeItems = heldItems.filter((item) => item.secondsLeft > 0);
  const total = activeItems.reduce((sum, item) => sum + item.product.price, 0);
  const soonest = activeItems.length ? Math.min(...activeItems.map((item) => item.secondsLeft)) : 0;

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            aria-label={`Bag with ${heldItems.length} reserved ${heldItems.length === 1 ? "piece" : "pieces"}`}
            className="relative flex p-1"
            type="button"
          />
        }
      >
        <ShoppingBag aria-hidden="true" />
        <span className="absolute -right-1.5 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-primary px-1 text-[10.5px] font-semibold text-primary-foreground">
          {heldItems.length}
        </span>
      </SheetTrigger>

      <SheetContent
        side="right"
        className={
          compact
            ? "w-full max-w-full gap-0 bg-card p-0"
            : "w-full gap-0 bg-card p-0 sm:max-w-[440px]"
        }
      >
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle className="font-serif text-[24px] font-medium">Your reserved rail</SheetTitle>
          <SheetDescription>
            {heldItems.length
              ? `${heldItems.length} one-of-one ${heldItems.length === 1 ? "piece" : "pieces"} in your bag.`
              : "Reserve a piece and it will appear here."}
          </SheetDescription>
        </SheetHeader>

        {heldItems.length ? (
          <div className="flex flex-1 flex-col overflow-y-auto p-5">
            {soonest > 0 ? (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#D6DAC8] bg-[#F2F4EA] px-3.5 py-3 text-[12.5px] text-[#4A5540]">
                <span className="size-2 animate-[leemPulse_1.6s_ease-in-out_infinite] rounded-full bg-[#7C8C63]" />
                <span aria-live="polite">
                  Your next hold releases in{" "}
                  <strong className="tabular-nums">{formatHoldTime(soonest)}</strong>
                </span>
              </div>
            ) : null}

            <div className="flex flex-col">
              {heldItems.map(({ product, secondsLeft }) => {
                const expired = secondsLeft <= 0;
                return (
                  <article
                    className="flex gap-3 border-b border-[#F0EEE8] py-4 first:pt-0"
                    key={product.id}
                  >
                    <Link
                      className="relative size-[82px] shrink-0 overflow-hidden rounded-[11px] bg-muted"
                      href={`/p/${product.id}`}
                    >
                      <Image
                        alt={product.name}
                        className={expired ? "object-cover opacity-55 grayscale" : "object-cover"}
                        fill
                        sizes="82px"
                        src={product.image}
                      />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            className="line-clamp-2 text-[14px] font-medium"
                            href={`/p/${product.id}`}
                          >
                            {product.name}
                          </Link>
                          <div className="mt-1 text-[12px] text-muted-foreground">
                            Size {product.size} · {product.color} · {product.condition}
                          </div>
                        </div>
                        <span className="shrink-0 text-[13.5px] font-semibold">
                          {naira(product.price)}
                        </span>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        {expired ? (
                          <button
                            className="rounded-full bg-primary px-3 py-1.5 text-[11.5px] font-semibold text-primary-foreground"
                            onClick={() => rehold(product.id)}
                            type="button"
                          >
                            Re-hold
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6DAC8] bg-[#F2F4EA] px-2.5 py-1 text-[11.5px] font-semibold text-[#4A5540]">
                            <Clock aria-hidden="true" className="size-3" />
                            <span className="tabular-nums">{formatHoldTime(secondsLeft)}</span>
                          </span>
                        )}
                        <button
                          aria-label={`Release ${product.name}`}
                          className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-[#B4453C]"
                          onClick={() => release(product.id)}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" className="size-3" />
                          Release
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex size-[66px] items-center justify-center rounded-full bg-muted">
              <ShoppingBag aria-hidden="true" className="text-muted-foreground" />
            </div>
            <div className="font-serif text-[24px]">Nothing reserved yet</div>
            <p className="max-w-[280px] text-[13px] leading-[1.55] text-[#8A887E]">
              Every piece is one-of-one. Reserve one and we&apos;ll hold it here while you decide.
            </p>
            <Button className="mt-2 rounded-full" render={<Link href="/shop" />}>
              Browse the drop
            </Button>
          </div>
        )}

        <div className="mt-auto border-t border-border p-5">
          <div className="mb-4 flex items-center justify-between text-[14px]">
            <span className="text-muted-foreground">Active subtotal</span>
            <span className="font-semibold">{naira(total)}</span>
          </div>
          <Separator className="mb-4" />
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              className="h-[46px] rounded-full"
              render={<Link href="/cart" />}
              variant="outline"
            >
              Review bag
            </Button>
            <Button
              className="h-[46px] rounded-full"
              disabled={!activeItems.length}
              render={activeItems.length ? <Link href="/checkout" /> : undefined}
            >
              Checkout
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
