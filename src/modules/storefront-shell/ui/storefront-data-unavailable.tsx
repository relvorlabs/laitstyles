import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StorefrontDataUnavailable({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <main
      className={cn(
        "grid place-items-center px-6 text-center",
        compact ? "min-h-[55vh]" : "min-h-screen",
      )}
      id="main"
    >
      <section className="max-w-md rounded-2xl border border-[var(--line)] bg-[var(--bone-2)] p-8 shadow-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
          Storefront temporarily unavailable
        </p>
        <h1 className="mt-3 font-serif text-4xl font-normal italic text-[var(--ink)]">
          We could not load the shop.
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          Your bag and saved items are still safe. Please try again in a moment.
        </p>
        <a className={cn(buttonVariants(), "mt-6 inline-flex")} href="/">
          Try again
        </a>
      </section>
    </main>
  );
}
