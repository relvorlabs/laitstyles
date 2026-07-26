// Shared product card. Its JSX, classes, labels and responsive behaviour are preserved
// from the legacy storefront component; only ownership and import paths changed.

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useReveal } from "@/hooks/use-reveal";
import { IconHeart } from "@/modules/storefront-shell/ui/storefront-icons";
import { addToBagLabel, money, type Product, productSlug } from "./catalogue-data";

type Props = {
  product: Product;
  isSaved: boolean;
  isHeld: boolean;
  holdSeconds: number | null;
  onQuickView: (id: string) => void;
  onSave: (id: string) => void;
  onAdd: (id: string) => void;
  onHold: (id: string) => void;
  onRelease: (id: string) => void;
};

const imgBase =
  "absolute inset-0 h-full w-full object-cover [filter:saturate(0.72)_contrast(0.97)] [transition:opacity_480ms_var(--ease),transform_650ms_var(--ease),filter_480ms_var(--ease)]";
const imgHover =
  "[@media(hover:hover)]:group-hover:scale-[1.025] [@media(hover:hover)]:group-hover:[filter:saturate(0.86)_contrast(1)]";

function formatHold(seconds: number) {
  const value = Math.max(0, seconds);
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function IconBag() {
  return (
    <svg
      aria-hidden="true"
      className="size-[15px] [stroke-width:1.7]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M6 7h12l-1 13H7L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}

export function ProductCard({
  product,
  isSaved,
  isHeld,
  holdSeconds,
  onQuickView,
  onSave,
  onAdd,
  onHold,
  onRelease,
}: Props) {
  const primaryImage = product.images[0];
  const secondaryImage = product.images[1];
  const unavailable = product.status !== "available";
  const isVariant = product.inventory === "variant";
  const href = `/products/${productSlug(product)}`;
  const { ref, visible } = useReveal<HTMLElement>();

  const hover = isHeld
    ? {
        label: "Release hold",
        action: () => onRelease(product.id),
        variant: "destructive" as const,
      }
    : isVariant
      ? {
          label: "Choose options",
          action: () => onQuickView(product.id),
          variant: "default" as const,
        }
      : {
          label: "Hold piece",
          action: () => onHold(product.id),
          variant: "default" as const,
        };

  const bagAction = unavailable
    ? undefined
    : isVariant
      ? () => onQuickView(product.id)
      : () => onAdd(product.id);

  return (
    <article
      className={`group flex h-full min-w-0 flex-col reveal${visible ? " visible" : ""}`}
      data-card={product.id}
      ref={ref}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-[var(--linen)] shadow-[0_1px_0_rgba(25,26,23,0.06)]">
        {primaryImage ? (
          <Image
            alt={`${product.name}, primary view`}
            className={`${imgBase} ${secondaryImage ? "[@media(hover:hover)]:group-hover:opacity-0" : ""} ${imgHover}`}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            onError={(event) => {
              event.currentTarget.style.opacity = "0.2";
            }}
            src={primaryImage}
          />
        ) : null}
        {secondaryImage ? (
          <Image
            alt=""
            className={`${imgBase} opacity-0 [@media(hover:hover)]:group-hover:opacity-100 ${imgHover}`}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            src={secondaryImage}
          />
        ) : null}
        <Button
          size="lg"
          aria-label={`Quick view ${product.name}`}
          className="absolute inset-0 z-[2]"
          onClick={() => onQuickView(product.id)}
          type="button"
          variant="ghost"
        />
        <div className="pointer-events-none absolute left-3 top-3 z-[3] flex flex-wrap gap-1.5 max-[600px]:left-2 max-[600px]:top-2">
          {isHeld ? (
            <span className="badge badge-sage inline-flex items-center gap-1.5 tabular-nums">
              <span className="size-1.5 rounded-full bg-[var(--sage-deep)] [animation:leemPulse_1.6s_ease-in-out_infinite]" />
              Held · {formatHold(holdSeconds ?? 0)}
            </span>
          ) : null}
          {product.new ? <span className="badge badge-light">New</span> : null}
          {product.inventory === "one-of-one" ? (
            <span className="badge badge-solid">1 of 1</span>
          ) : null}
          {product.condition === "A+" ? <span className="badge badge-sage">A+</span> : null}
        </div>
        <Button
          aria-label={`${isSaved ? "Remove" : "Save"} ${product.name}`}
          className="absolute right-3 top-3 z-[4] max-[600px]:right-2 max-[600px]:top-2"
          onClick={() => onSave(product.id)}
          size="icon-lg"
          type="button"
          variant="ghost"
        >
          <IconHeart
            className="[stroke-width:1.5]"
            filled={isSaved}
            style={{ width: 18, height: 18 }}
          />
        </Button>
        {unavailable ? (
          <div className="absolute inset-0 z-[3] grid place-items-center bg-[rgba(25,26,23,0.34)] font-mono text-[0.72rem] font-medium uppercase leading-none tracking-[0.12em] text-white">
            {product.status}
          </div>
        ) : (
          <Button
            className="absolute inset-x-3 bottom-3 z-[4] translate-y-[calc(100%+16px)] opacity-0 transition-[translate,opacity] focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 max-[600px]:hidden"
            onClick={hover.action}
            size="lg"
            type="button"
            variant={hover.variant}
          >
            {hover.label}
          </Button>
        )}
      </div>
      <div className="flex flex-1 flex-col px-[2px] pt-[13px]">
        <div className="flex items-start justify-between gap-[14px]">
          <h3 className="m-0 line-clamp-2 min-h-[2.5em] max-w-[18rem] text-[0.96rem] font-[560] leading-[1.25] max-[600px]:text-[0.84rem]">
            <Link href={href}>{product.name}</Link>
          </h3>
          <span className="whitespace-nowrap font-mono text-[0.83rem] font-[550] tabular-nums max-[600px]:text-[0.75rem]">
            {money(product.price)}
          </span>
        </div>
        <p className="mt-1.5 text-[0.78rem] text-[var(--muted)] max-[600px]:text-[0.69rem]">
          Size {product.size} · Grade {product.condition}
        </p>
        <div className="mt-auto flex flex-col gap-[9px] pt-[11px]">
          <span className="inventory-note">
            {product.inventory === "one-of-one"
              ? "Exact piece"
              : product.inventory === "variant"
                ? "Size options"
                : `${product.stock} available`}
          </span>
          <Button
            size="lg"
            className="w-full gap-2"
            disabled={unavailable}
            onClick={bagAction}
            type="button"
            variant={unavailable ? "secondary" : "default"}
          >
            {!unavailable && !isVariant ? <IconBag data-icon="inline-start" /> : null}
            {addToBagLabel(product)}
          </Button>
        </div>
      </div>
    </article>
  );
}
