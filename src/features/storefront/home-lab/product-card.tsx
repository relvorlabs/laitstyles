// Shared product card. BLOCKER 2-3N-01: this component's own layout is now Tailwind
// utilities (exact values preserved via arbitrary utilities that reference the same
// .lst-lab scoped vars). Shared primitives kept as classes: `badge*` (used across the
// storefront), `inventory-note` (also used by the cart drawer), and `reveal`/`visible`
// (scroll reveal — pending BLOCKER 2-3N-02 Motion migration). The media and title are
// real links to the canonical PDP; save / quick-add stay independent controls above.

import Link from "next/link";
import { money, type Product, productSlug } from "./data";
import { IconHeart } from "./icons";
import { useReveal } from "./reveal";

type Props = {
  product: Product;
  isSaved: boolean;
  onQuickView: (id: string) => void;
  onSave: (id: string) => void;
  onAdd: (id: string) => void;
};

const imgBase =
  "absolute inset-0 h-full w-full object-cover [filter:saturate(0.72)_contrast(0.97)] [transition:opacity_480ms_var(--ease),transform_650ms_var(--ease),filter_480ms_var(--ease)]";
const imgHover =
  "[@media(hover:hover)]:group-hover:scale-[1.025] [@media(hover:hover)]:group-hover:[filter:saturate(0.86)_contrast(1)]";

export function ProductCard({ product: p, isSaved, onQuickView, onSave, onAdd }: Props) {
  const unavailable = p.status !== "available";
  const primaryAction = p.inventory === "variant" ? () => onQuickView(p.id) : () => onAdd(p.id);
  const href = `/products/${productSlug(p)}`;
  const { ref, visible } = useReveal<HTMLElement>();
  return (
    <article
      ref={ref}
      className={`group min-w-0 reveal${visible ? " visible" : ""}`}
      data-card={p.id}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-[var(--linen)] shadow-[0_1px_0_rgba(25,26,23,0.06)]">
        <img
          className={`${imgBase} [@media(hover:hover)]:group-hover:opacity-0 ${imgHover}`}
          src={p.images[0]}
          alt={`${p.name}, primary view`}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.opacity = "0.2";
          }}
        />
        <img
          className={`${imgBase} opacity-0 [@media(hover:hover)]:group-hover:opacity-100 ${imgHover}`}
          src={p.images[1]}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <Link className="absolute inset-0 z-[2]" href={href} aria-label={`View ${p.name}`} />
        <div className="pointer-events-none absolute left-3 top-3 z-[3] flex flex-wrap gap-1.5 max-[600px]:left-2 max-[600px]:top-2">
          {p.new ? <span className="badge badge-light">New</span> : null}
          {p.inventory === "one-of-one" ? <span className="badge badge-solid">1 of 1</span> : null}
          {p.condition === "A+" ? <span className="badge badge-sage">A+</span> : null}
        </div>
        <button
          className={`absolute right-3 top-3 z-[4] grid size-10 place-items-center rounded-full bg-[rgba(243,240,232,0.9)] backdrop-blur-[10px] [transition:transform_180ms_var(--ease),background_180ms_var(--ease)] hover:scale-[1.04] hover:bg-[var(--bone)] max-[600px]:right-2 max-[600px]:top-2 max-[600px]:size-[38px] ${isSaved ? "text-[var(--oxblood)]" : ""}`}
          type="button"
          aria-label={`${isSaved ? "Remove" : "Save"} ${p.name}`}
          onClick={() => onSave(p.id)}
        >
          <IconHeart
            filled={isSaved}
            className="[stroke-width:1.5]"
            style={{ width: 18, height: 18 }}
          />
        </button>
        {unavailable ? (
          <div className="absolute inset-0 z-[3] grid place-items-center bg-[rgba(25,26,23,0.34)] font-mono text-[0.72rem] font-medium uppercase leading-none tracking-[0.12em] text-[var(--bone)]">
            {p.status}
          </div>
        ) : (
          <button
            className="absolute inset-x-3 bottom-3 z-[4] min-h-11 rounded-[4px] bg-[rgba(25,26,23,0.9)] font-[550] text-[var(--bone)] opacity-0 [transform:translateY(calc(100%+16px))] [transition:transform_250ms_var(--ease),opacity_220ms_var(--ease),background_180ms_var(--ease)] hover:bg-[var(--sage-deep)] focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 max-[600px]:hidden"
            type="button"
            onClick={primaryAction}
          >
            {p.inventory === "variant" ? "Choose options" : "Quick add"}
          </button>
        )}
      </div>
      <div className="px-[2px] pt-[13px]">
        <div className="flex items-start justify-between gap-[14px]">
          <h3 className="m-0 max-w-[18rem] text-[0.96rem] font-[560] leading-[1.25] max-[600px]:text-[0.84rem]">
            <Link href={href}>{p.name}</Link>
          </h3>
          <span className="whitespace-nowrap font-mono text-[0.83rem] font-[550] tabular-nums max-[600px]:text-[0.75rem]">
            {money(p.price)}
          </span>
        </div>
        <p className="mt-1.5 text-[0.78rem] text-[var(--muted)] max-[600px]:text-[0.69rem]">
          Size {p.size} · Grade {p.condition}
        </p>
        <div className="mt-[9px] flex items-center justify-between gap-2 max-[600px]:block">
          <span className="inventory-note">
            {p.inventory === "one-of-one"
              ? "Exact piece"
              : p.inventory === "variant"
                ? "Size options"
                : `${p.stock} available`}
          </span>
          <button
            className="border-0 border-b border-[var(--line-strong)] bg-transparent py-[5px] text-[0.75rem] font-semibold hover:text-[var(--sage-deep)] max-[600px]:text-[0.7rem]"
            type="button"
            onClick={primaryAction}
            disabled={unavailable}
          >
            {unavailable ? p.status : p.inventory === "variant" ? "View options" : "Add to bag"}
          </button>
        </div>
      </div>
    </article>
  );
}
