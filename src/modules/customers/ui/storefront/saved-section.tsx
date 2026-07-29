"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStorefrontSavedItems } from "@/modules/storefront-shell/client/storefront-runtime";
import { Eyebrow, panelClass } from "@/modules/storefront-shell/ui/account-primitives";
import { SavedProductGrid } from "./saved-product-grid";

export function SavedSection() {
  const saved = useStorefrontSavedItems();
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
      {saved.items.length ? (
        <SavedProductGrid className="mt-7" products={saved.items} />
      ) : (
        <div
          className={cn(
            "mt-7 flex flex-col items-center gap-4 border-dashed p-10 text-center sm:p-14",
            panelClass,
          )}
        >
          <h2 className="font-serif text-3xl font-normal">Nothing saved yet.</h2>
          <p className="max-w-md text-[var(--acc-muted)]">
            Tap the heart on any piece in the shop and it will appear here.
          </p>
          <Link className={buttonVariants({ size: "lg" })} href="/products">
            Browse products
          </Link>
        </div>
      )}
    </>
  );
}
