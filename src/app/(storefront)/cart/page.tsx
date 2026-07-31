"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { openStorefrontOverlay } from "@/modules/storefront-shell/client/storefront-runtime";

export default function CartPage() {
  useEffect(() => {
    openStorefrontOverlay("cartDrawer");
  }, []);

  return (
    <main className="lst-storefront grid min-h-[70dvh] place-items-center bg-[var(--bone)] px-5 py-16 text-[var(--ink)]">
      <section className="max-w-lg rounded-[18px] border border-[var(--line)] bg-[var(--bone-2)] p-8 text-center shadow-[0_24px_70px_rgba(0,0,0,.1)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
          Your bag
        </p>
        <h1 className="mt-3 font-serif text-4xl font-normal">Continue in the checkout drawer.</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          The drawer is the single cart and checkout surface, so saved quantities, account details,
          delivery addresses, coupons and recoverable payments stay synchronized.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => openStorefrontOverlay("cartDrawer")} type="button">
            Open your bag
          </Button>
          <Button nativeButton={false} render={<Link href="/products" />} variant="outline">
            Keep shopping
          </Button>
        </div>
      </section>
    </main>
  );
}
