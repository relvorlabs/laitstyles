"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  Heart,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { naira, type PlpProduct, type ProductState, pdpHref, plpItems } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

type FeedState = "browse" | "results" | "no-results" | "loading" | "error";
type SortKey = "newest" | "pl" | "ph" | "reduced" | "ending";
type PriceKey = "any" | "u10" | "p1025" | "o25";
type FacetKey = "category" | "size" | "condition" | "color" | "brand" | "era";
type Selection = Record<FacetKey, Record<string, boolean>>;
type OpenFacets = Record<
  "category" | "size" | "condition" | "price" | "color" | "brand" | "era",
  boolean
>;

const typoMap: Record<string, string> = {
  olife: "olive",
  jaket: "jacket",
  jakcet: "jacket",
  jackt: "jacket",
  deim: "denim",
  denin: "denim",
  swaeter: "sweater",
  shrit: "shirt",
  shrt: "shirt",
  coaat: "coat",
  troussers: "trousers",
  trosers: "trousers",
  knitwaer: "knitwear",
  vintge: "vintage",
  dres: "dress",
  blazr: "blazer",
};

const emptySelection = (): Selection => ({
  category: {},
  size: {},
  condition: {},
  color: {},
  brand: {},
  era: {},
});

const defaultOpenFacets: OpenFacets = {
  category: true,
  size: true,
  condition: true,
  price: true,
  color: true,
  brand: false,
  era: false,
};

const priceLabels: Record<Exclude<PriceKey, "any">, string> = {
  u10: "Under \u20A610k",
  p1025: "\u20A610k-\u20A625k",
  o25: "Over \u20A625k",
};

const colors = [
  { name: "Ivory", hex: "#E8E1D2" },
  { name: "Cream", hex: "#E6DFCD" },
  { name: "Sage", hex: "#7C8C63" },
  { name: "Olive", hex: "#6E7A4F" },
  { name: "Indigo", hex: "#3E4A6B" },
  { name: "Camel", hex: "#B08D57" },
  { name: "Forest", hex: "#2F4230" },
  { name: "Rust", hex: "#A6532E" },
  { name: "Grey", hex: "#8B8A83" },
  { name: "Charcoal", hex: "#33322E" },
  { name: "Khaki", hex: "#9A8C63" },
];

const editorialMap: Record<string, string> = {
  Jackets: "Jackets that have already seen a winter or two.",
  Denim: "Denim, worn-in \u2014 the fades are someone else\u2019s miles.",
  Shirts: "Shirts softened by other people\u2019s Sundays.",
  Tees: "Everyday tees, honestly graded.",
  Knitwear: "Knitwear for when the harmattan bites.",
  Trousers: "Trousers with a leg already broken in.",
  Dresses: "Dresses with a life before yours.",
  Skirts: "Skirts that swished somewhere first.",
  Coats: "Coats for harmattan \u2014 one each, no restock.",
  Blazers: "Blazers with a boardroom past.",
  Accessories: "The small things \u2014 one of each.",
};

const facetValues: Record<FacetKey, string[]> = {
  category: [
    "Jackets",
    "Denim",
    "Shirts",
    "Tees",
    "Knitwear",
    "Trousers",
    "Dresses",
    "Skirts",
    "Coats",
    "Blazers",
    "Accessories",
  ],
  size: ["XS", "S", "M", "L", "XL", "OS"],
  condition: ["Excellent", "Good", "Fair"],
  color: colors.map((c) => c.name),
  brand: ["Aria", "Basics", "Bloom", "Field", "Kit", "Line", "Rework", "Wovn"],
  era: ["Vintage", "Y2K", "Workwear", "Minimal"],
};

function correctQuery(q: string) {
  if (!q) return null;
  let changed = false;
  const out = q
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((token) => {
      if (typoMap[token]) {
        changed = true;
        return typoMap[token];
      }
      return token;
    });
  return changed ? out.join(" ") : null;
}

function matchQuery(item: PlpProduct, q: string) {
  const effective = (correctQuery(q) || q || "").toLowerCase().trim();
  if (!effective) return true;
  const hay =
    `${item.name} ${item.category} ${item.color} ${item.condition} ${item.brand} ${item.era} ${item.size}`.toLowerCase();
  return effective.split(/\s+/).every((token) => hay.includes(token));
}

