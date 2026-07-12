import Image from "next/image";
import Link from "next/link";
import { formatNaira } from "@/lib/money";
import type { Availability, ProductSummary } from "@/lib/storefront/types";
import { cn } from "@/lib/utils";

// One shared product-card contract (docs/storefront-v2/05 §4). Server component —
// pure display; interactive Save / quick-reserve are added as client islands in
// later phases. Availability is communicated with a dot AND text (never colour
// alone).
export function ProductCard({ product }: { product: ProductSummary }) {
  const isSold = product.availability.state === "sold_out";
  const discount = product.referencePrice
    ? Math.round((1 - product.price / product.referencePrice) * 100)
    : null;

  return (
    <article className="group flex flex-col">
      <Link className="flex flex-col gap-3" href={`/products/${product.slug}`}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-surface-sunken">
          {product.cover ? (
            <Image
              alt={product.cover.alt || product.name}
              className={cn(
                "object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100",
                isSold && "opacity-55 grayscale",
              )}
              fill
              sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw"
              src={product.cover.url}
            />
          ) : (
            <div className="grid h-full place-items-center text-xs text-muted-foreground">
              No image
            </div>
          )}
          {product.availability.isOneOfOne && !isSold ? (
            <span className="absolute left-3 top-3 rounded-full border border-chip-border bg-chip-bg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-surface-selected-foreground">
              One of one
            </span>
          ) : null}
          {isSold ? (
            <div className="absolute inset-0 grid place-items-center">
              <span className="rounded-full bg-surface-inverse/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-surface-inverse-foreground">
                Rehomed
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          {product.archiveNumber ? (
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              № {product.archiveNumber}
            </span>
          ) : null}
          <h3 className="truncate text-[14px] text-foreground">{product.name}</h3>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "text-[14px] font-semibold tabular-nums",
                isSold && "text-muted-foreground",
              )}
            >
              {formatNaira(product.price)}
            </span>
            {product.referencePrice && !isSold ? (
              <>
                <span className="text-[12px] text-muted-foreground line-through tabular-nums">
                  {formatNaira(product.referencePrice)}
                </span>
                {discount ? (
                  <span className="text-[11.5px] font-semibold text-brand-sage-strong">
                    −{discount}%
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="text-[11.5px] text-muted-foreground">
            {[product.sizeLabel, product.colour, product.condition].filter(Boolean).join(" · ")}
          </div>
          <AvailabilityLine availability={product.availability} />
        </div>
      </Link>
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
    label: "Reserved by another shopper",
    dot: "bg-border-strong",
    text: "text-muted-foreground",
  },
  sold_out: { label: "Sold — gone for good", dot: "bg-destructive", text: "text-muted-foreground" },
};

export function AvailabilityLine({ availability }: { availability: Availability }) {
  const copy = availabilityCopy[availability.state];
  const label =
    availability.state === "low"
      ? `Only ${availability.available} left`
      : availability.state === "available" && availability.isOneOfOne
        ? "The only one"
        : copy.label;
  return (
    <span className={cn("flex items-center gap-2 text-[12px] font-medium", copy.text)}>
      <span className={cn("size-2 rounded-full", copy.dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
