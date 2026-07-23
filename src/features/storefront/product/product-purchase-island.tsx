"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import type { Product as BagProduct, ProductState } from "@/lib/catalogue";
import { formatNaira, koboToNaira } from "@/lib/money";
import type { ProductDetail } from "@/lib/storefront/types";
import { useProductSelection } from "./use-product-selection";

function bagState(product: ProductDetail, available: boolean): ProductState {
  if (!available) {
    return product.availability.state === "reserved_by_others" ? "resOthers" : "sold";
  }
  return product.availability.isOneOfOne || product.availability.available === 1
    ? "lastone"
    : "available";
}

export function ProductPurchaseIsland({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const { reserve, isHeld, secondsFor } = useShop();
  const selection = useProductSelection(product);
  const held = isHeld(product.slug);
  const baseSize = product.mode === "variant" ? null : product.sizeLabel;
  const baseColour = product.mode === "variant" ? null : product.colour;
  const colours = useMemo(
    () =>
      product.mode === "variant"
        ? [
            ...new Set(
              product.variants
                .map((variant) => variant.colour)
                .filter((colour): colour is string => Boolean(colour)),
            ),
          ]
        : product.colour
          ? [product.colour]
          : [],
    [product],
  );
  const sizeOptions =
    product.mode === "variant"
      ? selection.compatibleSizes.map((variant) => ({
          label: variant.size ?? variant.label,
          value: variant.size ?? variant.label,
          available: variant.availability.available > 0,
        }))
      : [
          {
            label: product.sizeLabel ?? "One size",
            value: product.sizeLabel ?? "One size",
            available: selection.available,
          },
        ];
  const needsVariant = product.mode === "variant";
  const canHold = selection.available && (!needsVariant || selection.selectedVariant !== null);

  const hold = () => {
    if (!canHold) return;
    const image = selection.media[0] ?? product.media[0];
    const bagProduct: BagProduct = {
      id: product.slug,
      name: product.name,
      category: product.category?.name ?? "Pieces",
      size: selection.selectedSize ?? baseSize ?? "One size",
      color: selection.selectedColour ?? baseColour ?? "Not specified",
      condition: product.condition ?? "Not specified",
      price: koboToNaira(selection.displayPrice),
      original: koboToNaira(selection.referencePrice ?? selection.displayPrice),
      state: bagState(product, selection.available),
      image: image?.url ?? "",
    };

    if (reserve(bagProduct)) router.push("/cart");
  };

  return (
    <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        {product.collection?.name ?? product.category?.name ?? "Laitstyles catalogue"}
      </p>
      <h1 className="mt-3 font-serif text-5xl leading-[0.95] tracking-[-0.04em] sm:text-6xl">
        {product.name}
      </h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">{product.description}</p>

      <div className="mt-6 flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-semibold">{formatNaira(selection.displayPrice)}</span>
        {selection.referencePrice && selection.referencePrice > selection.displayPrice ? (
          <span className="text-sm text-muted-foreground line-through">
            {formatNaira(selection.referencePrice)}
          </span>
        ) : null}
      </div>

      {colours.length > 0 ? (
        <fieldset className="mt-7">
          <legend className="text-sm font-semibold">
            Colour: {selection.selectedColour ?? "Choose a colour"}
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {colours.map((colour) => (
              <Button
                aria-pressed={selection.selectedColour === colour}
                key={colour}
                onClick={() => selection.selectColour(colour)}
                type="button"
                variant={selection.selectedColour === colour ? "default" : "outline"}
              >
                {colour}
              </Button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset className="mt-7">
        <legend className="text-sm font-semibold">
          Size: {selection.selectedSize ?? baseSize ?? "Choose a size"}
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {sizeOptions.map((size) => (
            <Button
              aria-pressed={selection.selectedSize === size.value || sizeOptions.length === 1}
              disabled={!size.available}
              key={size.value}
              onClick={() => selection.selectSize(size.value)}
              type="button"
              variant={
                selection.selectedSize === size.value || sizeOptions.length === 1
                  ? "default"
                  : "outline"
              }
            >
              {size.label}
            </Button>
          ))}
        </div>
      </fieldset>

      <dl className="mt-7 grid grid-cols-2 gap-3 border-y border-border py-5 text-sm">
        <div>
          <dt className="text-muted-foreground">Condition</dt>
          <dd className="mt-1 font-medium">{product.condition ?? "Not specified"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Availability</dt>
          <dd className="mt-1 font-medium">
            {selection.available ? `${selection.availableQuantity} available` : "Unavailable"}
          </dd>
        </div>
      </dl>

      <Button className="mt-6 h-14 w-full" disabled={!canHold} onClick={hold} size="lg">
        {held
          ? `Held · ${Math.floor(secondsFor(product.slug) / 60)}:${String(
              secondsFor(product.slug) % 60,
            ).padStart(2, "0")}`
          : canHold
            ? "Hold in your bag for 15 minutes"
            : needsVariant && selection.selectedVariant === null
              ? "Choose an available size"
              : "Currently unavailable"}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        A hold reserves this piece in your browser; payment is handled later in checkout.
      </p>
    </aside>
  );
}
