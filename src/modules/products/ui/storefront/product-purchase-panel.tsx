"use client";

import {
  ArrowDownRight01Icon,
  DeliverySecure01Icon,
  DeliveryTruck01Icon,
  FavouriteIcon,
  MinusSignIcon,
  PackageDeliveredIcon,
  PackageIcon,
  PlusSignIcon,
  RefreshIcon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { useStorefrontSavedItems } from "@/modules/storefront-shell/client/storefront-runtime";
import { money, type Product } from "./catalogue-data";
import type { ProductDetailPresentation } from "./product-detail-presentation";
import type { UseProductSelection } from "./use-product-selection";

const STAR_RATINGS = [1, 2, 3, 4, 5] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
}

export interface ProductPurchasePanelProps {
  product: Product;
  presentation: ProductDetailPresentation;
  selection: UseProductSelection;
  anchorRef: RefObject<HTMLDivElement | null>;
  canAdd: boolean;
  quantity: number;
  error: string;
  onQuantityChange: (nextQuantity: number) => void;
  onClearError: () => void;
  onAdd: () => void;
  onBuyNow: () => void;
}

export function ProductPurchasePanel({
  product,
  presentation,
  selection,
  anchorRef,
  canAdd,
  quantity,
  error,
  onQuantityChange,
  onClearError,
  onAdd,
  onBuyNow,
}: ProductPurchasePanelProps) {
  const savedItems = useStorefrontSavedItems();
  const selectedColour = selection.selectedColour ?? product.colour ?? "Not specified";
  const available = product.status === "available";
  const displayPrice = selection.displayPrice;
  const discountPercent =
    selection.referencePrice && selection.referencePrice > displayPrice
      ? Math.round((1 - displayPrice / selection.referencePrice) * 100)
      : presentation.discountPercent;
  const sizeOptions =
    selection.compatibleSizes.length > 0
      ? selection.compatibleSizes.map((variant) => ({
          label: variant.size ?? variant.label,
          value: variant.size ?? variant.label,
          available: variant.availability.available > 0,
        }))
      : presentation.sizes;
  const maxQuantity = product.inventory === "one-of-one" ? 1 : Math.max(1, product.stock);
  const saved = savedItems.idSet.has(product.id);
  const reviewLabel =
    presentation.reviewSummary.count > 0
      ? `${presentation.reviewSummary.average.toFixed(1)} · ${presentation.reviewSummary.count} reviews`
      : "No reviews yet";

  return (
    <aside aria-labelledby="product-title" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <div className="flex items-start gap-5">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
            Laitstyles / {product.new ? "New season" : product.category}
          </p>
          <h1
            className="mt-3 font-serif text-[46px] font-medium leading-[0.95] tracking-[-0.035em] sm:text-[56px]"
            id="product-title"
          >
            {product.name}
          </h1>
          <p className="mt-4 max-w-md text-[12px] leading-6 text-muted-foreground">
            {presentation.description}
          </p>
        </div>

        <Button
          aria-label={`${saved ? "Remove" : "Add"} ${product.name} ${saved ? "from" : "to"} wishlist`}
          aria-pressed={saved}
          className="ml-auto shrink-0 rounded-full"
          onClick={() => savedItems.toggleProduct(product.id)}
          size="icon-lg"
          type="button"
          variant={saved ? "default" : "outline"}
        >
          <HugeiconsIcon
            aria-hidden="true"
            fill={saved ? "currentColor" : "none"}
            icon={FavouriteIcon}
            size={20}
            strokeWidth={1.6}
          />
        </Button>
      </div>

      <Button
        aria-label={`${reviewLabel}. Go to ratings and reviews.`}
        className="mt-4 min-h-11 rounded-full px-1 text-left text-[11px] font-semibold"
        onClick={() => scrollToSection("reviews-section")}
        type="button"
        variant="link"
      >
        <span aria-hidden="true" className="flex gap-0.5 text-star">
          {STAR_RATINGS.map((star) => (
            <HugeiconsIcon
              aria-hidden="true"
              fill={
                star <= Math.round(presentation.reviewSummary.average) ? "currentColor" : "none"
              }
              icon={StarIcon}
              key={star}
              size={14}
              strokeWidth={1.6}
            />
          ))}
        </span>
        <span className="underline decoration-border-strong underline-offset-4">{reviewLabel}</span>
        <HugeiconsIcon
          aria-hidden="true"
          icon={ArrowDownRight01Icon}
          size={16}
          strokeWidth={1.6}
        />
      </Button>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <span className="text-[34px] font-extrabold tracking-[-0.04em] tabular-nums">
          {money(displayPrice)}
        </span>
        {selection.referencePrice && selection.referencePrice > displayPrice ? (
          <span className="pb-1 text-sm text-muted-foreground line-through">
            {money(selection.referencePrice)}
          </span>
        ) : null}
        {discountPercent ? (
          <span className="mb-1 rounded-full bg-primary px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-primary-foreground">
            {discountPercent}% off
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[9px] text-muted-foreground">
        Taxes included. Shipping calculated at checkout.
      </p>

      <div className="mt-7 grid grid-cols-3 border-y border-border py-4">
        <Assurance body="Lagos 1–2 days" icon={DeliveryTruck01Icon} title="Fast delivery" />
        <Assurance
          body="Protected checkout"
          bordered
          icon={DeliverySecure01Icon}
          title="Secure payment"
        />
        <Assurance body="Within 7 days" bordered icon={RefreshIcon} title="Easy returns" />
      </div>

      <fieldset className="mt-7">
        <legend className="text-[11px] font-semibold">
          Colour: <span>{selectedColour}</span>
        </legend>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {presentation.colours.map((colour) => {
            const selected = colour.name === selectedColour;
            return (
              <button
                aria-label={colour.name}
                aria-pressed={selected}
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-[outline] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring ${
                  selected
                    ? "border-border-strong outline-2 outline-offset-4 outline-foreground"
                    : "border-border-strong"
                } ${colour.hex ? "" : "bg-surface-sunken"}`}
                key={colour.name}
                onClick={() => {
                  selection.selectColour(colour.name);
                  onClearError();
                }}
                style={colour.hex ? { backgroundColor: colour.hex } : undefined}
                title={colour.name}
                type="button"
              >
                {colour.hex ? null : (
                  <span className="font-mono text-[8px] font-semibold uppercase tracking-tight text-foreground">
                    {colour.name.slice(0, 2)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <div className="flex items-center justify-between gap-4">
          <legend className="text-[11px] font-semibold">
            Size: <span>{selection.selectedSize ?? (product.size || "One size")}</span>
          </legend>
          <Button
            className="h-auto px-0 text-[10px] font-semibold"
            onClick={() => scrollToSection("size-guide")}
            type="button"
            variant="link"
          >
            Size guide
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {sizeOptions.map((size) => {
            const selected =
              product.inventory === "variant"
                ? selection.selectedSize === size.value
                : size.value === product.size || sizeOptions.length === 1;
            return (
              <Button
                aria-pressed={selected}
                className="min-h-12 disabled:line-through"
                disabled={!size.available}
                key={size.value}
                onClick={() => {
                  selection.selectSize(size.value);
                  onClearError();
                }}
                type="button"
                variant={selected ? "default" : "outline"}
              >
                {size.label}
              </Button>
            );
          })}
        </div>
        <p className="mt-3 min-h-4 text-[9px] text-muted-foreground">
          {product.fit} fit. Choose your usual size unless the measurements suggest otherwise.
        </p>
        <p className="mt-1 min-h-4 text-[10px] text-destructive" role="alert">
          {error}
        </p>
      </fieldset>

      <div className="mt-6" ref={anchorRef}>
        <div className="flex gap-3">
          <div className="flex h-14 w-[130px] items-center justify-between rounded-md border border-border bg-control px-2">
            <Button
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              size="icon"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon aria-hidden="true" icon={MinusSignIcon} size={16} strokeWidth={1.7} />
            </Button>
            <span className="text-[12px] font-semibold tabular-nums">{quantity}</span>
            <Button
              aria-label="Increase quantity"
              disabled={quantity >= maxQuantity}
              onClick={() => onQuantityChange(Math.min(maxQuantity, quantity + 1))}
              size="icon"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon aria-hidden="true" icon={PlusSignIcon} size={16} strokeWidth={1.7} />
            </Button>
          </div>
          <Button
            className="h-14 flex-1 text-[12px] font-bold"
            disabled={!canAdd}
            onClick={onAdd}
            type="button"
          >
            {available ? `Add to bag · ${money(displayPrice * quantity)}` : product.status}
          </Button>
        </div>
        <Button
          className="mt-3 h-14 w-full text-[12px] font-bold"
          disabled={!canAdd}
          onClick={onBuyNow}
          type="button"
          variant="outline"
        >
          Buy now
        </Button>
      </div>

      <div className="mt-5 rounded-sm border border-border bg-surface-raised p-5 shadow-storefront-1">
        <Info body="Lagos · 1–2 business days" icon={PackageDeliveredIcon} title="Estimated delivery" />
        <div className="mt-4 border-t border-border pt-4">
          <Info
            body={
              available
                ? `${product.stock} ${product.stock === 1 ? "piece" : "pieces"} currently available.`
                : "This piece cannot currently be added to a bag."
            }
            icon={PackageIcon}
            title={available ? "In stock" : product.status}
          />
        </div>
      </div>
    </aside>
  );
}

function Assurance({
  icon,
  title,
  body,
  bordered = false,
}: {
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  title: string;
  body: string;
  bordered?: boolean;
}) {
  return (
    <div className={bordered ? "border-l border-border px-3" : "pr-3"}>
      <HugeiconsIcon aria-hidden="true" icon={icon} size={20} strokeWidth={1.5} />
      <p className="mt-2 text-[10px] font-semibold">{title}</p>
      <p className="mt-1 text-[9px] leading-4 text-muted-foreground">{body}</p>
    </div>
  );
}

function Info({
  icon,
  title,
  body,
}: {
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <HugeiconsIcon
        aria-hidden="true"
        className="mt-0.5 shrink-0"
        icon={icon}
        size={20}
        strokeWidth={1.5}
      />
      <div>
        <p className="text-[11px] font-semibold">{title}</p>
        <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