function formatSeconds(sec = 0) {
  const value = Math.max(0, sec);
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function validState(value: string | null): FeedState {
  return value === "results" || value === "no-results" || value === "loading" || value === "error"
    ? value
    : "browse";
}

export default function ShopPage() {
  return (
    <Suspense fallback={<LoadingGrid />}>
      <ShopPlp />
    </Suspense>
  );
}

function ShopPlp() {
  const params = useSearchParams();
  const initialState = validState(params.get("state"));
  const [feedState, setFeedState] = useState<FeedState>(initialState);
  const [query, setQuery] = useState(
    initialState === "no-results" ? params.get("q") || "olife jaket" : params.get("q") || "",
  );
  const [items, setItems] = useState(plpItems);
  const [sort, setSort] = useState<SortKey>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>(() => emptySelection());
  const [price, setPrice] = useState<PriceKey>("any");
  const [openFacets, setOpenFacets] = useState<OpenFacets>(defaultOpenFacets);
  const [visible, setVisible] = useState(12);
  const [wished, setWished] = useState<Record<string, boolean>>({});
  const [notified, setNotified] = useState<Record<string, boolean>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [holdsDismissed, setHoldsDismissed] = useState(false);
  const [toast, setToast] = useState<{ msg: string; until: number } | null>(null);
  const feedStateRef = useRef(feedState);
  const queryRef = useRef(query);
  const tickRef = useRef(0);

  const searchMode = feedState === "results" || feedState === "no-results";
  const browseMode = feedState === "browse";
  const effectiveQuery = feedState === "no-results" ? query || "olife jaket" : query;
  const gridQuery = browseMode ? "" : feedState === "no-results" ? "\u0000nomatch\u0000" : query;

  useEffect(() => {
    feedStateRef.current = feedState;
  }, [feedState]);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      tickRef.current += 1;
      const nextTick = tickRef.current;
      if (feedStateRef.current === "results") {
        if (nextTick === 7) {
          setItems((current) => {
            const idx = current.findIndex(
              (item) => item.state === "available" && matchQuery(item, queryRef.current),
            );
            if (idx < 0) return current;
            const next = [...current];
            next[idx] = { ...next[idx], state: "resOthers", minutes: 5 };
            setToast({
              msg: `\u201C${next[idx].name}\u201D was just reserved by another shopper.`,
              until: nextTick + 6,
            });
            return next;
          });
        }
        if (nextTick === 15) {
          setItems((current) => {
            const idx = current.findIndex((item) => item.state === "resOthers");
            if (idx < 0) return current;
            const next = [...current];
            next[idx] = { ...next[idx], state: "sold" };
            setToast({
              msg: `\u201C${next[idx].name}\u201D just sold \u2014 find something similar.`,
              until: nextTick + 6,
            });
            return next;
          });
        }
      }
      setToast((current) => (current && nextTick >= current.until ? null : current));
      setItems((current) =>
        current.map((item) => {
          if (item.state !== "resYou") return item;
          const next = (item.secondsLeft || 0) - 1;
          return next <= 0
            ? { ...item, state: "available" as ProductState, secondsLeft: undefined }
            : { ...item, secondsLeft: next };
        }),
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredAll = useMemo(
    () =>
      items.filter((item) => {
        if (Object.keys(selection.category).length && !selection.category[item.category])
          return false;
        if (Object.keys(selection.size).length && !selection.size[item.size]) return false;
        if (Object.keys(selection.condition).length && !selection.condition[item.condition])
          return false;
        if (Object.keys(selection.color).length && !selection.color[item.color]) return false;
        if (Object.keys(selection.brand).length && !selection.brand[item.brand]) return false;
        if (Object.keys(selection.era).length && !selection.era[item.era]) return false;
        if (price === "u10" && item.price >= 10000) return false;
        if (price === "p1025" && (item.price < 10000 || item.price > 25000)) return false;
        if (price === "o25" && item.price <= 25000) return false;
        return matchQuery(item, gridQuery);
      }),
    [gridQuery, items, price, selection],
  );

  const matched = filteredAll.filter((item) => item.state !== "sold");
  const rehomedItems = filteredAll.filter((item) => item.state === "sold");
  const sorted = useMemo(() => {
    const arr = [...matched];
    const reduced = (item: PlpProduct) => 1 - item.price / item.original;
    if (sort === "pl") arr.sort((a, b) => a.price - b.price);
    else if (sort === "ph") arr.sort((a, b) => b.price - a.price);
    else if (sort === "reduced") arr.sort((a, b) => reduced(b) - reduced(a));
    else if (sort === "ending") arr.sort((a, b) => endRank(a) - endRank(b));
    else arr.sort((a, b) => a.rank - b.rank);
    return arr;
  }, [matched, sort]);

  const shown = sorted.slice(0, visible);
  const totalCount = matched.length;
  const forcedEmpty = feedState === "no-results";
  const hasResults = totalCount > 0 && !forcedEmpty;
  const showGrid = (browseMode || feedState === "results") && hasResults;
  const showEmpty = forcedEmpty || ((browseMode || feedState === "results") && !hasResults);
  const showLoading = feedState === "loading";
  const showError = feedState === "error";
  const held = items.filter((item) => item.state === "resYou");
  const soonest = held.length ? Math.min(...held.map((item) => item.secondsLeft || 0)) : 0;
  const hasAnyFilter = hasFilters(selection, price);
  const filterCount =
    Object.values(selection).reduce((sum, group) => sum + Object.keys(group).length, 0) +
    (price !== "any" ? 1 : 0);
  const categoryKeys = Object.keys(selection.category);
  const catTitle =
    categoryKeys.length === 1
      ? categoryKeys[0]
      : categoryKeys.length > 1
        ? "Selected pieces"
        : "All pieces";
  const editorialLine =
    categoryKeys.length === 1
      ? editorialMap[categoryKeys[0]]
      : "Every piece is the only one. When it sells, it\u2019s gone for good.";
  const correctedEcho = correctQuery(effectiveQuery);
  const sortDefs: [SortKey, string][] = searchMode
    ? [
        ["newest", "Best match"],
        ["pl", "Price: low to high"],
        ["ph", "Price: high to low"],
        ["reduced", "Recently reduced"],
        ["ending", "Ending holds first"],
      ]
    : [
        ["newest", "Newest in"],
        ["pl", "Price: low to high"],
        ["ph", "Price: high to low"],
        ["reduced", "Recently reduced"],
        ["ending", "Ending holds first"],
      ];
  const sortLabel = sortDefs.find(([key]) => key === sort)?.[1] || sortDefs[0][1];
  const countLabel = searchMode
    ? forcedEmpty
      ? "0 pieces found"
      : totalCount === 1
        ? "1 piece found"
        : `${totalCount} pieces found`
    : totalCount === 1
      ? "1 result"
      : `${totalCount} results`;
  const rescueItems = [...items]
    .filter((item) => item.state === "available" || item.state === "lastone")
    .sort((a, b) => 1 - b.price / b.original - (1 - a.price / a.original))
    .slice(0, 4);

  function toggleSelection(group: FacetKey, value: string) {
    setSelection((current) => {
      const nextGroup = { ...current[group] };
      if (nextGroup[value]) delete nextGroup[value];
      else nextGroup[value] = true;
      return { ...current, [group]: nextGroup };
    });
    setVisible(12);
  }

  function clearAll() {
    setSelection(emptySelection());
    setPrice("any");
    setVisible(12);
  }

  function reserve(id: string) {
    setHoldsDismissed(false);
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, state: "resYou", secondsLeft: 15 * 60 } : item,
      ),
    );
  }

  function release(id: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, state: "available", secondsLeft: undefined } : item,
      ),
    );
  }

  function notify(id: string) {
    setNotified((current) => ({ ...current, [id]: true }));
  }

  function onSearch(value: string) {
    setQuery(value);
    setFeedState(value.trim() ? "results" : "browse");
    setVisible(12);
  }

  const chips = activeChips(selection, price, toggleSelection, (value) => setPrice(value));
  const emptyTitle = searchMode
    ? `No pieces match \u201C${effectiveQuery}\u201D`
    : "No pieces match those filters";
  const emptyBody = searchMode
    ? "Every item is one-of-one, so a specific search can come up empty. Check the spelling, try broader words, or browse what's new."
    : "Every item is one-of-one, so narrow combinations can come up empty. Try widening a filter \u2014 or reset and browse the full rail.";

  return (
    <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 pb-5 max-sm:px-4">
      <div className="px-1 pb-2.5 pt-[18px] text-[12.5px] text-[#9A988F]">
        <Link href="/" className="text-[#9A988F]">
          Home
        </Link>
        <span className="mx-[7px]">/</span>
        <Link href="/shop" className="text-[#9A988F]">
          Shop
        </Link>
        <span className="mx-[7px]">/</span>
        <span className="text-muted-foreground">{searchMode ? "Search" : catTitle}</span>
      </div>

      {browseMode ? (
        <section className="mb-[22px] border-b border-border px-1 pb-5 pt-1.5">
          <div className="mb-2.5 inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-accent [animation:leemPulse_1.8s_ease-in-out_infinite]" />
            <span className="text-[11.5px] font-semibold uppercase tracking-[.2em] text-accent">
              The archive · every piece one-of-one
            </span>
          </div>
          <h1 className="m-0 mb-2.5 font-serif text-[38px] font-medium leading-[1.05] tracking-normal">
            {catTitle}{" "}
            <em className="text-[26px] font-normal text-[#8A887E]">&mdash; {totalCount} pieces</em>
          </h1>
          <p className="m-0 mb-[7px] max-w-[600px] font-serif text-xl italic leading-[1.4] text-[#3D3B35]">
            {editorialLine}
          </p>
          <p className="m-0 max-w-[560px] text-[13.5px] leading-[1.6] text-[#8A887E]">
            Filter by size, condition, price and era. When a piece sells, it&apos;s gone for good.
          </p>
        </section>
      ) : (
        <section className="mb-[22px] border-b border-border px-1 pb-5 pt-1.5">
          <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2">
              <Search className="size-[15px] text-accent" />
              <span className="text-[11.5px] font-semibold uppercase tracking-[.2em] text-accent">
                Search results · every piece one-of-one
              </span>
            </div>
            <button
              className="inline-flex h-[30px] items-center gap-[7px] rounded-full border border-chip-border bg-chip-bg px-2 pl-[13px] text-[12.5px] text-[#4A5540]"
              onClick={() => onSearch("")}
              type="button"
            >
              &ldquo;{effectiveQuery}&rdquo;
              <X className="size-[13px] text-accent" />
            </button>
          </div>
          <h1 className="m-0 mb-2.5 font-serif text-[38px] font-medium leading-[1.05] tracking-normal">
            Results for &ldquo;{effectiveQuery}&rdquo;{" "}
            <em className="text-[26px] font-normal text-[#8A887E]">&mdash; {countLabel}</em>
          </h1>
          {searchMode && !forcedEmpty && correctedEcho && hasResults ? (
            <p className="m-0 text-[13.5px] leading-[1.6] text-muted-foreground">
              Showing results for{" "}
              <button
                className="font-serif text-[15px] italic text-[#5E6E44]"
                onClick={() => onSearch(correctedEcho)}
                type="button"
              >
                {correctedEcho}
              </button>
              . Search instead for{" "}
              <button
                className="underline underline-offset-2"
                onClick={() => setFeedState("results")}
                type="button"
              >
                &ldquo;{effectiveQuery}&rdquo;
              </button>
              .
            </p>
          ) : (
            <p className="m-0 max-w-[560px] text-sm leading-[1.6] text-muted-foreground">
              Narrow by size, condition, price and era. When a piece sells it&apos;s gone for good
              &mdash; reserve before someone else does.
            </p>
          )}
        </section>
      )}

      <div className="grid grid-cols-[248px_1fr] items-start gap-8 max-md:grid-cols-1">
        <aside className="sticky top-24 max-md:hidden">
          <FacetPanel
            clearAll={clearAll}
            hasAnyFilter={hasAnyFilter}
            items={items}
            openFacets={openFacets}
            price={price}
            refineLabel={searchMode ? "Refine" : "Filters"}
            selection={selection}
            setOpenFacets={setOpenFacets}
            setPrice={setPrice}
            toggleSelection={toggleSelection}
          />
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger
                  render={
                    <Button
                      className="hidden h-10 rounded-full border-[1.5px] border-primary bg-card px-4 text-[13px] font-medium text-primary hover:bg-card max-md:inline-flex"
                      variant="outline"
                      type="button"
                    />
                  }
                >
                  <SlidersHorizontal className="size-[15px]" />
                  Filters
                  {hasAnyFilter ? (
                    <span className="inline-flex size-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                      {filterCount}
                    </span>
                  ) : null}
                </SheetTrigger>
                <SheetContent
                  side="left"
                  showCloseButton={false}
                  className="w-[88%] max-w-[380px] gap-0 bg-background p-0"
                >
                  <SheetHeader className="flex-row items-center justify-between border-b border-border px-5 py-[18px]">
                    <SheetTitle className="font-serif text-[22px] font-normal">Filters</SheetTitle>
                    <button
                      aria-label="Close filters"
                      className="flex p-1"
                      onClick={() => setFiltersOpen(false)}
                      type="button"
                    >
                      <X className="size-[22px]" />
                    </button>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-5 py-1">
                    <FacetPanel
                      clearAll={clearAll}
                      hasAnyFilter={hasAnyFilter}
                      items={items}
                      openFacets={openFacets}
                      price={price}
                      refineLabel=""
                      selection={selection}
                      setOpenFacets={setOpenFacets}
                      setPrice={setPrice}
                      toggleSelection={toggleSelection}
                    />
                  </div>
                  <SheetFooter className="flex-row border-t border-border p-3.5 px-5">
                    <Button
                      className="h-[50px] rounded-full border-[1.5px] border-primary bg-transparent px-5 text-sm font-medium text-primary hover:bg-transparent"
                      onClick={clearAll}
                      variant="outline"
                    >
                      Clear
                    </Button>
                    <Button
                      className="h-[50px] flex-1 rounded-full text-[14.5px] font-semibold"
                      onClick={() => setFiltersOpen(false)}
                    >
                      Apply · {totalCount} results
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
              <span className="text-[13px] text-[#8A887E]">{countLabel}</span>
            </div>
            <div className="relative">
              <Button
                className="h-10 rounded-full border border-border bg-card px-4 text-[13px] text-primary hover:bg-card"
                onClick={() => setSortOpen((open) => !open)}
                variant="outline"
              >
                <span className="text-[#8A887E]">Sort:</span>
                <span className="font-medium">{sortLabel}</span>
                <ChevronDown className="size-3.5 text-[#8A887E]" />
              </Button>
              <div
                className={cn(
                  "absolute right-0 top-[46px] z-30 min-w-[210px] rounded-xl border border-border bg-card p-1.5 shadow-[0_20px_50px_rgba(0,0,0,.14)] transition",
                  sortOpen
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-1.5 opacity-0",
                )}
              >
                {sortDefs.map(([key, label]) => (
                  <button
                    key={key}
                    className="flex w-full items-center gap-[9px] bg-transparent px-3.5 py-2.5 text-left font-sans"
                    onClick={() => {
                      setSort(key);
                      setSortOpen(false);
                    }}
                    type="button"
                  >
                    {sort === key ? (
                      <Check className="size-3.5 text-accent" />
                    ) : (
                      <span className="w-3.5" />
                    )}
                    <span
                      className={cn(
                        "text-[13px]",
                        sort === key ? "font-semibold text-primary" : "text-muted-foreground",
                      )}
                    >
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {hasAnyFilter ? (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <button
                  key={`${chip.kind}-${chip.label}`}
                  className="inline-flex h-8 items-center gap-[7px] rounded-full border border-chip-border bg-chip-bg px-2 pl-[13px] text-[12.5px] text-[#4A5540]"
                  onClick={chip.remove}
                  type="button"
                >
                  {chip.label}
                  <X className="size-[13px] text-accent" />
                </button>
              ))}
              <button
                className="ml-1 text-[12.5px] text-[#8A887E] underline underline-offset-2"
                onClick={clearAll}
                type="button"
              >
                Clear all
              </button>
            </div>
          ) : null}

          {showGrid ? (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(224px,1fr))] gap-[18px]">
                {shown.map((product) => (
                  <ProductCard
                    key={product.id}
                    notified={!!notified[product.id]}
                    product={product}
                    release={release}
                    reserve={reserve}
                    setWished={setWished}
                    wished={!!wished[product.id]}
                    notify={notify}
                  />
                ))}
              </div>
              <div className="mt-[30px] flex flex-col items-center gap-3.5">
                <div className="text-[12.5px] text-[#9A988F]">
                  Showing {totalCount} of {items.length} pieces
                </div>
                {totalCount > visible ? (
                  <Button
                    className="h-12 rounded-full border-[1.5px] border-primary bg-transparent px-[30px] text-sm font-medium text-primary hover:bg-transparent"
                    onClick={() => setVisible((value) => value + 9)}
                    variant="outline"
                  >
                    Load more pieces
                  </Button>
                ) : null}
              </div>
              {rehomedItems.length ? <RehomedRail products={rehomedItems} /> : null}
            </>
          ) : null}

          {showEmpty ? (
            <EmptyStatePanel
              anyFilter={hasAnyFilter}
              clearAll={clearAll}
              corrected={correctedEcho}
              emptyBody={emptyBody}
              emptyTitle={emptyTitle}
              rescueItems={rescueItems}
              searchMode={searchMode}
              setQuery={onSearch}
            />
          ) : null}

          {showLoading ? <LoadingGrid /> : null}
          {showError ? (
            <ErrorPanel retry={() => setFeedState("browse")} searchMode={searchMode} />
          ) : null}
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-20 left-4 z-[70] flex max-w-[340px] animate-[leemRise_.3s_ease] items-start gap-[11px] rounded-[14px] border border-border bg-card px-[15px] py-[13px] shadow-[0_20px_50px_rgba(0,0,0,.16)]">
          <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-chip-bg">
            <AlertTriangle className="size-3.5 text-accent" />
          </span>
          <span aria-live="polite" className="flex-1 text-[13px] leading-[1.45]">
            {toast.msg}
          </span>
          <button
            aria-label="Dismiss"
            className="flex shrink-0 p-0.5"
            onClick={() => setToast(null)}
            type="button"
          >
            <X className="size-4 text-[#B4B2A8]" />
          </button>
        </div>
      ) : null}

      {held.length && !holdsDismissed ? (
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 py-3">
          <div className="flex w-full max-w-[720px] items-center gap-3.5 rounded-full bg-[#20261C] py-2.5 pl-5 pr-3 text-white shadow-[0_20px_50px_rgba(0,0,0,.28)]">
            <span className="size-2 shrink-0 rounded-full bg-[#B8CE8E] [animation:leemPulse_1.6s_ease-in-out_infinite]" />
            <span aria-live="polite" className="min-w-0 flex-1 text-[13px] leading-[1.4]">
              You&apos;re holding {held.length === 1 ? "1 piece" : `${held.length} pieces`} &mdash;
              checkout in <strong className="tabular-nums">{formatSeconds(soonest)}</strong> before{" "}
              {held.length === 1 ? "it releases" : "they release"}.
            </span>
            <Button
              className="h-[38px] shrink-0 rounded-full bg-white px-5 text-[13px] font-semibold text-primary hover:bg-white"
              render={<Link href="/checkout" />}
            >
              Checkout
            </Button>
            <button
              aria-label="Dismiss"
              className="flex shrink-0 p-1.5"
              onClick={() => setHoldsDismissed(true)}
              type="button"
            >
              <X className="size-[18px] text-white/70" />
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function FacetPanel({
  clearAll,
  hasAnyFilter,
  items,
  openFacets,
  price,
  refineLabel,
  selection,
  setOpenFacets,
  setPrice,
  toggleSelection,
}: {
  clearAll: () => void;
  hasAnyFilter: boolean;
  items: PlpProduct[];
  openFacets: OpenFacets;
  price: PriceKey;
  refineLabel: string;
  selection: Selection;
  setOpenFacets: React.Dispatch<React.SetStateAction<OpenFacets>>;
  setPrice: (price: PriceKey) => void;
  toggleSelection: (group: FacetKey, value: string) => void;
}) {
  const labels: Record<FacetKey | "price", string> = {
    category: "Category",
    size: "Size",
    condition: "Condition",
    price: "Price",
    color: "Colour",
    brand: "Brand",
    era: "Era / Style",
  };
  const groups: (FacetKey | "price")[] = [
    "category",
    "size",
    "condition",
    "price",
    "color",
    "brand",
    "era",
  ];
  return (
    <>
      {refineLabel ? (
        <div className="mb-4 flex items-center justify-between">
          <span className="font-serif text-xl">{refineLabel}</span>
          {hasAnyFilter ? (
            <button
              className="text-[12.5px] text-[#8A887E] underline underline-offset-2"
              onClick={clearAll}
              type="button"
            >
              Clear all
            </button>
          ) : null}
        </div>
      ) : null}
      {groups.map((group) => {
        const open = openFacets[group];
        return (
          <div className="border-b border-[#ECEBE4] py-1 pb-1.5" key={group}>
            <button
              className="flex w-full items-center justify-between bg-transparent px-0.5 py-3 text-left font-sans"
              onClick={() => setOpenFacets((current) => ({ ...current, [group]: !current[group] }))}
              type="button"
            >
              <span className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
                {labels[group]}
              </span>
              <span className="text-base leading-none text-[#9A988F]">{open ? "\u2212" : "+"}</span>
            </button>
            <div
              className={cn(
                "overflow-hidden transition-[max-height] duration-300",
                open ? "max-h-[460px]" : "max-h-0",
              )}
            >
              <div className="px-0.5 pb-3 pt-0.5">
                {group === "price" ? (
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(priceLabels) as Exclude<PriceKey, "any">[]).map((value) => {
                      const active = price === value;
                      return (
                        <button
                          key={value}
                          className={cn(
                            "min-h-[34px] rounded-full px-3.5 py-[7px] text-[12.5px]",
                            active
                              ? "border-[1.5px] border-primary bg-primary font-semibold text-primary-foreground"
                              : "border border-border bg-card text-muted-foreground",
                          )}
                          onClick={() => setPrice(active ? "any" : value)}
                          type="button"
                        >
                          {priceLabels[value]}
                        </button>
                      );
                    })}
                  </div>
                ) : group === "color" ? (
                  <div className="flex flex-wrap gap-[9px]">
                    {colors.map((color) => {
                      const active = !!selection.color[color.name];
                      const dark = [
                        "Indigo",
                        "Forest",
                        "Charcoal",
                        "Olive",
                        "Rust",
                        "Sage",
                        "Grey",
                        "Khaki",
                        "Camel",
                      ].includes(color.name);
                      return (
                        <button
                          key={color.name}
                          aria-label={color.name}
                          className={cn(
                            "flex size-[30px] items-center justify-center rounded-full p-0",
                            active
                              ? "border-2 border-primary shadow-[0_0_0_2px_#fff_inset]"
                              : "border border-black/15",
                          )}
                          onClick={() => toggleSelection("color", color.name)}
                          style={{ background: color.hex }}
                          title={color.name}
                          type="button"
                        >
                          {active ? (
                            <Check
                              className={cn("size-[13px]", dark ? "text-white" : "text-primary")}
                              strokeWidth={3}
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col gap-[3px]">
                    {facetValues[group].map((value) => {
                      const active = !!selection[group][value];
                      const count = items.filter((item) => item[group] === value).length;
                      return (
                        <button
                          key={value}
                          className="flex items-center gap-2.5 bg-transparent px-0.5 py-[7px] text-left font-sans"
                          onClick={() => toggleSelection(group, value)}
                          type="button"
                        >
                          <span
                            className={cn(
                              "flex size-[18px] shrink-0 items-center justify-center rounded-[5px]",
                              active
                                ? "border-0 bg-primary"
                                : "border-[1.5px] border-[#CFCDC3] bg-card",
                            )}
                          >
                            {active ? (
                              <Check className="size-3 text-white" strokeWidth={3} />
                            ) : null}
                          </span>
                          <span
                            className={cn(
                              "flex-1 text-[13.5px]",
                              active ? "text-primary" : "text-muted-foreground",
                            )}
                          >
                            {value}
                          </span>
                          <span className="text-xs text-[#B4B2A8]">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

function ProductCard({
  notified,
  notify,
  product,
  release,
  reserve,
  setWished,
  wished,
}: {
  notified: boolean;
  notify: (id: string) => void;
  product: PlpProduct;
  release: (id: string) => void;
  reserve: (id: string) => void;
  setWished: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  wished: boolean;
}) {
  const isSold = product.state === "sold";
  const isResOthers = product.state === "resOthers";
  const isResYou = product.state === "resYou";
  const isLast = product.state === "lastone";
  const discount = `-${Math.round((1 - product.price / product.original) * 100)}%`;
  const stock = stockCopy(product);
  // INTEGRATION: Wire checkout CTAs to the shared cart/checkout flow when checkout is approved.
  return (
    <Card
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[14px] p-0 transition-shadow",
        isResOthers ? "border-[#EAE8E0] bg-[#F4F3EF]" : "border-[#EAE8E0] bg-card",
        isResYou ? "border-[1.5px] border-accent" : "border",
      )}
    >
      <div className="relative aspect-[1/1.12] overflow-hidden bg-[linear-gradient(160deg,#ECEBE5,#DFE0D8)]">
        {isResYou ? (
          <Badge className="absolute left-3 top-3 z-[3] rounded-full border border-chip-border bg-chip-bg px-[11px] py-1 text-[10.5px] font-semibold text-[#4A5540] hover:bg-chip-bg">
            In your cart
          </Badge>
        ) : null}
        {isLast ? (
          <Badge className="absolute left-3 top-3 z-[3] rounded-full border border-[#EAD6BE] bg-[#FBF1E6] px-[11px] py-1 text-[10.5px] font-semibold text-[#B0682E] hover:bg-[#FBF1E6]">
            Last one
          </Badge>
        ) : null}
        <button
          aria-label="Save"
          className="absolute right-3 top-3 z-[3] flex size-[34px] items-center justify-center rounded-full border-0 bg-white/90"
          onClick={() =>
            setWished((current) => ({ ...current, [product.id]: !current[product.id] }))
          }
          type="button"
        >
          <Heart className={cn("size-4", wished ? "fill-[#B04A45]" : "fill-none")} />
        </button>
        <Link className="absolute inset-0 block" href={pdpHref(product.id)}>
          <Image
            alt={product.name}
            className={cn(
              "object-cover transition",
              isSold || isResOthers ? "grayscale opacity-55" : "opacity-100",
            )}
            fill
            sizes="(max-width: 768px) 50vw, 224px"
            src={product.image}
          />
        </Link>
        {isSold ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#1B1A17]/20">
            <span className="rounded-full bg-[#1B1A17]/70 px-[18px] py-[7px] text-xs font-semibold uppercase tracking-[.28em] text-white">
              SOLD
            </span>
          </div>
        ) : null}
        {isResOthers ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E2DA] bg-white/90 px-3 py-[5px] text-[11px] font-medium text-muted-foreground">
              <Clock className="size-3" />
              In someone&apos;s cart
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-[9px] p-[13px] pb-[15px]">
        <div>
          <div className="mb-[5px] font-serif text-[11px] tabular-nums text-[#9A988F]">
            &#8470;&nbsp;{String(product.rank + 1).padStart(4, "0")}{" "}
            <span className="text-[#C6C4BB]">·</span>{" "}
            <span className="font-sans text-[9px] uppercase tracking-[.18em] text-[#A7A59B]">
              One of one
            </span>
          </div>
          <Link
            className="mb-[5px] block truncate text-[13.5px] text-primary"
            href={pdpHref(product.id)}
          >
            {product.name}
          </Link>
          <div className="flex items-baseline gap-[7px]">
            <span
              className={cn("text-sm font-semibold", isSold ? "text-[#A7A59B]" : "text-primary")}
            >
              {naira(product.price)}
            </span>
            {!isSold ? (
              <span className="text-xs text-[#A7A59B] line-through">{naira(product.original)}</span>
            ) : null}
            {!isSold ? (
              <span className="text-[11.5px] font-semibold text-accent">{discount}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-full border border-border px-[9px] py-[3px] text-[11px] text-muted-foreground">
            {product.size} · {product.color}
          </span>
          <span className="inline-flex items-center gap-[5px] rounded-full border border-chip-border bg-chip-bg px-[9px] py-[3px] text-[11px] text-[#4A5540]">
            <span className="size-1.5 rounded-full bg-accent" />
            {product.condition}
          </span>
        </div>
        <div className="flex items-center gap-[7px]">
          <span
            className={cn(
              "inline-block size-2 rounded-full",
              stock.pulse ? "[animation:leemPulse_1.8s_ease-in-out_infinite]" : "",
            )}
            style={{ background: stock.dot }}
          />
          <span
            aria-live="polite"
            className="text-xs font-medium tabular-nums"
            style={{ color: stock.color }}
          >
            {stock.label}
          </span>
        </div>
        {product.state === "available" || isLast ? (
          <Button
            className="h-[42px] w-full rounded-full text-[13px] font-semibold"
            onClick={() => reserve(product.id)}
          >
            Reserve · hold 15 min
          </Button>
        ) : null}
        {isResYou ? (
          <div className="flex flex-col gap-2">
            {/* INTEGRATION: Wire this CTA to the shared cart/checkout flow when checkout is built. */}
            <Button
              className="h-[42px] w-full rounded-full text-[13px] font-semibold"
              render={<Link href="/checkout" />}
            >
              Checkout now
            </Button>
            <button
              className="self-center text-xs text-[#8A887E] underline underline-offset-2"
              onClick={() => release(product.id)}
              type="button"
            >
              Release hold
            </button>
          </div>
        ) : null}
        {isResOthers ? (
          <Button
            className={cn(
              "h-[42px] w-full rounded-full border-[1.5px] text-[13px] font-medium",
              notified
                ? "border-chip-border bg-chip-bg text-[#4A5540] hover:bg-chip-bg"
                : "border-primary bg-transparent text-primary hover:bg-transparent",
            )}
            onClick={() => notify(product.id)}
            variant="outline"
          >
            {notified ? "We'll let you know" : "Notify me if it frees up"}
          </Button>
        ) : null}
        {isSold ? (
          <Link
            className="flex h-[42px] w-full items-center justify-center rounded-full border-[1.5px] border-primary text-[13px] font-medium text-primary"
            href="/shop"
          >
            Find something similar
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

function EmptyStatePanel({
  anyFilter,
  clearAll,
  corrected,
  emptyBody,
  emptyTitle,
  rescueItems,
  searchMode,
  setQuery,
}: {
  anyFilter: boolean;
  clearAll: () => void;
  corrected: string | null;
  emptyBody: string;
  emptyTitle: string;
  rescueItems: PlpProduct[];
  searchMode: boolean;
  setQuery: (query: string) => void;
}) {
  return (
    <>
      <Empty className="rounded-[14px] border border-dashed border-chip-border bg-[#F7F9F2] px-[30px] py-14">
        <EmptyHeader>
          <EmptyMedia className="flex size-16 items-center justify-center rounded-full bg-[#EAF0DE] text-accent">
            <Search className="size-7" />
          </EmptyMedia>
          <EmptyTitle className="font-serif text-[26px] font-normal">{emptyTitle}</EmptyTitle>
          <EmptyDescription className="max-w-[400px] text-[13.5px] text-muted-foreground">
            {emptyBody}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {searchMode && corrected ? (
            <div className="text-sm text-muted-foreground">
              Did you mean{" "}
              <button
                className="font-serif text-base italic font-medium text-[#5E6E44]"
                onClick={() => setQuery(corrected)}
                type="button"
              >
                {corrected}
              </button>
              ?
            </div>
          ) : null}
          <div className="mt-1 flex flex-wrap justify-center gap-2.5">
            {anyFilter ? (
              <Button
                className="h-[46px] rounded-full border-[1.5px] border-primary bg-transparent px-6 text-sm font-medium text-primary hover:bg-transparent"
                onClick={clearAll}
                variant="outline"
              >
                Clear filters
              </Button>
            ) : null}
            <Button
              className="h-[46px] rounded-full px-6 text-sm font-medium"
              render={<Link href="/#justin" />}
            >
              Shop New In
            </Button>
          </div>
        </EmptyContent>
      </Empty>
      <div className="mt-[34px]">
        <div className="mb-4 flex items-center gap-2">
          <span className="size-2 rounded-full bg-accent [animation:leemPulse_1.8s_ease-in-out_infinite]" />
          <span className="text-[11.5px] font-semibold uppercase tracking-[.2em] text-accent">
            Popular right now
          </span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(224px,1fr))] gap-[18px]">
          {rescueItems.map((product) => (
            <ProductCard
              key={product.id}
              notified={false}
              notify={() => undefined}
              product={product}
              release={() => undefined}
              reserve={() => undefined}
              setWished={() => undefined}
              wished={false}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(224px,1fr))] gap-[18px]">
      {Array.from({ length: 9 }).map((_, index) => (
        <Card className="overflow-hidden rounded-[14px] border-[#EEECE5] bg-card p-0" key={index}>
          <Skeleton className="aspect-[1/1.12] rounded-none bg-[linear-gradient(90deg,#ECEBE5_0%,#F3F5EC_50%,#ECEBE5_100%)] bg-[length:640px_100%] [animation:leemShimmer_1.4s_linear_infinite]" />
          <div className="flex flex-col gap-2.5 p-[13px]">
            <Skeleton className="h-[11px] w-[78%] rounded-full bg-[linear-gradient(90deg,#ECEBE5,#F3F5EC,#ECEBE5)] bg-[length:320px_100%] [animation:leemShimmer_1.4s_linear_infinite]" />
            <Skeleton className="h-[11px] w-[42%] rounded-full bg-[linear-gradient(90deg,#ECEBE5,#F3F5EC,#ECEBE5)] bg-[length:320px_100%] [animation:leemShimmer_1.4s_linear_infinite]" />
            <Skeleton className="mt-1 h-9 w-full rounded-full bg-[linear-gradient(90deg,#EEF1E6,#F5F7EF,#EEF1E6)] bg-[length:320px_100%] [animation:leemShimmer_1.4s_linear_infinite]" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function ErrorPanel({ retry, searchMode }: { retry: () => void; searchMode: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-[14px] border border-[#EAE8E0] bg-card px-[30px] py-12 text-center">
      <div className="flex size-[60px] items-center justify-center rounded-full bg-[#F6E9E4]">
        <AlertTriangle className="size-[26px] text-[#B04A45]" />
      </div>
      <div className="font-serif text-2xl">
        {searchMode ? "Search is unavailable" : "Couldn't load the catalogue"}
      </div>
      <div className="max-w-[360px] text-[13.5px] leading-[1.55] text-[#8A887E]">
        Something interrupted the connection. Your held pieces are safe &mdash; nothing was
        released.
      </div>
      <Button className="mt-1 h-[46px] rounded-full px-6 text-sm font-medium" onClick={retry}>
        <RotateCcw className="size-[15px]" />
        Try again
      </Button>
    </div>
  );
}

function RehomedRail({ products }: { products: PlpProduct[] }) {
  return (
    <section className="mt-[46px] border-t border-border pt-[30px]">
      <div className="mb-1.5 flex flex-wrap items-baseline gap-3.5">
        <h2 className="m-0 font-serif text-[28px] font-medium italic">Rehomed</h2>
        <span className="text-[11px] uppercase tracking-[.28em] text-[#8A887E]">
          {products.length} gone for good
        </span>
      </div>
      <p className="m-0 mb-[22px] max-w-[520px] text-[13.5px] leading-[1.6] text-[#8A887E]">
        Pieces that already found their person. Kept on the wall as proof they existed &mdash; none
        of them will be restocked.
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5">
        {products.map((product) => (
          <Link className="block" href={pdpHref(product.id)} key={product.id}>
            <div className="relative aspect-[1/1.12] overflow-hidden rounded-[10px] bg-[linear-gradient(160deg,#ECEBE5,#DFE0D8)]">
              <Image
                alt={product.name}
                className="object-cover opacity-60 grayscale"
                fill
                sizes="150px"
                src={product.image}
              />
              <span className="absolute left-2.5 top-2.5 rounded-sm bg-background/85 px-[7px] py-0.5 font-serif text-[11px] tabular-nums text-primary">
                &#8470;&nbsp;{String(product.rank + 1).padStart(4, "0")}
              </span>
              <div className="absolute inset-0 flex items-end bg-[linear-gradient(180deg,rgba(0,0,0,0)_55%,rgba(27,26,23,.42))] p-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-[.26em] text-white">
                  Rehomed
                </span>
              </div>
            </div>
            <div className="mt-2 truncate text-[12.5px] text-muted-foreground">{product.name}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function stockCopy(product: PlpProduct) {
  if (product.state === "lastone")
    return { dot: "#C88A3A", pulse: true, color: "#B0682E", label: "1 left · last one" };
  if (product.state === "resYou")
    return {
      dot: "#7C8C63",
      pulse: false,
      color: "#4A5540",
      label: `Held · ${formatSeconds(product.secondsLeft)}`,
    };
  if (product.state === "resOthers")
    return {
      dot: "#B7B3A6",
      pulse: false,
      color: "#8A887E",
      label: `Frees up in ~${product.minutes || 5}m`,
    };
  if (product.state === "sold")
    return { dot: "#C6584F", pulse: false, color: "#A7A59B", label: "Sold" };
  return { dot: "#B7B3A6", pulse: false, color: "#8A887E", label: "Available" };
}

function endRank(product: PlpProduct) {
  if (product.state === "resYou") return product.secondsLeft || 0;
  if (product.state === "resOthers") return 100000 + (product.minutes || 5) * 60;
  if (product.state === "lastone") return 500000 + product.rank;
  if (product.state === "sold") return 9000000 + product.rank;
  return 1000000 + product.rank;
}

function hasFilters(selection: Selection, price: PriceKey) {
  return Object.values(selection).some((group) => Object.keys(group).length > 0) || price !== "any";
}

function activeChips(
  selection: Selection,
  price: PriceKey,
  toggleSelection: (group: FacetKey, value: string) => void,
  setPrice: (price: PriceKey) => void,
) {
  const chips: { kind: string; label: string; remove: () => void }[] = [];
  (Object.keys(selection) as FacetKey[]).forEach((group) => {
    Object.keys(selection[group]).forEach((value) => {
      chips.push({ kind: group, label: value, remove: () => toggleSelection(group, value) });
    });
  });
  if (price !== "any")
    chips.push({ kind: "price", label: priceLabels[price], remove: () => setPrice("any") });
  return chips;
}
