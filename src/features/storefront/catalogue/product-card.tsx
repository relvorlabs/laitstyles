import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { formatNaira } from "@/lib/money";
import type { Availability, ProductSummary } from "@/lib/storefront/types";
import { cn } from "@/lib/utils";

// Quick-Pick Matrix (docs/storefront-v2/card-lab/inventory.html, concept 10).
// Save and quick-reserve controls arrive as client islands with their real
// mutations. Until then, Quick Pick links to the canonical product page.
export function ProductCard({ product }: { product: ProductSummary }) {
  const isSold = product.availability.state === "sold_out";
  const isReserved =
    product.availability.state === "reserved_by_me" ||
    product.availability.state === "reserved_by_others";
  const discount = product.referencePrice
    ? Math.round((1 - product.price / product.referencePrice) * 100)
    : null;
  const productHref = `/products/${product.slug}`;
  const quickSize = product.sizeLabel?.split("/")[0]?.trim();

  return (
    <article className="group/card min-w-0">
      <Card
        className="grid h-full min-w-0 grid-rows-[1fr_auto] gap-0 overflow-hidden rounded-[var(--radius)] py-0 shadow-laitstyle-sm transition-transform duration-200 hover:-translate-y-[3px] motion-reduce:transform-none motion-reduce:transition-none"
        size="sm"
      >
        <CardContent className="p-0">
          <Link
            aria-label={`View ${product.name}`}
            className="relative block aspect-[1/1.08] overflow-hidden bg-surface-raised outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            href={productHref}
          >
            {product.cover ? (
              <Image
                alt={product.cover.alt || product.name}
                className={cn(
                  "object-cover transition-[transform,opacity] duration-300 group-hover/card:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100",
                  isSold && "opacity-55 grayscale",
                )}
                fill
                sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                src={product.cover.url}
              />
            ) : (
              <span className="grid size-full place-items-center bg-surface-sunken px-4 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                Image unavailable
              </span>
            )}

            {isSold || isReserved ? (
              <span className="absolute inset-x-2 bottom-2 bg-surface-inverse px-2.5 py-2 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-surface-inverse-foreground">
                {isSold ? "Sold — details remain available" : "Reserved — release time may apply"}
              </span>
            ) : null}
          </Link>

          <div className="grid gap-2 px-3 pb-0 pt-[11px]">
            <CardTitle className="line-clamp-2 min-h-[34px] text-[15px]/[1.15] font-medium">
              <Link
                className="rounded-sm outline-none hover:text-brand-sage-strong focus-visible:ring-2 focus-visible:ring-ring"
                href={productHref}
              >
                {product.name}
              </Link>
            </CardTitle>

            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 tabular-nums">
                <span className={cn("font-semibold", isSold && "text-muted-foreground")}>
                  {formatNaira(product.price)}
                </span>
                {product.referencePrice && !isSold ? (
                  <>
                    <span className="text-[0.82em] text-muted-foreground line-through">
                      {formatNaira(product.referencePrice)}
                    </span>
                    {discount ? (
                      <span className="font-mono text-[10px] tracking-[0.05em] text-brand-sage-strong">
                        −{discount}%
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>
              <AvailabilityLine availability={product.availability} compact />
            </div>

            <div className="flex h-7 min-w-0 items-stretch gap-1 overflow-hidden">
              {quickSize ? (
                <span className="grid h-7 min-w-7 place-items-center border border-border px-1 font-mono text-[9px] text-foreground">
                  {quickSize}
                </span>
              ) : (
                <span className="grid h-7 min-w-7 place-items-center border border-border px-1 font-mono text-[9px] text-muted-foreground">
                  —
                </span>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="border-0 bg-transparent px-3 pb-3 pt-2">
          <Link
            className={cn(
              buttonVariants({ variant: "default" }),
              "h-11 w-full rounded-[7px] text-sm transition-[transform,background-color,color,border-color] duration-200 hover:-translate-y-px motion-reduce:transform-none motion-reduce:transition-none",
            )}
            href={productHref}
          >
            {isSold ? "View piece" : "Quick pick"}
          </Link>
        </CardFooter>
      </Card>
    </article>
  );
}

const availabilityCopy: Record<
  Availability["state"],
  { label: string; dot: string; text: string }
> = {
  available: { label: "Available", dot: "bg-brand-sage", text: "text-muted-foreground" },
  low: { label: "Low stock", dot: "bg-warning", text: "text-warning-surface-foreground" },
  reserved_by_me: {
    label: "In your bag",
    dot: "bg-brand-sage-strong",
    text: "text-brand-sage-strong",
  },
  reserved_by_others: {
    label: "Reserved",
    dot: "bg-border-strong",
    text: "text-muted-foreground",
  },
  sold_out: { label: "Sold", dot: "bg-destructive", text: "text-muted-foreground" },
};

export function AvailabilityLine({
  availability,
  compact = false,
}: {
  availability: Availability;
  compact?: boolean;
}) {
  const copy = availabilityCopy[availability.state];
  const label =
    availability.state === "low"
      ? `Only ${availability.available} left`
      : availability.state === "available" && availability.isOneOfOne
        ? "The only one"
        : copy.label;

  if (compact) {
    return (
      <span
        className={cn(
          "max-w-24 truncate text-right font-mono text-[10px] uppercase tracking-[0.06em]",
          copy.text,
        )}
        title={label}
      >
        {label}
      </span>
    );
  }

  return (
    <span className={cn("flex items-center gap-2 text-[12px] font-medium", copy.text)}>
      <span className={cn("size-2 rounded-full", copy.dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
