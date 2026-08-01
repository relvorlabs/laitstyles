"use client";

import "@/modules/storefront-shell/ui/storefront.css";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="lst-storefront">
      <main
        id="main"
        className="mx-auto grid min-h-[70vh] max-w-[720px] place-items-center px-4 py-24 text-center"
      >
        <div>
          <p className="eyebrow text-brand-sage-strong">Something went wrong</p>
          <h1 className="mt-4 font-serif text-[clamp(2rem,5vw,3.2rem)] font-medium leading-[0.98]">
            We couldn’t load this piece.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Please try again — if it keeps happening, head back to the catalogue.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button onClick={reset} size="lg" type="button">
              Try again
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/products" />}
              size="lg"
              variant="outline"
            >
              Back to the catalogue
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
