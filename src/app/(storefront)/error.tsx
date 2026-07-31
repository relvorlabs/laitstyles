"use client";

import { Button } from "@/components/ui/button";

export default function StorefrontError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-[70vh] place-items-center px-6 text-center" id="main">
      <section className="max-w-md rounded-2xl border border-[var(--line)] bg-[var(--bone-2)] p-8 shadow-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
          Something went wrong
        </p>
        <h1 className="mt-3 font-serif text-4xl font-normal italic text-[var(--ink)]">
          We could not finish loading this page.
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          Your bag and account details are unchanged. Try the page again when you are ready.
        </p>
        <Button className="mt-6" onClick={reset} type="button">
          Try again
        </Button>
      </section>
    </main>
  );
}
