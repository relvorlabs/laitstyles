"use client";

import { Check, ChevronDown, Clock, Heart, Search, SlidersHorizontal, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { formatHoldTime, useShop } from "@/components/shop/shop-provider";
import { naira, type PlpProduct, pdpHref, plpItems } from "@/lib/catalogue";

const categories = Array.from(new Set(plpItems.map((item) => item.category)));
const sizes = ["XS", "S", "M", "L", "XL", "OS"];
const conditions = ["Excellent", "Good", "Fair"];

type SortKey = "newest" | "price-low" | "price-high" | "reduced";
type PriceKey = "any" | "under-15" | "15-30" | "over-30";

export default function ShopPage() {
  return (
    <Suspense fallback={<LoadingGrid />}>
      <Catalogue />
    </Suspense>
  );
}

function Catalogue() {
  const params = useSearchParams();
  const { heldItems, reserve, release, isHeld, secondsFor } = useShop();
  const initialCategory = normalizeCategory(params.get("category"));
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(initialCategory);
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState("");
  const [price, setPrice] = useState<PriceKey>("any");
  const [sort, setSort] = useState<SortKey>(normalizeSort(params.get("sort")));
  const [visible, setVisible] = useState(12);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [notified, setNotified] = useState<Record<string, boolean>>({});

  const activeHeld = heldItems.filter((item) => item.secondsLeft > 0);
  const soonest = activeHeld.length ? Math.min(...activeHeld.map((item) => item.secondsLeft)) : 0;

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const products = plpItems.filter((item) => {
      const matchesQuery = normalizedQuery
        ? `${item.name} ${item.category} ${item.color} ${item.condition} ${item.brand} ${item.era} ${item.size}`
            .toLowerCase()
            .includes(normalizedQuery)
        : true;
      const matchesCategory = category ? item.category === category : true;
      const matchesSize = size ? item.size === size : true;
      const matchesCondition = condition ? item.condition === condition : true;
      const matchesPrice =
        price === "any"
          ? true
          : price === "under-15"
            ? item.price < 15000
            : price === "15-30"
              ? item.price >= 15000 && item.price <= 30000
              : item.price > 30000;
      return matchesQuery && matchesCategory && matchesSize && matchesCondition && matchesPrice;
    });

    return products.toSorted((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      if (sort === "reduced") {
        const reductionA = 1 - a.price / a.original;
        const reductionB = 1 - b.price / b.original;
        return reductionB - reductionA;
      }
      return a.rank - b.rank;
    });
  }, [category, condition, price, query, size, sort]);

  const shown = filtered.slice(0, visible);
  const activeFilterCount = [category, size, condition, price !== "any" ? price : ""].filter(
    Boolean,
  ).length;

  function clearFilters() {
    setCategory("");
    setSize("");
    setCondition("");
    setPrice("any");
    setVisible(12);
  }

  return (
    <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 pb-20 pt-8 max-sm:px-4">
      <section className="border-b border-border pb-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.28em] text-[#7C8C63]">
              One-of-one catalogue
            </div>
            <h1 className="max-w-[720px] text-balance font-serif text-[48px] font-medium italic leading-[1.02] max-sm:text-[38px]">
              {category || "All pieces"}, each here only once.
            </h1>
            <p className="mt-3 max-w-[650px] text-[14px] leading-[1.65] text-[#6E6C64]">
              Browse honestly graded second-hand clothing from Lagos. Reserve a piece for 15 minutes
              before someone else takes it.
            </p>
          </div>
          <div className="text-right">
            <div className="font-serif text-[24px]">{filtered.length}</div>
            <div className="text-[11px] uppercase tracking-[.16em] text-[#8A887E]">
              available and rehomed pieces
            </div>
          </div>
        </div>
      </section>

      {activeHeld.length ? (
        <Link
          className="mt-5 flex items-center justify-between gap-4 rounded-[14px] border border-[#D6DAC8] bg-[#F2F4EA] px-4 py-3 text-[#4A5540]"
          href="/cart"
        >
          <span className="flex items-center gap-2.5 text-[13px]">
            <span className="size-2 animate-[leemPulse_1.6s_ease-in-out_infinite] rounded-full bg-[#7C8C63]" />
            {activeHeld.length} {activeHeld.length === 1 ? "piece" : "pieces"} held for you
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold">
            <Clock aria-hidden="true" className="size-3.5" />
            Next release {formatHoldTime(soonest)} · Review bag
          </span>
        </Link>
      ) : null}

      <section className="mt-7 flex items-center gap-3 border-y border-border py-3.5">
        <form
          className="relative min-w-0 flex-1"
          onSubmit={(event) => event.preventDefault()}
          role="search"
        >
          <label className="sr-only" htmlFor="catalogue-search">
            Search catalogue
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8A887E]"
          />
          <input
            autoComplete="off"
            className="h-11 w-full rounded-full border border-border bg-white pl-11 pr-4 text-[13.5px] outline-none focus:border-primary"
            id="catalogue-search"
            name="q"
            onChange={(event) => {
              setQuery(event.target.value);
              setVisible(12);
            }}
            placeholder="Search jackets, denim, colour or size…"
            type="search"
            value={query}
          />
        </form>

        <button
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-white px-4 text-[13px] font-semibold md:hidden"
          onClick={() => setFiltersOpen(true)}
          type="button"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Filters {activeFilterCount ? `(${activeFilterCount})` : ""}
        </button>

        <label className="relative hidden md:block">
          <span className="sr-only">Sort products</span>
          <select
            className="h-11 appearance-none rounded-full border border-border bg-white pl-4 pr-10 text-[13px] font-semibold outline-none focus:border-primary"
            onChange={(event) => setSort(event.target.value as SortKey)}
            value={sort}
          >
            <option value="newest">Newest first</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="reduced">Most reduced</option>
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8A887E]"
          />
        </label>
      </section>

      <div className="mt-7 grid grid-cols-[220px_minmax(0,1fr)] gap-8 max-md:grid-cols-1">
        <aside className="max-md:hidden">
          <FilterPanel
            category={category}
            clearFilters={clearFilters}
            condition={condition}
            price={price}
            setCategory={setCategory}
            setCondition={setCondition}
            setPrice={setPrice}
            setSize={setSize}
            size={size}
          />
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[13px] text-[#6E6C64]">
              Showing {Math.min(visible, filtered.length)} of {filtered.length} pieces
            </div>
            {activeFilterCount || query ? (
              <button
                className="text-[12.5px] font-semibold text-[#7C8C63] underline underline-offset-2"
                onClick={() => {
                  clearFilters();
                  setQuery("");
                }}
                type="button"
              >
                Clear search &amp; filters
              </button>
            ) : null}
          </div>

          {shown.length ? (
            <div className="grid grid-cols-3 gap-x-4 gap-y-8 max-lg:grid-cols-2 max-sm:gap-x-3">
              {shown.map((product) => (
                <ProductCard
                  held={isHeld(product.id)}
                  key={product.id}
                  notified={Boolean(notified[product.id])}
                  onNotify={() => setNotified((current) => ({ ...current, [product.id]: true }))}
                  onRelease={() => release(product.id)}
                  onReserve={() => reserve(product)}
                  onWishlist={() =>
                    setWishlist((current) => ({ ...current, [product.id]: !current[product.id] }))
                  }
                  product={product}
                  secondsLeft={secondsFor(product.id)}
                  wished={Boolean(wishlist[product.id])}
                />
              ))}
            </div>
          ) : (
            <EmptyCatalogue
              query={query}
              onReset={() => {
                clearFilters();
                setQuery("");
              }}
            />
          )}

          {visible < filtered.length ? (
            <div className="mt-10 flex justify-center">
              <button
                className="h-12 rounded-full border-[1.5px] border-primary bg-transparent px-8 text-[14px] font-semibold"
                onClick={() => setVisible((current) => current + 12)}
                type="button"
              >
                Load more one-of-one pieces
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-[100] flex justify-end bg-[#171612]/45 md:hidden">
          <div
            aria-label="Catalogue filters"
            aria-modal="true"
            className="h-full w-[88%] max-w-[380px] overflow-y-auto bg-[#F6F5F1] p-5"
            role="dialog"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-serif text-[26px] font-medium">Filter pieces</h2>
              <button
                aria-label="Close filters"
                className="flex size-10 items-center justify-center rounded-full border border-border bg-white"
                onClick={() => setFiltersOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <FilterPanel
              category={category}
              clearFilters={clearFilters}
              condition={condition}
              price={price}
              setCategory={setCategory}
              setCondition={setCondition}
              setPrice={setPrice}
              setSize={setSize}
              size={size}
            />
            <button
              className="sticky bottom-3 mt-6 h-12 w-full rounded-full bg-primary text-[14px] font-semibold text-primary-foreground"
              onClick={() => setFiltersOpen(false)}
              type="button"
            >
              Show {filtered.length} pieces
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ProductCard({
  held,
  notified,
  onNotify,
  onRelease,
  onReserve,
  onWishlist,
  product,
  secondsLeft,
  wished,
}: {
  held: boolean;
  notified: boolean;
  onNotify: () => void;
  onRelease: () => void;
  onReserve: () => void;
  onWishlist: () => void;
  product: PlpProduct;
  secondsLeft: number;
  wished: boolean;
}) {
  const sold = product.state === "sold";
  const heldByOther = product.state === "resOthers";
  const expired = held && secondsLeft <= 0;

  return (
    <article className="group">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-muted">
        <Link href={pdpHref(product.id)}>
          <Image
            alt={product.name}
            className={
              sold || heldByOther
                ? "object-cover opacity-60 grayscale"
                : "object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            }
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 40vw, 28vw"
            src={product.image}
          />
        </Link>
        <button
          aria-label={
            wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`
          }
          aria-pressed={wished}
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-white/92 backdrop-blur"
          onClick={onWishlist}
          type="button"
        >
          <Heart
            aria-hidden="true"
            className={wished ? "size-4 fill-[#B04A45] text-[#B04A45]" : "size-4"}
          />
        </button>
        <StateBadge held={held} product={product} secondsLeft={secondsLeft} />
      </div>

      <div className="mt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link className="line-clamp-2 text-[14px] font-medium" href={pdpHref(product.id)}>
              {product.name}
            </Link>
            <p className="mt-1 text-[12px] text-[#8A887E]">
              Size {product.size} · {product.color} · {product.condition}
            </p>
          </div>
          <span className="shrink-0 text-[13.5px] font-semibold">{naira(product.price)}</span>
        </div>

        {held ? (
          <div className="mt-3 flex items-center justify-between gap-2">
            <span
              className={
                expired
                  ? "text-[11.5px] font-semibold text-[#8A362F]"
                  : "text-[11.5px] font-semibold text-[#4A5540]"
              }
            >
              {expired ? "Hold expired" : `Held · ${formatHoldTime(secondsLeft)}`}
            </span>
            <button
              className="text-[11.5px] text-[#8A887E] underline underline-offset-2"
              onClick={expired ? onReserve : onRelease}
              type="button"
            >
              {expired ? "Re-hold" : "Release"}
            </button>
          </div>
        ) : sold || heldByOther ? (
          <button
            className="mt-3 h-9 w-full rounded-full border border-border bg-white text-[12px] font-semibold"
            disabled={notified}
            onClick={onNotify}
            type="button"
          >
            {notified ? "Notification set" : sold ? "Find similar" : "Notify me if released"}
          </button>
        ) : (
          <button
            className="mt-3 h-9 w-full rounded-full border border-primary bg-transparent text-[12px] font-semibold transition-colors hover:bg-primary hover:text-primary-foreground"
            onClick={onReserve}
            type="button"
          >
            {product.state === "lastone" ? "Reserve the last one" : "Quick reserve"}
          </button>
        )}
      </div>
    </article>
  );
}

function StateBadge({
  held,
  product,
  secondsLeft,
}: {
  held: boolean;
  product: PlpProduct;
  secondsLeft: number;
}) {
  let label = "Available";
  let className = "border-[#D6DAC8] bg-[#F2F4EA] text-[#4A5540]";
  if (held) {
    label = secondsLeft > 0 ? `Held ${formatHoldTime(secondsLeft)}` : "Hold expired";
    className =
      secondsLeft > 0
        ? "border-[#D6DAC8] bg-[#F2F4EA] text-[#4A5540]"
        : "border-[#E4C4BF] bg-[#FBF0EE] text-[#8A362F]";
  } else if (product.state === "lastone") {
    label = "Last one";
    className = "border-[#E8D7A6] bg-[#FBF6E8] text-[#8A7434]";
  } else if (product.state === "resOthers") {
    label = "Held by someone";
    className = "border-[#E8D7A6] bg-[#FBF6E8] text-[#8A7434]";
  } else if (product.state === "sold") {
    label = "Rehomed";
    className = "border-[#DAD8CF] bg-[#EDECE6] text-[#6E6C64]";
  }
  return (
    <span
      className={`absolute bottom-3 left-3 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function FilterPanel({
  category,
  clearFilters,
  condition,
  price,
  setCategory,
  setCondition,
  setPrice,
  setSize,
  size,
}: {
  category: string;
  clearFilters: () => void;
  condition: string;
  price: PriceKey;
  setCategory: (value: string) => void;
  setCondition: (value: string) => void;
  setPrice: (value: PriceKey) => void;
  setSize: (value: string) => void;
  size: string;
}) {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="text-[12px] font-semibold uppercase tracking-[.12em] text-[#57554E]">
          Filters
        </div>
        <button
          className="text-[11.5px] text-[#7C8C63] underline underline-offset-2"
          onClick={clearFilters}
          type="button"
        >
          Reset
        </button>
      </div>
      <FilterGroup label="Category">
        <FilterOption active={!category} label="All pieces" onClick={() => setCategory("")} />
        {categories.map((item) => (
          <FilterOption
            active={category === item}
            key={item}
            label={item}
            onClick={() => setCategory(item)}
          />
        ))}
      </FilterGroup>
      <FilterGroup label="Size">
        <div className="grid grid-cols-3 gap-2">
          {sizes.map((item) => (
            <button
              aria-pressed={size === item}
              className={
                size === item
                  ? "h-9 rounded-[9px] bg-primary text-[12px] font-semibold text-primary-foreground"
                  : "h-9 rounded-[9px] border border-border bg-white text-[12px] font-semibold"
              }
              key={item}
              onClick={() => setSize(size === item ? "" : item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup label="Condition">
        {conditions.map((item) => (
          <FilterOption
            active={condition === item}
            key={item}
            label={item}
            onClick={() => setCondition(condition === item ? "" : item)}
          />
        ))}
      </FilterGroup>
      <FilterGroup label="Price">
        <FilterOption active={price === "any"} label="Any price" onClick={() => setPrice("any")} />
        <FilterOption
          active={price === "under-15"}
          label="Under ₦15k"
          onClick={() => setPrice("under-15")}
        />
        <FilterOption
          active={price === "15-30"}
          label="₦15k–₦30k"
          onClick={() => setPrice("15-30")}
        />
        <FilterOption
          active={price === "over-30"}
          label="Over ₦30k"
          onClick={() => setPrice("over-30")}
        />
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <section className="border-t border-border py-5">
      <h3 className="mb-3 text-[13px] font-semibold">{label}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function FilterOption({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className="flex items-center justify-between gap-3 text-left text-[12.5px] text-[#57554E]"
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <span
        className={
          active
            ? "flex size-4 items-center justify-center rounded-[4px] bg-primary text-primary-foreground"
            : "flex size-4 items-center justify-center rounded-[4px] border border-[#CFCDBF] bg-white"
        }
      >
        {active ? <Check aria-hidden="true" className="size-3" /> : null}
      </span>
    </button>
  );
}

function EmptyCatalogue({ query, onReset }: { query: string; onReset: () => void }) {
  return (
    <section className="flex min-h-[460px] flex-col items-center justify-center rounded-[16px] border border-border bg-white px-6 text-center">
      <div className="flex size-[70px] items-center justify-center rounded-full bg-[#F2F4EA] text-[#7C8C63]">
        <Search aria-hidden="true" className="size-7" />
      </div>
      <h2 className="mt-5 font-serif text-[30px] font-medium">No one-of-one match yet</h2>
      <p className="mt-2 max-w-[420px] text-[13.5px] leading-[1.6] text-[#6E6C64]">
        {query
          ? `Nothing currently matches “${query}”. Try another term or clear your filters.`
          : "No pieces match this combination of filters."}
      </p>
      <button
        className="mt-5 h-11 rounded-full bg-primary px-6 text-[13px] font-semibold text-primary-foreground"
        onClick={onReset}
        type="button"
      >
        Show all pieces
      </button>
    </section>
  );
}

function LoadingGrid() {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-6 py-10">
      <div className="h-14 w-2/3 animate-pulse rounded-[14px] bg-muted" />
      <div className="mt-10 grid grid-cols-3 gap-4 max-md:grid-cols-2">
        {Array.from({ length: 9 }).map((_, index) => (
          <div className="aspect-[4/5] animate-pulse rounded-[14px] bg-muted" key={index} />
        ))}
      </div>
    </main>
  );
}

function normalizeCategory(value: string | null) {
  if (!value) return "";
  return categories.find((item) => item.toLowerCase() === value.toLowerCase()) ?? "";
}

function normalizeSort(value: string | null): SortKey {
  return value === "price-low" || value === "price-high" || value === "reduced" ? value : "newest";
}
