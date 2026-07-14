"use client";

import { type FormEvent, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
    <Button
      ref={ref}
      className={`category-card h-auto w-full justify-start rounded-none p-0 text-left reveal${
        visible ? " visible" : ""
      }`}
      type="button"
      onClick={onClick}
      variant="ghost"
    >
      <span className="contents">
        <img src={image} alt={`${name} collection`} loading="lazy" />
        <span className="category-label">
          <span>
            <span>{count} pieces</span>
            <span className="block text-[inherit]">
              <span className="contents">{name}</span>
            </span>
          </span>
          <span className="category-arrow">
            <IconArrow />
          </span>
        </span>
      </span>
    </Button>
  );
}

function OneCard({
  product,
  featured,
  onClick,
}: {
  product: Product;
  featured: boolean;
  onClick: () => void;
}) {
  const { ref, visible } = useReveal<HTMLButtonElement>();

  return (
    <Button
      ref={ref}
      className={`one-card h-auto w-full justify-start rounded-none p-0 text-left ${
        featured ? "featured " : ""
      }reveal${visible ? " visible" : ""}`}
      type="button"
      onClick={onClick}
      variant="ghost"
    >
      <span className="contents">
        <img src={product.images[0]} alt={product.name} loading="lazy" />
        <span className="one-info">
          <span>
            <span className="eyebrow">1 of 1</span>
            <span className="block text-[inherit]">{product.name}</span>
            <span className="block">
              Size {product.size} · Grade {product.condition}
            </span>
          </span>
          <span className="one-price price">{money(product.price)}</span>
        </span>
      </span>
    </Button>
  );
}

