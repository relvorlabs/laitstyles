"use client";

import { FavouriteIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { StorefrontAccountMenu } from "@/components/layout/storefront-account-menu";
import { StorefrontCartSheet } from "@/components/layout/storefront-cart-sheet";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandMark } from "./brand-mark";
import { IconClose, IconSearch } from "./icons";
import { useStorefront } from "./storefront-context";

const MOBILE_FEATURE =
  "https://images.pexels.com/photos/31959038/pexels-photo-31959038.jpeg?auto=compress&cs=tinysrgb&w=900";

export type NavShop = (opts: { category?: string; collection?: string | null }) => void;

// Shared utility bar + sticky header + mobile-nav drawer. Navigation intent is supplied
// by the host route (homepage toggles its in-page shop view; /products filters/links),
// while the search/saved/cart controls use the shared storefront context.
export function SiteHeader({
  onNavShop,
  onGoHome,
  onNavNew,
}: {
  onNavShop: NavShop;
  onGoHome: () => void;
  onNavNew: () => void;
}) {
  const s = useStorefront();
  // BLOCKER 2-3N-01: utility bar + header layout converted to Tailwind. Kept as shared
  // classes: `shell`, `utility-dismiss`/`icon-button`/`menu-button` (intrinsic SVG sizing),
  // `brand*`, and the overlay/drawer/mobile-nav/mobile-feature classes below.
  const navBtn =
    "relative border-0 bg-transparent py-3 after:absolute after:bottom-[5px] after:left-0 after:right-full after:h-px after:bg-[var(--ink)] after:content-[''] after:[transition:right_220ms_var(--ease)] hover:after:right-0";
  const headerCls =
    "sticky top-0 z-[60] border-b border-b-transparent backdrop-blur-[16px] [background:color-mix(in_srgb,var(--bone)_92%,transparent)] [transition:border-color_220ms_var(--ease),box-shadow_220ms_var(--ease)]" +
    (s.headerScrolled ? " border-b-[var(--line)] shadow-[0_8px_28px_rgba(25,26,23,0.06)]" : "");
  return (
    <>
      {!s.utilityDismissed && (
        <div
          id="utility"
          className="bg-[var(--ink)] text-[0.77rem] tracking-[0.02em] text-[var(--bone)]"
        >
          <div className="shell relative flex min-h-[34px] items-center justify-center gap-5 max-[600px]:justify-start max-[600px]:pr-10 max-[600px]:text-[0.7rem]">
            <p className="m-0">
              Nationwide delivery · Every piece inspected · New drop every Friday
            </p>
            <button
              className="utility-dismiss"
              type="button"
              aria-label="Dismiss announcement"
              onClick={s.dismissUtility}
            >
              <IconClose />
            </button>
          </div>
        </div>
      )}

      <header id="header" className={headerCls}>
        <div className="shell grid min-h-[var(--header-h)] grid-cols-[1fr_auto_1fr] items-center gap-6">
          <nav
            className="flex items-center gap-[22px] text-[0.86rem] max-[860px]:hidden"
            aria-label="Primary navigation"
          >
            <button className={navBtn} type="button" onClick={onNavNew}>
              New arrivals
            </button>
            <button
              className={navBtn}
              type="button"
              onClick={() => onNavShop({ category: "Women" })}
            >
              Women
            </button>
            <button className={navBtn} type="button" onClick={() => onNavShop({ category: "Men" })}>
              Men
            </button>
            <button
              className={navBtn}
              type="button"
              onClick={() => onNavShop({ category: "Unisex" })}
            >
              Unisex
            </button>
            <button
              className={navBtn}
              type="button"
              onClick={() => onNavShop({ collection: "one-of-one" })}
            >
              One-of-one
            </button>
          </nav>

          <button
            className="icon-button menu-button"
            type="button"
            aria-label="Open navigation"
            onClick={() => s.open("mobileMenu")}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <button className="brand" type="button" aria-label="Laitstyles home" onClick={onGoHome}>
            <span className="brand-symbol">
              <BrandMark />
            </span>
            <span className="brand-word">LAITSTYLES</span>
          </button>

          <div className="flex items-center justify-self-end gap-1 max-[600px]:gap-0">
            <button
              className="icon-button"
              type="button"
              aria-label="Search products"
              onClick={() => s.open("searchModal")}
            >
              <IconSearch />
            </button>
            <button
              className="icon-button relative max-[600px]:size-10"
              type="button"
              aria-label={`Saved items, ${s.saved.size}`}
              onClick={() => s.open("savedDrawer")}
            >
              <HugeiconsIcon aria-hidden="true" icon={FavouriteIcon} size={19} strokeWidth={1.6} />
              {s.saved.size > 0 ? (
                <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-[var(--sage)]" />
              ) : null}
            </button>
            <ThemeToggle className="max-[600px]:hidden" />
            <StorefrontAccountMenu />
            <StorefrontCartSheet className="max-[600px]:size-10" />
          </div>
        </div>
      </header>

      {/* Mobile navigation */}
      <div
        id="mobileMenu"
        className={`overlay${s.openId === "mobileMenu" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        onClick={(e) => e.target === e.currentTarget && s.closeAll()}
      >
        <aside className="drawer">
          <div className="drawer-head">
            <div className="brand">
              <span className="brand-symbol">
                <BrandMark />
              </span>
              <span className="brand-word">LAITSTYLES</span>
            </div>
            <button
              className="close-button"
              type="button"
              aria-label="Close navigation"
              onClick={s.closeAll}
            >
              <IconClose />
            </button>
          </div>
          <nav className="mobile-nav" aria-label="Mobile navigation">
            <button type="button" onClick={() => onNavShop({ collection: "new" })}>
              New arrivals <span>→</span>
            </button>
            <button type="button" onClick={() => onNavShop({ category: "Women" })}>
              Women <span>→</span>
            </button>
            <button type="button" onClick={() => onNavShop({ category: "Men" })}>
              Men <span>→</span>
            </button>
            <button type="button" onClick={() => onNavShop({ category: "Unisex" })}>
              Unisex <span>→</span>
            </button>
            <button type="button" onClick={() => onNavShop({ collection: "one-of-one" })}>
              One-of-one <span>→</span>
            </button>
            <button type="button" onClick={() => onNavShop({})}>
              Shop all <span>→</span>
            </button>
          </nav>
          <button className="mobile-feature" type="button" onClick={() => s.openQuick("p5")}>
            <img src={MOBILE_FEATURE} alt="Man in graphic streetwear" />
            <p>Vintage sportswear edit →</p>
          </button>
          <div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-4 min-[601px]:hidden">
            <span className="text-xs text-[var(--muted)]">Appearance</span>
            <ThemeToggle />
          </div>
        </aside>
      </div>
    </>
  );
}

// Shared footer. Nav links defer to the host route; care/labelling links open shared
// modals via context.
export function SiteFooter({ onNavShop }: { onNavShop: NavShop }) {
  const s = useStorefront();
  // BLOCKER 2-3N-01: footer layout converted to Tailwind. Shared classes kept: `shell`,
  // `footer-brand` (carries the enlarged brand-symbol/word overrides) and `footer-links`
  // (styles its button/anchor children).
  const h3 =
    "mb-[18px] mt-0 font-mono text-[0.68rem] font-medium uppercase leading-none tracking-[0.1em] text-[rgba(243,240,232,0.56)]";
  return (
    <footer className="bg-[var(--ink)] pb-[30px] pt-[70px] text-[var(--bone)]">
      <div className="shell">
        <div className="grid grid-cols-[1.25fr_repeat(3,0.75fr)] gap-[50px] max-[1100px]:grid-cols-[1.2fr_repeat(3,1fr)] max-[860px]:grid-cols-2 max-[600px]:grid-cols-1">
          <div>
            <div className="footer-brand">
              <span className="brand-symbol">
                <BrandMark />
              </span>
              <span className="brand-word">LAITSTYLES</span>
            </div>
            <p className="max-w-[28rem] text-[0.85rem] text-[rgba(243,240,232,0.6)]">
              Curated premium pre-owned fashion, selected for condition, fit and real wardrobe
              value.
            </p>
          </div>
          <div>
            <h3 className={h3}>Shop</h3>
            <div className="footer-links">
              <button type="button" onClick={() => onNavShop({ collection: "new" })}>
                New arrivals
              </button>
              <button type="button" onClick={() => onNavShop({ category: "Women" })}>
                Women
              </button>
              <button type="button" onClick={() => onNavShop({ category: "Men" })}>
                Men
              </button>
              <button type="button" onClick={() => onNavShop({ collection: "one-of-one" })}>
                One-of-one
              </button>
            </div>
          </div>
          <div>
            <h3 className={h3}>Customer care</h3>
            <div className="footer-links">
              <button type="button" onClick={() => s.open("deliveryModal")}>
                Delivery and returns
              </button>
              <button type="button" onClick={() => s.open("conditionModal")}>
                Condition guide
              </button>
              <button type="button" onClick={() => s.open("measureModal")}>
                Measurements
              </button>
              <button type="button" onClick={() => s.open("authModal")}>
                Brand labelling
              </button>
            </div>
          </div>
          <div>
            <h3 className={h3}>Follow</h3>
            <div className="footer-links">
              <button type="button" aria-label="Instagram placeholder">
                Instagram
              </button>
              <button type="button" aria-label="TikTok placeholder">
                TikTok
              </button>
              <button type="button" onClick={() => s.open("supportModal")}>
                Contact
              </button>
            </div>
          </div>
        </div>
        <div className="mt-16 flex flex-wrap justify-between gap-5 border-t border-[rgba(243,240,232,0.15)] pt-[22px] text-[0.72rem] text-[rgba(243,240,232,0.5)] max-[600px]:grid">
          <span>© 2026 Laitstyles</span>
          <span>Nigeria · NGN ₦</span>
          <span>Privacy · Terms</span>
        </div>
      </div>
    </footer>
  );
}
