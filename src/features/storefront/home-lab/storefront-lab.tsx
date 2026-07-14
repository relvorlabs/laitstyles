"use client";

import { type FormEvent, useCallback, useMemo, useState } from "react";
import { useStorefrontExperience } from "@/features/storefront/shared/storefront-experience-provider";
import {
  homeCategories,
  money,
  type Product,
  productById,
  products,
  productToHoldable,
} from "./data";
import { IconArrow } from "./icons";
import { ProductCard } from "./product-card";
import { RevealDiv, useReveal } from "./reveal";
import { useStorefront } from "./storefront-context";

const HERO_MAIN =
  "https://images.pexels.com/photos/18173611/pexels-photo-18173611.jpeg?auto=compress&cs=tinysrgb&w=1800";
const HERO_CARD_2 =
  "https://images.pexels.com/photos/28174872/pexels-photo-28174872.jpeg?auto=compress&cs=tinysrgb&w=900";
const HERO_CARD_16 =
  "https://images.pexels.com/photos/26936525/pexels-photo-26936525.jpeg?auto=compress&cs=tinysrgb&w=900";

function CategoryCard({
  name,
  image,
  count,
  onClick,
}: {
  name: string;
  image: string;
  count: number;
  onClick: () => void;
}) {
  const { ref, visible } = useReveal<HTMLButtonElement>();
  return (
    <button
      ref={ref}
      className={`category-card reveal${visible ? " visible" : ""}`}
      type="button"
      onClick={onClick}
    >
      <img src={image} alt={`${name} collection`} loading="lazy" />
      <div className="category-label">
        <div>
          <span>{count} pieces</span>
          <h3>{name}</h3>
        </div>
        <span className="category-arrow">
          <IconArrow />
        </span>
      </div>
    </button>
  );
}

function OneCard({ p, featured, onClick }: { p: Product; featured: boolean; onClick: () => void }) {
  const { ref, visible } = useReveal<HTMLButtonElement>();
  return (
    <button
      ref={ref}
      className={`one-card ${featured ? "featured " : ""}reveal${visible ? " visible" : ""}`}
      type="button"
      onClick={onClick}
    >
      <img src={p.images[0]} alt={p.name} loading="lazy" />
      <div className="one-info">
        <div>
          <span className="eyebrow">1 of 1</span>
          <h3>{p.name}</h3>
          <p>
            Size {p.size} · Grade {p.condition}
          </p>
        </div>
        <span className="one-price price">{money(p.price)}</span>
      </div>
    </button>
  );
}