function HomeApp() {
  const storefront = useStorefront();
  const [view, setView] = useState<"home" | "shop">("home");

  const openShop = useCallback(
    (options: { category?: string; collection?: string | null }) => {
      storefront.applyShop(options);
      setView("shop");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [storefront],
  );

  const goHome = useCallback(() => {
    setView("home");
    storefront.closeAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [storefront]);

  const newIn = useMemo(() => products.filter((product) => product.new).slice(0, 8), []);
  const oneEdit = useMemo(
    () =>
      products
        .filter(
          (product) => product.inventory === "one-of-one" && product.status === "available",
        )
        .slice(0, 5),
    [],
  );
  const underRail = useMemo(
    () =>
      products
        .filter((product) => product.price < 25000 && product.status === "available")
        .slice(0, 8),
    [],
  );
  const essentialRail = useMemo(
    () =>
      products
        .filter((product) => product.condition === "A+" && product.status === "available")
        .slice(0, 8),
    [],
  );

  const {
    state: { holdSecondsByProduct },
    actions: { holdProduct, releaseProduct },
  } = useStorefrontExperience();

  const cardHandlers = {
    onQuickView: storefront.openQuick,
    onSave: storefront.toggleSaved,
    onAdd: (id: string) => {
      releaseProduct(id);
      storefront.addToCart(id);
    },
    onHold: (id: string) => {
      const product = productById(id);
      if (product) holdProduct(productToHoldable(product));
    },
    onRelease: releaseProduct,
  };

  const renderCards = (list: Product[]) =>
    list.map((product) => (
      <ProductCard
        {...cardHandlers}
        holdSeconds={holdSecondsByProduct[product.id] ?? null}
        isHeld={product.id in holdSecondsByProduct}
        isSaved={storefront.saved.has(product.id)}
        key={product.id}
        product={product}
      />
    ));

  const onNewsletterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email =
      new FormData(event.currentTarget).get("email")?.toString().trim().toLowerCase() ?? "";
    storefront.setNewsletterStatus(
      email === "duplicate@example.com"
        ? "This email is already on the drop list."
        : "You are on the list. Watch your inbox for the next drop.",
    );
  };

  const trustItems = [
    {
      title: "Individually inspected",
      body: "Condition checked before listing",
      onClick: () => storefront.open("conditionModal"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-[21px] w-[21px] [stroke-width:1.35]">
          <path d="m9 12 2 2 4-5" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      ),
    },
    {
      title: "Measured by hand",
      body: "Fit guidance beyond the size tag",
      onClick: () => storefront.open("measureModal"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-[21px] w-[21px] [stroke-width:1.35]">
          <path d="M4 8h16M7 5v6M11 5v3M15 5v6M19 5v3M4 16h16" />
        </svg>
      ),
    },
    {
      title: "Exact-item photography",
      body: "Front, back, details and labels",
      onClick: () => storefront.openViewer(0),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-[21px] w-[21px] [stroke-width:1.35]">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="m21 15-5-5L5 19" />
        </svg>
      ),
    },
    {
      title: "Flaws clearly disclosed",
      body: "No surprises when the piece arrives",
      onClick: () => storefront.open("conditionModal"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-[21px] w-[21px] [stroke-width:1.35]">
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.3 3.7 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
        </svg>
      ),
    },
    {
      title: "Nationwide delivery",
      body: "Estimate before checkout",
      onClick: () => storefront.open("deliveryModal"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-[21px] w-[21px] [stroke-width:1.35]">
          <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      ),
    },
  ];

  return (
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
                    Premium pre-owned fashion selected for condition, fit and lasting wardrobe value.
                  </p>
                  <div className="hero-actions">
                    <Button className="button" type="button" onClick={() => openShop({ collection: "new" })}>
                      Shop new arrivals
                    </Button>
                    <Button
                      className="button button-secondary"
                      type="button"
                      onClick={() => storefront.openQuick("p4")}
                      variant="outline"
                    >
                      Shop the blazer
                    </Button>
                  </div>
                </div>
              </article>

              <div className="hero-side">
                <Button
                  className="hero-card h-auto w-full justify-start rounded-none p-0 text-left"
                  type="button"
                  onClick={() => storefront.openQuick("p2")}
                  variant="ghost"
                >
                  <span className="contents">
                    <img src={HERO_CARD_2} alt="Woman styled in a full denim outfit in a studio" />
                    <span className="hero-card-info">
                      <span>
                        <span className="eyebrow">One of one</span>
                        <span className="block text-[inherit]">Vintage Levi’s 501</span>
                        <span className="block">Size 32 · Grade A · ₦28,500</span>
                      </span>
                      <span className="hero-card-arrow"><IconArrow /></span>
                    </span>
                  </span>
                </Button>

                <Button
                  className="hero-card h-auto w-full justify-start rounded-none p-0 text-left"
                  type="button"
                  onClick={() => storefront.openQuick("p16")}
                  variant="ghost"
                >
                  <span className="contents">
                    <img src={HERO_CARD_16} alt="Man wearing a neutral winter jacket in a studio" />
                    <span className="hero-card-info">
                      <span>
                        <span className="eyebrow">Archive outerwear</span>
                        <span className="block text-[inherit]">Leather Harrington</span>
                        <span className="block">Size M · Grade B+ · ₦56,000</span>
                      </span>
                      <span className="hero-card-arrow"><IconArrow /></span>
                    </span>
                  </span>
                </Button>
              </div>
            </div>
          </section>

          <section id="newSection" className="section">
            <div className="shell">
              <RevealDiv className="section-head">
                <div>
                  <span className="eyebrow">Just added</span>
                  <h2 className="section-title">
                    New in <span className="serif"><em>this week</em></span>
                  </h2>
                  <p className="section-subtitle">
                    A tight edit of fresh finds, photographed and measured individually.
                  </p>
                </div>
                <Button className="section-link" type="button" onClick={() => openShop({ collection: "new" })} variant="link">
                  Shop all new arrivals <IconArrow />
                </Button>
              </RevealDiv>
              <div id="newGrid" className="product-grid">{renderCards(newIn)}</div>
            </div>
          </section>

          <section className="category-section section">
            <div className="shell">
              <RevealDiv className="section-head">
                <div>
                  <span className="eyebrow">Browse the rack</span>
                  <h2 className="section-title">
                    Shop by <span className="serif"><em>category</em></span>
                  </h2>
                </div>
                <Button className="section-link" type="button" onClick={() => openShop({})} variant="link">
                  View every product <IconArrow />
                </Button>
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
                    The one-of-one <span className="serif"><em>edit</em></span>
                  </h2>
                  <p className="section-subtitle">
                    Unique garments with no planned restock. What you see is the exact piece you receive.
                  </p>
                </div>
                <Button className="section-link" type="button" onClick={() => openShop({ collection: "one-of-one" })} variant="link">
                  View the full edit <IconArrow />
                </Button>
              </RevealDiv>
              <div id="oneEdit" className="one-edit">
                {oneEdit.map((product, index) => (
                  <OneCard
                    key={product.id}
                    product={product}
                    featured={index === 0}
                    onClick={() => storefront.openQuick(product.id)}
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
                    Under <span className="serif"><em>₦25,000</em></span>
                  </h2>
                </div>
                <Button className="section-link" type="button" onClick={() => openShop({ collection: "under-25" })} variant="link">
                  Shop the price edit <IconArrow />
                </Button>
              </RevealDiv>
              <div id="underRail" className="product-rail">{renderCards(underRail)}</div>
            </div>
          </section>

          <section className="section rail-section">
            <div className="shell">
              <RevealDiv className="section-head">
                <div>
                  <span className="eyebrow">Minimal wear · maximum rotation</span>
                  <h2 className="section-title">
                    Grade A+ <span className="serif"><em>essentials</em></span>
                  </h2>
                </div>
                <Button className="section-link" type="button" onClick={() => openShop({ collection: "grade-a-plus" })} variant="link">
                  Shop Grade A+ <IconArrow />
                </Button>
              </RevealDiv>
              <div id="essentialRail" className="product-rail">{renderCards(essentialRail)}</div>
            </div>
          </section>

          <section className="border-y border-[var(--line)] bg-[var(--bone-2)]">
            <div className="shell grid grid-cols-5 max-[860px]:grid-cols-2 max-[600px]:grid-cols-1">
              {trustItems.map((item, index, list) => (
                <Button
                  key={item.title}
                  type="button"
                  onClick={item.onClick}
                  variant="ghost"
                  className={`min-h-[130px] flex-col items-start justify-between rounded-none border-r border-[var(--line)] bg-transparent px-[22px] py-[25px] text-left max-[600px]:border-r-0${
                    index === list.length - 1
                      ? " border-r-0 max-[860px]:col-span-2 max-[860px]:border-t max-[860px]:border-t-[var(--line)]"
                      : ""
                  }${index % 2 === 1 ? " max-[860px]:border-r-0" : ""}${
                    index === 0 ? "" : " max-[600px]:border-t max-[600px]:border-t-[var(--line)]"
                  }`}
                >
                  {item.icon}
                  <span className="mt-[5px] block text-[0.73rem] text-[var(--muted)]">
                    <strong className="text-[0.9rem] text-[var(--ink)]">{item.title}</strong>
                    <span className="mt-[5px] block">{item.body}</span>
                  </span>
                </Button>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="shell">
              <RevealDiv className="section-head">
                <div>
                  <span className="eyebrow">Keep exploring</span>
                  <h2 className="section-title">
                    Recently <span className="serif"><em>viewed</em></span>
                  </h2>
                </div>
                <Button className="section-link" type="button" onClick={() => storefront.open("savedDrawer")} variant="link">
                  Open saved items <IconArrow />
                </Button>
              </RevealDiv>
              <div id="recentRail" className="product-rail">
                {storefront.recentList.length ? (
                  renderCards(storefront.recentList)
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
                <Button className="button button-primary" type="submit">
                  Join the list
                </Button>
                <p id="newsletterStatus" className="newsletter-status" aria-live="polite">
                  {storefront.newsletterStatus}
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
                <Button className="h-auto p-0" type="button" onClick={goHome} variant="link">
                  Home
                </Button>
                <span>/</span>
                <span id="shopBreadcrumb">{storefront.breadcrumb}</span>
              </div>
              <h1 id="shopTitle" className="shop-title">
                {storefront.title.title} <em>{storefront.title.em}</em>
              </h1>
              <div className="shop-meta">
                <p id="shopDescription">{storefront.title.description}</p>
                <span id="shopHeroCount" className="eyebrow">
                  {storefront.filteredList.length} products
                </span>
              </div>
            </div>
          </section>

          <section className="shop-controls">
            <div className="shell">
              <div className="shop-controls-inner">
                <div className="filter-actions">
                  <Button className="control-button" type="button" onClick={() => storefront.open("filterDrawer")} variant="outline">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path d="M4 6h16M7 12h10M10 18h4" />
                    </svg>
                    Filters <span className="mono">{storefront.activeFilterChips.length}</span>
                  </Button>
                  <Button className="control-button" type="button" onClick={() => storefront.open("sortSheet")} variant="outline">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path d="M8 7h10M8 12h7M8 17h4M4 5v14" />
                    </svg>
                    Sort
                  </Button>
                </div>
                <span id="resultCount" className="result-count">
                  {storefront.filteredList.length} products
                </span>
              </div>
              {storefront.activeFilterChips.length > 0 ? (
                <div id="activeFilters" className="active-filters">
                  {storefront.activeFilterChips.map((chip) => (
                    <Button
                      key={`${chip.type}-${chip.value ?? chip.label}`}
                      className="filter-chip"
                      type="button"
                      onClick={() => storefront.removeFilter(chip.type, chip.value)}
                      variant="secondary"
                    >
                      {chip.label} ×
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section className="shop-grid-wrap">
            <div className="shell">
              {storefront.filteredList.length ? (
                <div id="shopGrid" className="shop-grid">{renderCards(storefront.filteredList)}</div>
              ) : (
                <div id="emptyState" className="empty-state">
                  <h2>No pieces match this edit.</h2>
                  <p>Clear one or more filters to return to the full rack.</p>
                  <Button className="button button-primary" type="button" onClick={storefront.clearFilters}>
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export function StorefrontLab({ fontClassName }: { fontClassName: string }) {
  void fontClassName;
  return <HomeApp />;
}
