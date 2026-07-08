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

const nav = ["Shop New In", "Women", "Men", "Accessories", "Journal"];

export function Header() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/86 backdrop-blur-[14px] max-md:hidden">
        <div className="mx-auto flex max-w-[1240px] items-center gap-7 px-8 py-4">
          <Link href="/" aria-label="Laitstyle home">
            <BrandMark />
          </Link>
          <nav className="ml-2 flex items-center gap-[26px]">
            {nav.map((item) => (
              <Link
                key={item}
                href={
                  item === "Shop New In"
                    ? "/#justin"
                    : item === "Journal"
                      ? "/#journal"
                      : "#"
                }
                className={
                  item === "Shop New In"
                    ? "text-[14px] font-medium"
                    : "text-[14px] text-muted-foreground"
                }
              >
                {item}
              </Link>
            ))}
          </nav>
          <div className="flex-1" />
          <label className="flex w-[230px] items-center gap-2 rounded-full border border-border bg-card px-4 py-[9px]">
            <Search className="text-[#9A988F]" aria-hidden="true" />
            <Input
              aria-label="Search"
              placeholder="Search one-of-one pieces"
              className="h-auto border-0 bg-transparent p-0 text-[13.5px] shadow-none focus-visible:ring-0"
            />
          </label>
          <div className="flex items-center gap-4">
            <Link href="#" aria-label="Wishlist" className="flex p-1">
              <Heart />
            </Link>
            <Link href="#" aria-label="Account" className="flex p-1">
              <UserRound />
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
                <button aria-label="Menu" className="flex p-1" type="button" />
              }
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-[78%] max-w-[320px] gap-0 bg-card p-0">
              <SheetHeader className="flex-row items-center justify-between border-b border-border p-4">
                <SheetTitle className="text-[14px] font-semibold tracking-[.24em]">
                  LAITSTYLE
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col px-1.5 py-2">
                {nav.map((item) => (
                  <Link
                    key={item}
                    href={
                      item === "Shop New In"
                        ? "/#justin"
                        : item === "Journal"
                          ? "/#journal"
                          : "#"
                    }
                    className="border-b border-secondary px-3.5 py-3.5 text-[16px] last:border-b-0"
                  >
                    {item}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <Link href="/" aria-label="Laitstyle home">
            <BrandMark compact />
          </Link>
          <div className="flex items-center gap-3.5">
            <Link href="#" aria-label="Account" className="flex p-0.5">
              <UserRound />
            </Link>
            <CartSheet compact />
          </div>
        </div>
        <div className="px-4 pb-3">
          <label className="flex items-center gap-2 rounded-full border border-border bg-card px-[15px] py-[9px]">
            <Search className="text-[#9A988F]" aria-hidden="true" />
            <Input
              aria-label="Search"
              placeholder="Search one-of-one pieces"
              className="h-auto border-0 bg-transparent p-0 text-[14px] shadow-none focus-visible:ring-0"
            />
          </label>
        </div>
      </header>
    </>
  );
}
