"use client";

import { Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useShop } from "@/components/shop/shop-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button aria-label="Open navigation" className="md:hidden" size="icon-sm" variant="ghost">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetTitle>Browse Laitstyles</SheetTitle>
            <nav className="mt-8 grid gap-2">
              {navigation.map(([label, href]) => (
                <Link className={buttonVariants({ variant: "ghost" })} href={href} key={href} onClick={() => setMobileOpen(false)}>
                  {label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Link aria-label="Laitstyles home" href="/"><BrandMark /></Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {navigation.map(([label, href]) => (
            <Link className={buttonVariants({ variant: "ghost" })} href={href} key={href}>{label}</Link>
          ))}
        </nav>

        <form action="/products" className="ml-auto hidden max-w-sm flex-1 md:flex" method="get">
          <label className="relative w-full">
            <span className="sr-only">Search products</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input className="h-10 w-full rounded-full border border-input bg-control pl-9 pr-3 text-sm" name="search" placeholder="Search the catalogue" type="search" />
          </label>
        </form>

        <Link aria-label="Account" className={buttonVariants({ size: "icon-sm", variant: "ghost" })} href="/account"><UserRound className="size-5" /></Link>
        <Link aria-label={`Bag with ${heldItems.length} held ${heldItems.length === 1 ? "item" : "items"}`} className={`${buttonVariants({ size: "icon-sm", variant: "ghost" })} relative`} href="/cart">
          <ShoppingBag className="size-5" />
          {heldItems.length > 0 ? <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-foreground text-[10px] text-background">{heldItems.length}</span> : null}
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--bone-2)]">
      <div className="shell grid gap-8 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div><BrandMark /><p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">Curated premium pre-owned fashion with transparent condition, sizing and availability.</p></div>
        <nav className="grid content-start gap-3 text-sm" aria-label="Shop links"><p className="font-semibold">Shop</p><Link href="/products">All pieces</Link><Link href="/products?sort=newest">New arrivals</Link><Link href="/products?mode=unique">One-of-one</Link></nav>
        <nav className="grid content-start gap-3 text-sm" aria-label="Account links"><p className="font-semibold">Account</p><Link href="/account">Profile and orders</Link><Link href="/account?tab=saved">Saved pieces</Link><Link href="/contact">Contact</Link></nav>
      </div>
      <div className="border-t border-[var(--line)] py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Laitstyles</div>
    </footer>
  );
}
