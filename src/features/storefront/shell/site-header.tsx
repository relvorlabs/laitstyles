"use client";

import { Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useShop } from "@/components/shop/shop-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { BrandMark } from "./brand-mark";

const navigation = [
  ["Shop", "/products"],
  ["New arrivals", "/products?sort=newest"],
  ["One-of-one", "/products?mode=unique"],
] as const;

export function SiteHeader() {
  const { heldItems } = useShop();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bone)]/95 backdrop-blur">
      <div className="shell flex h-16 items-center gap-4 px-4">
        <Button
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation"
          className="md:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Menu className="size-5" />
        </Button>

        <Link aria-label="Laitstyles home" href="/">
          <BrandMark />
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
          {navigation.map(([label, href]) => (
            <Link className={buttonVariants({ variant: "ghost" })} href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>

        <form action="/products" className="ml-auto hidden max-w-sm flex-1 md:flex" method="get">
          <label className="relative w-full">
            <span className="sr-only">Search products</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-10 w-full rounded-full border border-input bg-control pl-9 pr-3 text-sm"
              name="search"
              placeholder="Search the catalogue"
              type="search"
            />
          </label>
        </form>

        <Link
          aria-label="Account"
          className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
          href="/account"
        >
          <UserRound className="size-5" />
        </Link>
        <Link
          aria-label={`Bag with ${heldItems.length} held ${heldItems.length === 1 ? "item" : "items"}`}
          className={`${buttonVariants({ size: "icon-sm", variant: "ghost" })} relative`}
          href="/cart"
        >
          <ShoppingBag className="size-5" />
          {heldItems.length > 0 ? (
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-foreground text-[10px] text-background">
              {heldItems.length}
            </span>
          ) : null}
        </Link>
      </div>

      {mobileOpen ? (
        <nav
          aria-label="Mobile navigation"
          className="grid gap-1 border-t border-[var(--line)] px-4 py-3 md:hidden"
        >
          {navigation.map(([label, href]) => (
            <Link
              className={buttonVariants({ variant: "ghost" })}
              href={href}
              key={href}
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
