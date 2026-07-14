"use client";

import { ShoppingBag03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Phase 2 shell: the cart trigger + sheet scaffold with a real empty state.
// Live cart lines (server-truth holds) are wired in Phase 5 — no fake data here.
export function CartSheet() {
  // Placeholder until Phase 5 wires server-truth holds.
  const itemCount: number = 0;

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            aria-label={`Bag, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            className="relative size-11 rounded-full"
            size="icon-lg"
            type="button"
            variant="ghost"
          />
        }
      >
        <HugeiconsIcon aria-hidden="true" icon={ShoppingBag03Icon} size={20} strokeWidth={1.6} />
        {itemCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
            {itemCount}
          </span>
        ) : null}
      </SheetTrigger>
      <SheetContent
        className="flex w-full flex-col bg-background p-0 sm:max-w-[440px]"
        side="right"
      >
        <SheetHeader className="flex-row items-baseline gap-2 border-b border-border px-6 py-5">
          <SheetTitle className="font-serif text-2xl italic">Your bag</SheetTitle>
          <span className="text-sm text-muted-foreground tabular-nums">{itemCount}</span>
        </SheetHeader>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-surface-interactive text-surface-interactive-foreground">
            <HugeiconsIcon
              aria-hidden="true"
              icon={ShoppingBag03Icon}
              size={26}
              strokeWidth={1.6}
            />
          </span>
          <div>
            <p className="font-serif text-xl">Your bag is empty</p>
            <p className="mt-1 max-w-[280px] text-sm leading-relaxed text-muted-foreground">
              Every piece is one-of-one. When you reserve something, it&apos;s held here while you
              decide.
            </p>
          </div>
          <SheetClose
            render={
              <Link
                className={cn(buttonVariants({ size: "lg" }), "rounded-full px-7")}
                href="/shop"
              />
            }
          >
            Shop the archive
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
