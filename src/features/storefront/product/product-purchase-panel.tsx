"use client";

import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { inventoryLabel, money, type Product } from "@/features/storefront/shared/catalogue-data";
import { IconHeart } from "@/features/storefront/shared/storefront-icons";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";
import { ProductInfoRow } from "./product-detail-primitives";

const conditionRank: Record<string, number> = { "A+": 10, A: 8, "B+": 6 };
const conditionWord: Record<string, string> = { "A+": "Like new", A: "Excellent", "B+": "Good" };

export function ProductPurchasePanel({
  product,
  anchorRef,
  canAdd,
  onAdd,
  onShare,
}: {
  product: Product;
  anchorRef: RefObject<HTMLDivElement | null>;
  canAdd: boolean;
  onAdd: () => void;
  onShare: () => void;
}) {
  const storefront = useStorefront();
  const { setQuickError } = storefront;
  const isVariant = product.inventory === "variant";
  const isOneOfOne = product.inventory === "one-of-one";
  const available = product.status === "available";
  const filled = conditionRank[product.condition] ?? 6;

  return (
    <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-[16px] border border-border bg-surface-raised p-5 sm:p-7 lg:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {isOneOfOne ? (
            <span className="badge badge-solid">1 of 1</span>
          ) : (
            <span className="badge badge-sage">{inventoryLabel(product.inventory)}</span>
          )}
          <span className="badge">{available ? "Available" : product.status}</span>
          <span className="mono ml-auto text-muted-foreground">LS-{product.id.toUpperCase()}</span>
        </div>

        <p className="eyebrow mt-7 text-muted-foreground">
          {product.style} · {product.category}
        </p>
        <h1 className="mt-3 font-serif text-[clamp(2.4rem,5vw,4.4rem)] font-medium leading-[0.95] tracking-[-0.03em]">
          {product.name}
        </h1>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-y border-border py-5">
          <div>
            <p className="eyebrow text-muted-foreground">Price</p>
            <p className="price mt-2 text-3xl font-semibold tracking-[-0.02em] tabular-nums">
              {money(product.price)}
            </p>
          </div>
          <div className="max-w-[200px] text-right text-sm leading-6 text-muted-foreground">
            Taxes included. Delivery calculated at checkout.
          </div>
        </div>

        <p className="mt-6 text-[1.03rem] leading-7 text-muted-foreground">
          {product.material}. {product.brand !== "Unbranded" ? `${product.brand} · ` : ""}
          Recommended fit {product.fit}.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[9px] border border-border bg-surface-panel p-4">
            <p className="eyebrow text-muted-foreground">Tagged size</p>
            <p className="mt-2 text-lg font-semibold">{product.size}</p>
            <p className="mt-1 text-sm text-muted-foreground">Recommended fit: {product.fit}</p>
          </div>
          <div className="rounded-[9px] border border-border bg-surface-panel p-4">
            <p className="eyebrow text-muted-foreground">Condition</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-lg font-semibold">
                {conditionWord[product.condition] ?? product.condition}
              </p>
              <span className="font-semibold text-brand-sage-strong">
                Grade {product.condition}
              </span>
            </div>
            <div className="mt-3 flex gap-1" aria-label={`Condition grade ${product.condition}`}>
              {Array.from({ length: 10 }, (_, index) => (
                <span
                  key={index}
                  className={`h-1.5 flex-1 rounded-full ${index < filled ? "bg-brand-sage" : "bg-border"}`}
                />
              ))}
            </div>
          </div>
        </div>

        {isOneOfOne ? (
          <div className="mt-4 rounded-[9px] border border-border bg-surface-sunken p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand-sage text-white">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m7 12 3 3 7-7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <p className="font-semibold">You are buying the exact piece shown.</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  One item only. No restock expected.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {isVariant && product.variants ? (
          <div className="mt-6">
            <p className="eyebrow mb-2 text-muted-foreground">Select size</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant, index) => {
                const disabled = index === (product.variants?.length ?? 0) - 1 && product.stock < 5;
                const selected = storefront.selectedVariant === variant;
                return (
                  <Button
                    size="lg"
                    key={variant}
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected}
                    onClick={() => {
                      storefront.setSelectedVariant(variant);
                      setQuickError("");
                    }}
                    className="min-w-12 disabled:line-through"
                    variant={selected ? "default" : "outline"}
                  >
                    {variant}
                  </Button>
                );
              })}
            </div>
            <p className="mt-2 min-h-[19px] text-[13px] text-destructive" role="alert">
              {storefront.quickError}
            </p>
          </div>
        ) : null}

        <div className="mt-7 grid grid-cols-2 gap-3">
          <Button type="button" onClick={() => storefront.open("measureModal")} variant="outline">
            Measurements
          </Button>
          <Button type="button" onClick={() => storefront.open("conditionModal")} variant="outline">
            Condition guide
          </Button>
        </div>

        <div ref={anchorRef} className="mt-6 grid gap-3">
          <Button size="lg" type="button" className="w-full" disabled={!canAdd} onClick={onAdd}>
            {available ? (isOneOfOne ? "Add this exact piece" : "Add to bag") : product.status}
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              className="gap-2"
              aria-pressed={storefront.saved.has(product.id)}
              onClick={() => storefront.toggleSaved(product.id)}
              variant="outline"
            >
              <IconHeart
                filled={storefront.saved.has(product.id)}
                style={{ width: 18, height: 18 }}
              />
              {storefront.saved.has(product.id) ? "Saved" : "Save"}
            </Button>
            <Button type="button" className="gap-2" onClick={onShare} variant="outline">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
              Share
            </Button>
          </div>
        </div>

        <div className="mt-7 divide-y divide-[color:var(--line)] border-y border-border">
          <ProductInfoRow
            title="Delivery from Lagos"
            body="Lagos 1–2 days · Nationwide 2–5 days"
            onClick={() => storefront.open("deliveryModal")}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3 7h11v10H3zM14 10h3l4 4v3h-7z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx="7" cy="18" r="2" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="18" cy="18" r="2" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            }
          />
          <ProductInfoRow
            title="7-day returns"
            body="Condition and tags must remain unchanged"
            onClick={() =>
              storefront.showToast(
                "Returns accepted within 7 days when the item remains unworn and tagged.",
              )
            }
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M8 7H4v4M4.5 10.5A8 8 0 1 0 7 5.3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <ProductInfoRow
            title="Inspected and cleaned"
            body="Condition checked by hand"
            onClick={() => storefront.open("conditionModal")}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 3 5 6v5c0 4.6 2.8 8.2 7 10 4.2-1.8 7-5.4 7-10V6l-7-3Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="m9 12 2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
        </div>
      </div>
    </aside>
  );
}
