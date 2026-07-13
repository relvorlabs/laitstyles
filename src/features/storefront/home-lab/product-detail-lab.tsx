"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { inventoryLabel, money, type Product, productSlug, relatedProducts } from "./data";
import { IconArrow, IconHeart } from "./icons";
import { ProductCard } from "./product-card";
import { useStorefront } from "./storefront-context";

const conditionRank: Record<string, number> = { "A+": 10, A: 8, "B+": 6 };
const conditionWord: Record<string, string> = { "A+": "Like new", A: "Excellent", "B+": "Good" };

function Gallery({ product }: { product: Product }) {
  const s = useStorefront();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const images = product.images;
  const count = images.length;
  const go = (i: number) => setIndex((i + count) % count);
  return (
    <div className="grid gap-3 lg:grid-cols-[88px_minmax(0,1fr)]">
      <div
        className="order-2 flex gap-3 overflow-x-auto pb-1 lg:order-1 lg:flex-col"
        aria-label="Product media"
      >
        {images.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            aria-label={`View image ${i + 1}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className={`relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-[8px] border ${i === index ? "border-foreground" : "border-border"}`}
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      <div className="order-1 min-w-0 lg:order-2">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] border border-border bg-surface-sunken">
          <AnimatePresence initial={false}>
            <motion.div
              key={index}
              className="absolute inset-0"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.34, ease: [0.22, 0.8, 0.24, 1] }}
            >
              <img
                src={images[index]}
                alt={`${product.name}, view ${index + 1}`}
                fetchPriority={index === 0 ? "high" : undefined}
                loading={index === 0 ? "eager" : "lazy"}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </motion.div>
          </AnimatePresence>

          {count > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => go(index - 1)}
                className="absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface-raised/90 backdrop-blur"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m15 5-7 7 7 7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => go(index + 1)}
                className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface-raised/90 backdrop-blur"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m9 5 7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => s.openImageViewerFor(product.id, index)}
            aria-label="Open image viewer"
            className="absolute bottom-4 right-4 flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface-raised/90 px-4 text-sm font-semibold backdrop-blur hover:border-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            View details
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-4 text-xs uppercase tracking-[0.13em] text-muted-foreground">
          <span aria-live="polite" className="tabular-nums">
            {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </span>
          <span>The exact piece shown</span>
        </div>
      </div>
    </div>
  );
}

function MobileBuyBar({
  product,
  visible,
  canAdd,
  onAdd,
}: {
  product: Product;
  visible: boolean;
  canAdd: boolean;
  onAdd: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
          initial={reduce ? { opacity: 0 } : { y: 100 }}
          animate={reduce ? { opacity: 1 } : { y: 0 }}
          exit={reduce ? { opacity: 0 } : { y: 100 }}
          transition={{ duration: 0.28, ease: [0.22, 0.8, 0.24, 1] }}
        >
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
                {product.inventory === "one-of-one" ? "Exact piece" : "Price"}
              </p>
              <p className="mt-1 font-semibold tabular-nums">{money(product.price)}</p>
            </div>
            <button
              type="button"
              onClick={onAdd}
              disabled={!canAdd}
              className="button button-primary ml-auto flex-1"
              style={{ borderRadius: 999 }}
            >
              {product.status === "available" ? "Add this piece" : product.status}
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function InfoRow({
  title,
  body,
  onClick,
  icon,
}: {
  title: string;
  body: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-3 text-left"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-sunken">
        {icon}
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{body}</span>
      </span>
      <span className="ml-auto" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

function Accordion({
  title,
  children,
  open,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details className="group" open={open}>
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4">
        <span className="text-lg font-semibold">{title}</span>
        <span className="text-2xl" aria-hidden="true">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
      </summary>
      <div className="max-w-3xl pb-6 leading-7 text-muted-foreground">{children}</div>
    </details>
  );
}

function ProductDetailApp({ product }: { product: Product }) {
  const s = useStorefront();
  const [showBar, setShowBar] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const { setSelectedVariant, setQuickError } = s;

  // Reset the shared variant selection when landing on a new PDP.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset once per product mount.
  useEffect(() => {
    setSelectedVariant(null);
    setQuickError("");
  }, [product.id, setSelectedVariant, setQuickError]);

  // Reveal the mobile buy bar once the main purchase action scrolls out of view.
  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting), {
      rootMargin: "0px 0px -8px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const isVariant = product.inventory === "variant";
  const isOneOfOne = product.inventory === "one-of-one";
  const available = product.status === "available";
  const canAdd = available && (!isVariant || Boolean(s.selectedVariant));
  const filled = conditionRank[product.condition] ?? 6;

  const handleAdd = () => {
    if (isVariant && !s.selectedVariant) {
      setQuickError("Choose an available size before adding this piece.");
      return;
    }
    s.addToCart(product.id);
    s.open("cartDrawer");
  };

  const onShare = async () => {
    const url =
      typeof window !== "undefined" ? window.location.href : `/products/${productSlug(product)}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: product.name, url });
      } else {
        await navigator.clipboard?.writeText(url);
        s.showToast("Link copied to clipboard.");
      }
    } catch {
      // Share cancelled or unavailable; no-op.
    }
  };

  const related = relatedProducts(product, 4);

  return (
    <>
      <main id="main" className="lst-catalogue">
        <nav
          className="mx-auto max-w-[1500px] px-4 py-5 text-sm text-muted-foreground sm:px-6 lg:px-8"
          aria-label="Breadcrumb"
        >
          <ol className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <li>
              <Link className="hover:text-foreground" href="/">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link className="hover:text-foreground" href="/products">
                Shop
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link className="hover:text-foreground" href="/products">
                {product.category}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="truncate text-foreground" aria-current="page">
              {product.name}
            </li>
          </ol>
        </nav>

        <section className="mx-auto grid max-w-[1500px] gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(390px,0.82fr)] lg:px-8 xl:gap-16">
          <div className="min-w-0">
            <Gallery product={product} />
          </div>

          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[16px] border border-border bg-surface-raised p-5 sm:p-7 lg:p-8">
              <div className="flex flex-wrap items-center gap-2">
                {isOneOfOne ? (
                  <span className="badge badge-solid">1 of 1</span>
                ) : (
                  <span className="badge badge-sage">{inventoryLabel(product.inventory)}</span>
                )}
                <span className="badge">{available ? "Available" : product.status}</span>
                <span className="mono ml-auto text-muted-foreground">
                  LS-{product.id.toUpperCase()}
                </span>
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
                  <p className="mt-1 text-sm text-muted-foreground">
                    Recommended fit: {product.fit}
                  </p>
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
                  <div
                    className="mt-3 flex gap-1"
                    aria-label={`Condition grade ${product.condition}`}
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${i < filled ? "bg-brand-sage" : "bg-border"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {isOneOfOne ? (
                <div className="mt-4 rounded-[9px] border border-border bg-surface-sunken p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand-sage text-white">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
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
                    {product.variants.map((v, i) => {
                      const disabled =
                        i === (product.variants?.length ?? 0) - 1 && product.stock < 5;
                      const selected = s.selectedVariant === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            s.setSelectedVariant(v);
                            setQuickError("");
                          }}
                          className={`inline-flex min-h-11 min-w-12 items-center justify-center rounded-[8px] border px-3 text-[13px] ${
                            selected
                              ? "border-foreground bg-primary text-primary-foreground"
                              : "border-border bg-control text-foreground"
                          } disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-muted-foreground disabled:line-through`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 min-h-[19px] text-[13px] text-destructive" role="alert">
                    {s.quickError}
                  </p>
                </div>
              ) : null}

              <div className="mt-7 grid grid-cols-2 gap-3">
                <button type="button" className="button" onClick={() => s.open("measureModal")}>
                  Measurements
                </button>
                <button type="button" className="button" onClick={() => s.open("conditionModal")}>
                  Condition guide
                </button>
              </div>

              <div ref={anchorRef} className="mt-6 grid gap-3">
                <button
                  type="button"
                  className="button button-primary w-full"
                  disabled={!canAdd}
                  onClick={handleAdd}
                  style={{ borderRadius: 999, minHeight: 54 }}
                >
                  {available
                    ? isOneOfOne
                      ? "Add this exact piece"
                      : "Add to bag"
                    : product.status}
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="button flex items-center justify-center gap-2"
                    aria-pressed={s.saved.has(product.id)}
                    onClick={() => s.toggleSaved(product.id)}
                  >
                    <IconHeart filled={s.saved.has(product.id)} style={{ width: 18, height: 18 }} />
                    {s.saved.has(product.id) ? "Saved" : "Save"}
                  </button>
                  <button
                    type="button"
                    className="button flex items-center justify-center gap-2"
                    onClick={onShare}
                  >
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
                  </button>
                </div>
              </div>

              <div className="mt-7 divide-y divide-[color:var(--line)] border-y border-border">
                <InfoRow
                  title="Delivery from Lagos"
                  body="Lagos 1–2 days · Nationwide 2–5 days"
                  onClick={() => s.open("deliveryModal")}
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
                <InfoRow
                  title="7-day returns"
                  body="Condition and tags must remain unchanged"
                  onClick={() =>
                    s.showToast(
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
                <InfoRow
                  title="Inspected and cleaned"
                  body="Condition checked by hand"
                  onClick={() => s.open("conditionModal")}
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
        </section>

        {product.flaw !== "None" ? (
          <section className="border-y border-border bg-surface-sunken">
            <div className="mx-auto max-w-[1500px] px-4 py-12 sm:px-6 lg:px-8">
              <p className="eyebrow text-brand-sage-strong">Disclosed detail</p>
              <h2 className="mt-3 max-w-2xl font-serif text-[clamp(1.6rem,3vw,2.4rem)] font-medium leading-tight">
                {product.flaw}.
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                Every flaw is inspected, photographed and disclosed before purchase — this piece
                remains stable and wearable.{" "}
                <button
                  type="button"
                  className="underline underline-offset-4"
                  onClick={() => s.openImageViewerFor(product.id, product.images.length - 1)}
                >
                  View the detail image
                </button>
              </p>
            </div>
          </section>
        ) : null}

        <section className="border-y border-border bg-surface-panel">
          <div className="mx-auto max-w-[1500px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
              <div>
                <p className="eyebrow text-brand-sage-strong">Details</p>
                <h2 className="mt-4 font-serif text-[clamp(2rem,4vw,3.4rem)] font-medium leading-[0.98] tracking-[-0.03em]">
                  Useful information, without the usual guesswork.
                </h2>
              </div>
              <div className="divide-y divide-[color:var(--line)] border-y border-border">
                <Accordion title="Description" open>
                  {product.material} in {product.style.toLowerCase()} styling. Tagged size{" "}
                  {product.size} with a recommended fit of {product.fit}. The exact piece pictured
                  is the one delivered.
                </Accordion>
                <Accordion title="Delivery">
                  Lagos delivery is typically 1–2 business days. Other states are typically 2–5
                  business days. Tracking is shared after dispatch.
                </Accordion>
                <Accordion title="Returns">
                  Return requests are accepted within 7 days of delivery. The item must remain
                  unworn, unwashed and returned with the original Laitstyles tag attached.
                </Accordion>
                <Accordion title="Care">
                  Keep on a wide hanger away from direct heat. Follow standard care for{" "}
                  {product.material.toLowerCase()}. Do not machine wash or soak unless labelled
                  safe.
                </Accordion>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1500px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow text-brand-sage-strong">Reviews</p>
              <h2 className="mt-4 font-serif text-[clamp(1.9rem,4vw,3.4rem)] font-medium leading-[0.98] tracking-[-0.03em]">
                {isOneOfOne ? "No reviews for this exact piece." : "No reviews yet."}
              </h2>
              <p className="mt-5 max-w-md leading-7 text-muted-foreground">
                {isOneOfOne
                  ? "It is one of one, so nobody else has owned this listing."
                  : "Be the first to share how this piece fits and wears."}
              </p>
            </div>
            <div className="flex min-h-64 flex-col justify-between rounded-[16px] border border-border bg-surface-raised p-6 sm:p-8">
              <div>
                <p className="eyebrow text-muted-foreground">What can still help</p>
                <h3 className="mt-4 font-serif text-3xl leading-tight">
                  Need another measurement or a closer photo?
                </h3>
                <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
                  Ask before buying. We can confirm a measurement, show a detail more closely or
                  help compare the fit.
                </p>
              </div>
              <button
                type="button"
                className="button mt-8 w-fit"
                onClick={() => s.open("supportModal")}
              >
                Ask about this piece
              </button>
            </div>
          </div>
        </section>

        {related.length ? (
          <section id="related" className="border-t border-border bg-surface-sunken">
            <div className="mx-auto max-w-[1500px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                  <p className="eyebrow text-brand-sage-strong">Keep looking</p>
                  <h2 className="mt-4 font-serif text-[clamp(2rem,5vw,3.4rem)] font-medium leading-[0.95] tracking-[-0.03em]">
                    Pieces with a similar point of view.
                  </h2>
                </div>
                <Link
                  href="/products"
                  className="inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4"
                >
                  View all
                  <IconArrow style={{ width: 18, height: 18 }} />
                </Link>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {related.map((rp) => (
                  <ProductCard
                    key={rp.id}
                    product={rp}
                    isSaved={s.saved.has(rp.id)}
                    onQuickView={s.openQuick}
                    onSave={s.toggleSaved}
                    onAdd={s.addToCart}
                  />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <MobileBuyBar product={product} visible={showBar} canAdd={canAdd} onAdd={handleAdd} />
    </>
  );
}

export function ProductDetailLab({
  product,
  fontClassName,
}: {
  product: Product;
  fontClassName: string;
}) {
  void fontClassName;
  return <ProductDetailApp product={product} />;
}
