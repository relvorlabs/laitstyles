"use client";

import "@/features/storefront/home-lab/home-lab.css";
import Link from "next/link";
import { useEffect } from "react";

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
    <div className="lst-lab">
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
            <button
              type="button"
              className="button button-primary"
              onClick={reset}
              style={{ borderRadius: 999 }}
            >
              Try again
            </button>
            <Link href="/products" className="button" style={{ borderRadius: 999 }}>
              Back to the catalogue
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
