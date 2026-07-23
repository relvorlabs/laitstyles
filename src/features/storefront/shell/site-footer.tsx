"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandMark } from "./brand-mark";

export function SiteFooter() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--bone-2)]">
      <div className="shell grid gap-8 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <BrandMark />

          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            Curated premium pre-owned fashion with transparent condition, sizing and
            availability.
          </p>
        </div>

        <nav aria-label="Shop links" className="grid content-start gap-3 text-sm">
          <p className="font-semibold">Shop</p>
          <Link href="/products">All pieces</Link>
          <Link href="/products?sort=newest">New arrivals</Link>
          <Link href="/products?mode=unique">One-of-one</Link>
        </nav>

        <nav aria-label="Account links" className="grid content-start gap-3 text-sm">
          <p className="font-semibold">Account</p>
          <Link href="/account">Profile and orders</Link>
          <Link href="/account?tab=saved">Saved pieces</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </div>

      <div className="border-t border-[var(--line)] py-4 text-center text-xs text-muted-foreground">
        © {currentYear ?? ""} Laitstyles
      </div>
    </footer>
  );
}
