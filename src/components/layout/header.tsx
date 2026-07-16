"use client";

import { FavouriteIcon, Menu02Icon, Search01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { BrandMark } from "@/components/layout/brand-mark";
import { CartSheet } from "@/components/layout/cart-sheet";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const primaryNav: { label: string; href: string }[] = [
  { label: "New in", href: "/products" },
  { label: "Coats", href: "/products" },
  { label: "Dresses", href: "/products" },
  { label: "Sale", href: "/products" },
];

function SearchField({ id }: { id: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : "/products");
  }

  return (
    <form
      className="flex items-center gap-2 rounded-full border border-border bg-control px-4 py-[9px]"
      onSubmit={onSubmit}
      role="search"
    >
      <label className="sr-only" htmlFor={id}>
        Search pieces
      </label>
      <Button aria-label="Search" size="icon-sm" type="submit" variant="ghost">
        <HugeiconsIcon aria-hidden="true" icon={Search01Icon} size={18} strokeWidth={1.6} />
      </Button>
      <Input
        className="h-auto border-0 bg-transparent p-0 text-[13.5px] shadow-none focus-visible:ring-0"
        id={id}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search one-of-one pieces"
        value={query}
      />
    </form>
  );
}

function IconLink({ href, label, icon }: { href: string; label: string; icon: typeof UserIcon }) {
  return (
    <Link
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-control-hover"
      href={href}
    >
      <HugeiconsIcon aria-hidden="true" icon={icon} size={20} strokeWidth={1.6} />
    </Link>
  );
}

export function Header() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/86 backdrop-blur-[14px] max-md:hidden">
        <div className="mx-auto flex max-w-[1240px] items-center gap-7 px-8 py-4">
          <Link aria-label="Laitstyle home" href="/">
            <BrandMark />
          </Link>
          <nav className="ml-2 flex items-center gap-[26px]">
            {primaryNav.map((item, index) => (
              <Link
                className={cn(
                  "text-[14px] transition-colors hover:text-foreground",
                  index === 0 ? "font-medium text-foreground" : "text-muted-foreground",
                )}
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex-1" />
          <div className="w-[230px]">
            <SearchField id="header-search-desktop" />
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <IconLink href="/account/saved" icon={FavouriteIcon} label="Saved items" />
            <IconLink href="/account" icon={UserIcon} label="Account" />
            <CartSheet />
          </div>
        </div>
      </header>

      <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur-[14px] md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Sheet>
            <SheetTrigger
              render={
                <Button aria-label="Open menu" size="icon-lg" type="button" variant="ghost" />
              }
            >
              <HugeiconsIcon aria-hidden="true" icon={Menu02Icon} size={24} strokeWidth={1.6} />
            </SheetTrigger>
            <SheetContent className="w-[80%] max-w-[320px] gap-0 bg-card p-0" side="left">
              <SheetHeader className="flex-row items-center justify-between border-b border-border p-4">
                <SheetTitle>
                  <BrandMark compact />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col px-1.5 py-2">
                {primaryNav.map((item) => (
                  <Link
                    className="border-b border-border px-3.5 py-3.5 text-[16px] last:border-b-0"
                    href={item.href}
                    key={item.label}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link className="px-3.5 py-3.5 text-[16px]" href="/account">
                  My account
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <Link aria-label="Laitstyle home" href="/">
            <BrandMark compact />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle className="size-10" />
            <IconLink href="/account" icon={UserIcon} label="Account" />
            <CartSheet />
          </div>
        </div>
        <div className="px-4 pb-3">
          <SearchField id="header-search-mobile" />
        </div>
      </header>
    </>
  );
}
