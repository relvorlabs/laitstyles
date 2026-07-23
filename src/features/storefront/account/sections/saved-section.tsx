"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { AcctButton, Eyebrow, panelClass } from "../components/account-primitives";
import { AccountProductGrid } from "../components/account-product-grid";
import { useAccountProducts } from "../hooks/use-account-products";

export function SavedSection() {
  const { saved } = useAccountProducts();

  return (
    <>
      <header>
        <Eyebrow className="text-[var(--acc-sage-deep)]">Wishlist</Eyebrow>
        <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
          Saved pieces.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
          One-of-one availability can change before you come back.
        </p>
      </header>

      {saved.length ? (
        <AccountProductGrid products={saved} className="mt-7" />
      ) : (
        <div
          className={cn(
            "mt-7 flex flex-col items-center gap-4 border-dashed p-10 text-center sm:p-14",
            panelClass,
          )}
        >
          <h2 className="font-serif text-3xl font-normal">Nothing saved yet.</h2>
          <p className="max-w-md text-[var(--acc-muted)]">
            Tap the heart on any piece in the shop and it will appear here, ready to hold or add to
            your bag.
          </p>
          <AcctButton render={<Link href="/products" />}>Browse products</AcctButton>
        </div>
      )}
    </>
  );
}