function HomeApp() {
  const s = useStorefront();
  const [view, setView] = useState<"home" | "shop">("home");

  const openShop = useCallback(
    (opts: { category?: string; collection?: string | null }) => {
      s.applyShop(opts);
      setView("shop");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [s],
  );
  const goHome = useCallback(() => {
    setView("home");
    s.closeAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [s]);
  const scrollNew = useCallback(() => {
    if (view !== "home") goHome();
    window.setTimeout(
      () => document.getElementById("newSection")?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  }, [view, goHome]);

  const newIn = useMemo(() => products.filter((p) => p.new).slice(0, 8), []);
  const oneEdit = useMemo(
    () =>
      products.filter((p) => p.inventory === "one-of-one" && p.status === "available").slice(0, 5),
    [],
  );
  const underRail = useMemo(
    () => products.filter((p) => p.price < 25000 && p.status === "available").slice(0, 8),
    [],
  );
  const essentialRail = useMemo(
    () => products.filter((p) => p.condition === "A+" && p.status === "available").slice(0, 8),
    [],
  );

  const {
    state: { holdSecondsByProduct },
    actions: { holdProduct, releaseProduct },
  } = useStorefrontExperience();
  const cardHandlers = {
    onQuickView: s.openQuick,
    onSave: s.toggleSaved,
    // Add to bag supersedes an active hold, then commits to the cart.
    onAdd: (id: string) => {
      releaseProduct(id);
      s.addToCart(id);
    },
    onHold: (id: string) => {
      const product = productById(id);
      if (product) holdProduct(productToHoldable(product));
    },
    onRelease: releaseProduct,
  };
  const renderCards = (list: Product[]) =>
    list.map((p) => (
      <ProductCard
        key={p.id}
        product={p}
        isSaved={s.saved.has(p.id)}
        isHeld={p.id in holdSecondsByProduct}
        holdSeconds={holdSecondsByProduct[p.id] ?? null}
        {...cardHandlers}
      />
    ));

  const onNewsletterSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email")?.toString().trim().toLowerCase() ?? "";
    s.setNewsletterStatus(
      email === "duplicate@example.com"
        ? "This email is already on the drop list."
        : "You are on the list. Watch your inbox for the next drop.",
    );
  };

  return (
    <>
      <main id="main">
        {view === "home" ? (
          <div id="homeView" className="home-view view-enter">
            <section className="hero">
              <div className="shell hero-grid">
                <article className="hero-main">
                  <img
                    src={HERO_MAIN}
                    alt="Woman wearing a beige longline blazer and shorts in a warm studio setting"
                    fetchPriority="high"
                  />
                  <div className="hero-copy">
                    <span className="eyebrow">Drop 07 · Tailored pieces</span>
                    <h1 className="hero-title">
                      Wear it now. <em>Keep it longer.</em>
                    </h1>
                    <p>
                      Premium pre-owned fashion selected for condition, fit and lasting wardrobe
                      value.
                    </p>
                    <div className="hero-actions">
                      <button
                        className="button"
                        type="button"
                        onClick={() => openShop({ collection: "new" })}
                      >
                        Shop new arrivals
                      </button>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => s.openQuick("p4")}
                      >
                        Shop the blazer
                      </button>
                    </div>
                  </div>
                </article>

                <div className="hero-side">
                  <button className="hero-card" type="button" onClick={() => s.openQuick("p2")}>
                    <img src={HERO_CARD_2} alt="Woman styled in a full denim outfit in a studio" />
                    <div className="hero-card-info">
                      <div>
                        <span className="eyebrow">One of one</span>
                        <h2>Vintage Levi’s 501</h2>
                        <p>Size 32 · Grade A · ₦28,500</p>
                      </div>
                      <span className="hero-card-arrow">
                        <IconArrow />
                      </span>
                    </div>
                  </button>

                  <button className="hero-card" type="button" onClick={() => s.openQuick("p16")}>
                    <img src={HERO_CARD_16} alt="Man wearing a neutral winter jacket in a studio" />
                    <div className="hero-card-info">
                      <div>
                        <span className="eyebrow">Archive outerwear</span>
                        <h2>Leather Harrington</h2>
                        <p>Size M · Grade B+ · ₦56,000</p>
                      </div>
                      <span className="hero-card-arrow">
                        <IconArrow />
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </section>

            <section id="newSection" className="section">
              <div className="shell">
                <RevealDiv className="section-head">
                  <div>
                    <span className="eyebrow">Just added</span>
                    <h2 className="section-title">
                      New in{" "}
                      <span className="serif">
                        <em>this week</em>
                      </span>
                    </h2>
                    <p className="section-subtitle">
                      A tight edit of fresh finds, photographed and measured individually.
                    </p>
                  </div>
                  <button
                    className="section-link"
                    type="button"
                    onClick={() => openShop({ collection: "new" })}
                  >
                    Shop all new arrivals
                    <IconArrow />
                  </button>
                </RevealDiv>
                <div id="newGrid" className="product-grid">
                  {renderCards(newIn)}
                </div>
              </div>
            </section>

            <section className="category-section section">
              <div className="shell">
                <RevealDiv className="section-head">
                  <div>
                    <span className="eyebrow">Browse the rack</span>
                    <h2 className="section-title">
                      Shop by{" "}
                      <span className="serif">
                        <em>category</em>
                      </span>
                    </h2>
                  </div>
                  <button className="section-link" type="button" onClick={() => openShop({})}>
                    View every product
                    <IconArrow />
                  </button>
                </RevealDiv>
                <div id="categoryGrid" className="category-grid">
                  {homeCategories.map(([name, image, count]) => (
                    <CategoryCard
                      key={name}
                      name={name}
                      image={image}
                      count={count}
                      onClick={() => openShop({ category: name })}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="section">
              <div className="shell">
                <RevealDiv className="section-head">
                  <div>
                    <span className="eyebrow">Exact item photographed</span>
                    <h2 className="section-title">
                      The one-of-one{" "}
                      <span className="serif">
                        <em>edit</em>
                      </span>
                    </h2>
                    <p className="section-subtitle">
                      Unique garments with no planned restock. What you see is the exact piece you
                      receive.
                    </p>
                  </div>
                  <button
                    className="section-link"
                    type="button"
                    onClick={() => openShop({ collection: "one-of-one" })}
                  >
                    View the full edit
                    <IconArrow />
                  </button>
                </RevealDiv>
                <div id="oneEdit" className="one-edit">
                  {oneEdit.map((p, i) => (
                    <OneCard
                      key={p.id}
                      p={p}
                      featured={i === 0}
                      onClick={() => s.openQuick(p.id)}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="section rail-section">
              <div className="shell">
                <RevealDiv className="section-head">
                  <div>
                    <span className="eyebrow">Smart wardrobe buys</span>
                    <h2 className="section-title">
                      Under{" "}
                      <span className="serif">
                        <em>₦25,000</em>
                      </span>
                    </h2>
                  </div>
                  <button
                    className="section-link"
                    type="button"
                    onClick={() => openShop({ collection: "under-25" })}
                  >
                    Shop the price edit
                    <IconArrow />
                  </button>
                </RevealDiv>
                <div id="underRail" className="product-rail">
                  {renderCards(underRail)}
                </div>
              </div>
            </section>

            <section className="section rail-section">
              <div className="shell">
                <RevealDiv className="section-head">
                  <div>
                    <span className="eyebrow">Minimal wear · maximum rotation</span>
                    <h2 className="section-title">
                      Grade A+{" "}
                      <span className="serif">
                        <em>essentials</em>
                      </span>
                    </h2>
                  </div>
                  <button
                    className="section-link"
                    type="button"
                    onClick={() => openShop({ collection: "grade-a-plus" })}
                  >
                    Shop Grade A+
                    <IconArrow />
                  </button>
                </RevealDiv>
                <div id="essentialRail" className="product-rail">
                  {renderCards(essentialRail)}
                </div>
              </div>
            </section>

            {/* BLOCKER 2-3N-01: trust strip → Tailwind (data-driven; nth-child borders per index). */}
            <section className="border-y border-[var(--line)] bg-[var(--bone-2)]">
              <div className="shell grid grid-cols-5 max-[860px]:grid-cols-2 max-[600px]:grid-cols-1">
                {[
                  {
                    title: "Individually inspected",
                    body: "Condition checked before listing",
                    onClick: () => s.open("conditionModal"),
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="h-[21px] w-[21px] [stroke-width:1.35]"
                      >
                        <path d="m9 12 2 2 4-5" />
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    ),
                  },
                  {
                    title: "Measured by hand",
                    body: "Fit guidance beyond the size tag",
                    onClick: () => s.open("measureModal"),
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="h-[21px] w-[21px] [stroke-width:1.35]"
                      >
                        <path d="M4 8h16M7 5v6M11 5v3M15 5v6M19 5v3M4 16h16" />
                      </svg>
                    ),
                  },
                  {
                    title: "Exact-item photography",
                    body: "Front, back, details and labels",
                    onClick: () => s.openViewer(0),
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="h-[21px] w-[21px] [stroke-width:1.35]"
                      >
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <circle cx="9" cy="10" r="2" />
                        <path d="m21 15-5-5L5 19" />
                      </svg>
                    ),
                  },
                  {
                    title: "Flaws clearly disclosed",
                    body: "No surprises when the piece arrives",
                    onClick: () => s.open("conditionModal"),
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="h-[21px] w-[21px] [stroke-width:1.35]"
                      >
                        <path d="M12 9v4M12 17h.01" />
                        <path d="M10.3 3.7 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
                      </svg>
                    ),
                  },
                  {
                    title: "Nationwide delivery",
                    body: "Estimate before checkout",
                    onClick: () => s.open("deliveryModal"),
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="h-[21px] w-[21px] [stroke-width:1.35]"
                      >
                        <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" />
                        <circle cx="7" cy="18" r="2" />
                        <circle cx="18" cy="18" r="2" />
                      </svg>
                    ),
                  },
                ].map((t, i, arr) => (
                  <button
                    key={t.title}
                    type="button"
                    onClick={t.onClick}
                    className={`flex min-h-[130px] flex-col justify-between border-r border-[var(--line)] bg-transparent px-[22px] py-[25px] max-[600px]:border-r-0${
                      i === arr.length - 1
                        ? " border-r-0 max-[860px]:col-span-2 max-[860px]:border-t max-[860px]:border-t-[var(--line)]"
                        : ""
                    }${i % 2 === 1 ? " max-[860px]:border-r-0" : ""}${
                      i === 0 ? "" : " max-[600px]:border-t max-[600px]:border-t-[var(--line)]"
                    }`}
                  >
                    {t.icon}
                    <span className="mt-[5px] block text-[0.73rem] text-[var(--muted)]">
                      <strong className="text-[0.9rem]">{t.title}</strong>
                      <span className="mt-[5px] block text-[0.73rem] text-[var(--muted)]">
                        {t.body}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="section">
              <div className="shell">
                <RevealDiv className="section-head">
                  <div>
                    <span className="eyebrow">Keep exploring</span>
                    <h2 className="section-title">
                      Recently{" "}
                      <span className="serif">
                        <em>viewed</em>
                      </span>
                    </h2>
                  </div>
                  <button
                    className="section-link"
                    type="button"
                    onClick={() => s.open("savedDrawer")}
                  >
                    Open saved items
                    <IconArrow />
                  </button>
                </RevealDiv>
                <div id="recentRail" className="product-rail">
                  {s.recentList.length ? (
                    renderCards(s.recentList)
                  ) : (
                    <div className="search-empty" style={{ gridColumn: "1/-1" }}>
                      Products you inspect will appear here.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="newsletter-band">
              <div className="shell newsletter-inner">
                <div>
                  <span className="eyebrow">Drop alerts</span>
                  <h2 className="newsletter-title">
                    See the best pieces <em>before they go.</em>
                  </h2>
                </div>
                <form id="newsletterForm" className="newsletter-form" onSubmit={onNewsletterSubmit}>
                  <div className="field">
                    <label htmlFor="newsletterEmail">Email address</label>
                    <input
                      id="newsletterEmail"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@example.com"
                    />
                  </div>
                  <button className="button button-primary" type="submit">
                    Join the list
                  </button>
                  <p id="newsletterStatus" className="newsletter-status" aria-live="polite">
                    {s.newsletterStatus}
                  </p>
                </form>
              </div>
            </section>
          </div>
        ) : (
          <div id="shopView" className="shop-view view-enter">
            <section className="shop-hero">
              <div className="shell">
                <div className="shop-kicker">
                  <button type="button" onClick={goHome}>
                    Home
                  </button>
                  <span>/</span>
                  <span id="shopBreadcrumb">{s.breadcrumb}</span>
                </div>
                <h1 id="shopTitle" className="shop-title">
                  {s.title.title} <em>{s.title.em}</em>
                </h1>
                <div className="shop-meta">
                  <p id="shopDescription">{s.title.description}</p>
                  <span id="shopHeroCount" className="eyebrow">
                    {s.filteredList.length} products
                  </span>
                </div>
              </div>
            </section>

            <section className="shop-controls">
              <div className="shell">
                <div className="shop-controls-inner">
                  <div className="filter-actions">
                    <button
                      className="control-button"
                      type="button"
                      onClick={() => s.open("filterDrawer")}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M4 6h16M7 12h10M10 18h4" />
                      </svg>
                      Filters <span className="mono">{s.activeFilterChips.length}</span>
                    </button>
                    <button
                      className="control-button"
                      type="button"
                      onClick={() => s.open("sortSheet")}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M8 7h10M8 12h7M8 17h4M4 5v14" />
                      </svg>
                      Sort
                    </button>
                  </div>
                  <span id="resultCount" className="result-count">
                    {s.filteredList.length} products
                  </span>
                </div>
                {s.activeFilterChips.length > 0 && (
                  <div id="activeFilters" className="active-filters">
                    {s.activeFilterChips.map((chip) => (
                      <button
                        key={`${chip.type}-${chip.value ?? chip.label}`}
                        className="filter-chip"
                        type="button"
                        onClick={() => s.removeFilter(chip.type, chip.value)}
                      >
                        {chip.label} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="shop-grid-wrap">
              <div className="shell">
                {s.filteredList.length ? (
                  <div id="shopGrid" className="shop-grid">
                    {renderCards(s.filteredList)}
                  </div>
                ) : (
                  <div id="emptyState" className="empty-state">
                    <h2>No pieces match this edit.</h2>
                    <p>Clear one or more filters to return to the full rack.</p>
                    <button
                      className="button button-primary"
                      type="button"
                      onClick={s.clearFilters}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  );
}

export function StorefrontLab({ fontClassName }: { fontClassName: string }) {
  void fontClassName;
  return <HomeApp />;
}
