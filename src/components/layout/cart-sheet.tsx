"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { feedItems, naira } from "@/lib/catalogue";
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

const held = feedItems.filter((item) => item.state === "resYou");

export function CartSheet({ compact = false }: { compact?: boolean }) {
  const total = held.reduce((sum, item) => sum + item.price, 0);

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            aria-label="Cart"
            className="relative flex p-1"
            type="button"
          />
        }
      >
        <ShoppingBag />
        <span className="absolute -right-1.5 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-primary px-1 text-[10.5px] font-semibold text-primary-foreground">
          {held.length}
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
          <SheetTitle className="font-serif text-[22px] font-normal">
            Reserved rail
          </SheetTitle>
          <SheetDescription>
            {held.length} {held.length === 1 ? "piece" : "pieces"} held for 15
            minutes.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 p-5">
          {held.length ? (
            held.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="size-[74px] rounded-[11px] bg-muted" />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="text-[14px] font-medium">{item.name}</div>
                  <div className="text-[12.5px] text-muted-foreground">
                    Size {item.size} · {item.color} · {item.condition}
                  </div>
                  <div className="text-[13.5px] font-semibold">
                    {naira(item.price)}
                  </div>
                  <button className="self-start text-[12px] text-muted-foreground underline underline-offset-2">
                    Release hold
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-[66px] items-center justify-center rounded-full bg-muted">
                <ShoppingBag className="text-muted-foreground" />
              </div>
              <div className="font-serif text-[22px]">Nothing reserved yet</div>
              <p className="max-w-[260px] text-[13px] leading-[1.55] text-[#8A887E]">
                Every piece is one-of-one. Reserve one and we&apos;ll hold it
                here so no one else can take it while you decide.
              </p>
            </div>
          )}
        </div>
        <div className="mt-auto border-t border-border p-5">
          <div className="mb-4 flex items-center justify-between text-[14px]">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{naira(total)}</span>
          </div>
          <Separator className="mb-4" />
          <Button className="h-[46px] w-full rounded-full text-[14px]" render={<Link href="/checkout" />}>
            Checkout now
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
