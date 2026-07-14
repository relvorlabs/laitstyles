// Shared product card. BLOCKER 2-3N-01: this component's own layout is now Tailwind
// utilities (exact values preserved via arbitrary utilities that reference the same
// .lst-lab scoped vars). Shared primitives kept as classes: `badge*` (used across the
// storefront), `inventory-note` (also used by the cart drawer), and `reveal`/`visible`
// (scroll reveal — pending BLOCKER 2-3N-02 Motion migration).
//
// Interaction model (mirrors the account card): clicking the image opens the quick-view
// dialog; the product name links to the canonical PDP. The hover button places / releases
// a 15-minute hold (variant pieces route to quick view to choose a size first); a held
// piece shows a persistent "Held · MM:SS" chip. The bottom "Add to bag" is the emphasized
// commit CTA whose label scales with scarcity.

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { addToBagLabel, money, type Product, productSlug } from "./data";
import { IconHeart } from "./icons";
import { useReveal } from "./reveal";

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
  const unavailable = product.status !== "available";
  const isVariant = product.inventory === "variant";
  const href = `/products/${productSlug(product)}`;
  const { ref, visible } = useReveal<HTMLElement>();

  const hover = isHeld
    ? {
        label: "Release hold",
        action: () => onRelease(product.id),
        className: "bg-[rgba(104,38,49,0.92)] hover:bg-[#682631]",
      }
    : isVariant
      ? {
          label: "Choose options",
          action: () => onQuickView(product.id),
          className: "bg-[rgba(25,26,23,0.9)] hover:bg-[#596044]",
        }
      : {
          label: "Hold piece",
          action: () => onHold(product.id),
          className: "bg-[rgba(25,26,23,0.9)] hover:bg-[#596044]",
        };

  const bagAction = unavailable
    ? undefined
    : isVariant
      ? () => onQuickView(product.id)
      : () => onAdd(product.id);

  return (
    <article
      className={`group min-w-0 reveal${visible ? " visible" : ""}`}
      data-card={product.id}
      ref={ref}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-[var(--linen)] shadow-[0_1px_0_rgba(25,26,23,0.06)]">
        <img
          alt={`${product.name}, primary view`}
          className={`${imgBase} [@media(hover:hover)]:group-hover:opacity-0 ${imgHover}`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.opacity = "0.2";
          }}
          src={product.images[0]}
        />
        <img
          alt=""
          className={`${imgBase} opacity-0 [@media(hover:hover)]:group-hover:opacity-100 ${imgHover}`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          src={product.images[1]}
        />
        <Button
          aria-label={`Quick view ${product.name}`}
          className="absolute inset-0 z-[2] size-full rounded-none p-0"
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
          {product.inventory === "one-of-one" ? <span className="badge badge-solid">1 of 1</span> : null}
          {product.condition === "A+" ? <span className="badge badge-sage">A+</span> : null}
        </div>
        <Button
          aria-label={`${isSaved ? "Remove" : "Save"} ${product.name}`}
          className={`absolute right-3 top-3 z-[4] size-10 rounded-full bg-[rgba(243,240,232,0.92)] p-0 backdrop-blur-[10px] [transition:transform_180ms_var(--ease),background_180ms_var(--ease)] hover:scale-[1.04] hover:bg-white max-[600px]:right-2 max-[600px]:top-2 max-[600px]:size-[38px] ${isSaved ? "text-[#682631]" : "text-[#20261c]"}`}
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
            className={`absolute inset-x-3 bottom-3 z-[4] h-auto min-h-11 w-full translate-y-[calc(100%+16px)] rounded-[4px] text-[0.82rem] font-[550] text-white opacity-0 [transition:translate_250ms_var(--ease),opacity_220ms_var(--ease),background_180ms_var(--ease)] focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 max-[600px]:hidden ${hover.className}`}
            onClick={hover.action}
            size="sm"
            type="button"
          >
            {hover.label}
          </Button>
        )}
      </div>
      <div className="px-[2px] pt-[13px]">
        <div className="flex items-start justify-between gap-[14px]">
          <h3 className="m-0 max-w-[18rem] text-[0.96rem] font-[560] leading-[1.25] max-[600px]:text-[0.84rem]">
            <Link href={href}>{product.name}</Link>
          </h3>
          <span className="whitespace-nowrap font-mono text-[0.83rem] font-[550] tabular-nums max-[600px]:text-[0.75rem]">
            {money(product.price)}
          </span>
        </div>
        <p className="mt-1.5 text-[0.78rem] text-[var(--muted)] max-[600px]:text-[0.69rem]">
          Size {product.size} · Grade {product.condition}
        </p>
        <div className="mt-[11px] flex flex-col gap-[9px]">
          <span className="inventory-note">
            {product.inventory === "one-of-one"
              ? "Exact piece"
              : product.inventory === "variant"
                ? "Size options"
                : `${product.stock} available`}
          </span>
          <Button
            className="h-auto min-h-[42px] w-full gap-2 rounded-[6px] px-4 text-[0.82rem] font-[600]"
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
