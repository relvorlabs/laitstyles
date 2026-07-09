"use client";

import Link from "next/link";
import { Heart, Menu, Search, UserRound } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { CartSheet } from "@/components/layout/cart-sheet";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const nav = [
  { label: "Shop New In", href: "/shop?sort=newest" },
  { label: "Women", href: "/shop?department=women" },
  { label: "Men", href: "/shop?department=men" },
  { label: "Accessories", href: "/shop?category=accessories" },
  { label: "Journal", href: "/#journal" },
];

export function Header() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/86 backdrop-blur-[14px] max-md:hidden">
        <div className="mx-auto flex max-w-[1240px] items-center gap-7 px-8 py-4">
          <Link aria-label="Laitstyle home" href="/">
            <BrandMark />
          </Link>
          <nav aria-label="Primary" className="ml-2 flex items-center gap-[26px]">
            {nav.map((item, index) => (
              <Link
                className={
                  index === 0
                    ? "text-[14px] font-medium"
                    : "text-[14px] text-muted-foreground"
                }
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex-1" />
          <form action="/shop" className="w-[230px]" role="search">
            <label className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-[9px] focus-within:border-primary">
              <Search aria-hidden="true" className="text-[#9A988F]" />
              <span className="sr-only">Search one-of-one pieces</span>
              <Input
                autoComplete="off"
                className="h-auto border-0 bg-transparent p-0 text-[13.5px] shadow-none focus-visible:ring-0"
                name="q"
                placeholder="Search one-of-one pieces…"
                type="search"
              />
            </label>
          </form>
          <div className="flex items-center gap-4">
            <Link aria-label="Wishlist" className="flex p-1" href="/account?tab=saved">
              <Heart aria-hidden="true" />
            </Link>
            <Link aria-label="Account" className="flex p-1" href="/account">
              <UserRound aria-hidden="true" />
            </Link>
            <CartSheet />
          </div>
        </div>
      </header>

      <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur-[14px] md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Sheet>
            <SheetTrigger
              render={
                <button aria-label="Open navigation" className="flex p-1" type="button" />
              }
            >
              <Menu aria-hidden="true" />
            </SheetTrigger>
            <SheetContent className="w-[78%] max-w-[320px] gap-0 bg-card p-0" side="left">
              <SheetHeader className="flex-row items-center justify-between border-b border-border p-4">
                <SheetTitle className="text-[14px] font-semibold tracking-[.24em]">
                  LAITSTYLE
                </SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile primary" className="flex flex-col px-1.5 py-2">
                {nav.map((item) => (
                  <Link
                    className="border-b border-secondary px-3.5 py-3.5 text-[16px] last:border-b-0"
                    href={item.href}
                    key={item.label}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link className="border-t border-secondary px-3.5 py-3.5 text-[16px]" href="/account?tab=saved">
                  Saved pieces
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <Link aria-label="Laitstyle home" href="/">
            <BrandMark compact />
          </Link>
          <div className="flex items-center gap-3.5">
            <Link aria-label="Account" className="flex p-0.5" href="/account">
              <UserRound aria-hidden="true" />
            </Link>
            <CartSheet compact />
          </div>
        </div>
        <form action="/shop" className="px-4 pb-3" role="search">
          <label className="flex items-center gap-2 rounded-full border border-border bg-card px-[15px] py-[9px] focus-within:border-primary">
            <Search aria-hidden="true" className="text-[#9A988F]" />
            <span className="sr-only">Search one-of-one pieces</span>
            <Input
              autoComplete="off"
              className="h-auto border-0 bg-transparent p-0 text-[14px] shadow-none focus-visible:ring-0"
              name="q"
              placeholder="Search one-of-one pieces…"
              type="search"
            />
          </label>
        </form>
      </header>
    </>
  );
}
