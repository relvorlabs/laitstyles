"use client";

import { FavouriteIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { StorefrontAccountMenu } from "@/components/layout/storefront-account-menu";
import { StorefrontCartSheet } from "@/components/layout/storefront-cart-sheet";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { BrandMark } from "./brand-mark";
import { IconClose, IconSearch } from "./icons";
import { useStorefront } from "./storefront-context";

const MOBILE_FEATURE =
  "https://images.pexels.com/photos/31959038/pexels-photo-31959038.jpeg?auto=compress&cs=tinysrgb&w=900";

export type NavShop = (opts: { category?: string; collection?: string | null }) => void;

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
  const navBtn =
    "relative h-auto rounded-none border-0 bg-transparent px-0 py-3 text-[0.86rem] after:absolute after:bottom-[5px] after:left-0 after:right-full after:h-px after:bg-[var(--ink)] after:content-[''] after:[transition:right_220ms_var(--ease)] hover:bg-transparent hover:after:right-0";
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
            <Button
              className="utility-dismiss"
              type="button"
              aria-label="Dismiss announcement"
              onClick={s.dismissUtility}
              size="icon-sm"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
        </div>
      )}

      <header id="header" className={headerCls}>
        <div className="shell grid min-h-[var(--header-h)] grid-cols-[1fr_auto_1fr] items-center gap-6">
          <nav
            className="flex items-center gap-[22px] text-[0.86rem] max-[860px]:hidden"
            aria-label="Primary navigation"
          >
            <Button className={navBtn} type="button" onClick={onNavNew} variant="ghost">
              New arrivals
            </Button>
            <Button
              className={navBtn}
              type="button"
              onClick={() => onNavShop({ category: "Women" })}
              variant="ghost"
            >
              Women
            </Button>
            <Button
              className={navBtn}
              type="button"
              onClick={() => onNavShop({ category: "Men" })}
              variant="ghost"
            >
              Men
            </Button>
            <Button
              className={navBtn}
              type="button"
              onClick={() => onNavShop({ category: "Unisex" })}
              variant="ghost"
            >
              Unisex
            </Button>
            <Button
              className={navBtn}
              type="button"
              onClick={() => onNavShop({ collection: "one-of-one" })}
              variant="ghost"
            >
              One-of-one
            </Button>
          </nav>

          <Button
            className="icon-button menu-button"
            type="button"
            aria-label="Open navigation"
            onClick={() => s.open("mobileMenu")}
            size="icon-lg"
            variant="ghost"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </Button>

          <Button
            className="brand h-auto rounded-none p-0"
            type="button"
            aria-label="Laitstyles home"
            onClick={onGoHome}
            variant="ghost"
          >
            <span className="brand-symbol">
              <BrandMark />
            </span>
            <span className="brand-word">LAITSTYLES</span>
          </Button>

          <div className="flex items-center justify-self-end gap-1 max-[600px]:gap-0">
            <Button
              className="icon-button"
              type="button"
              aria-label="Search products"
              onClick={() => s.open("searchModal")}
              size="icon-lg"
              variant="ghost"
            >
              <IconSearch />
            </Button>
            <Button
              className="icon-button relative max-[600px]:size-10"
              type="button"
              aria-label={`Saved items, ${s.saved.size}`}
              onClick={() => s.open("savedDrawer")}
              size="icon-lg"
              variant="ghost"
            >
              <HugeiconsIcon aria-hidden="true" icon={FavouriteIcon} size={19} strokeWidth={1.6} />
              {s.saved.size > 0 ? (
                <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-[var(--sage)]" />
              ) : null}
            </Button>
            <ThemeToggle className="max-[600px]:hidden" />
            <StorefrontAccountMenu />
            <StorefrontCartSheet className="max-[600px]:size-10" />
          </div>
        </div>
      </header>

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
            <Button
              className="close-button"
              type="button"
              aria-label="Close navigation"
              onClick={s.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <nav className="mobile-nav" aria-label="Mobile navigation">
            <Button type="button" onClick={() => onNavShop({ collection: "new" })} variant="ghost">
              New arrivals <span>→</span>
            </Button>
            <Button type="button" onClick={() => onNavShop({ category: "Women" })} variant="ghost">
              Women <span>→</span>
            </Button>
            <Button type="button" onClick={() => onNavShop({ category: "Men" })} variant="ghost">
              Men <span>→</span>
            </Button>
            <Button type="button" onClick={() => onNavShop({ category: "Unisex" })} variant="ghost">
              Unisex <span>→</span>
            </Button>
            <Button
              type="button"
              onClick={() => onNavShop({ collection: "one-of-one" })}
              variant="ghost"
            >
              One-of-one <span>→</span>
            </Button>
            <Button type="button" onClick={() => onNavShop({})} variant="ghost">
              Shop all <span>→</span>
            </Button>
          </nav>
          <Button
            className="mobile-feature h-auto w-full justify-start rounded-none p-0 text-left"
            type="button"
            onClick={() => s.openQuick("p5")}
            variant="ghost"
          >
            <span>
              <img src={MOBILE_FEATURE} alt="Man in graphic streetwear" />
              <span className="block">Vintage sportswear edit →</span>
            </span>
          </Button>
          <div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-4 min-[601px]:hidden">
            <span className="text-xs text-[var(--muted)]">Appearance</span>
            <ThemeToggle />
          </div>
        </aside>
      </div>
    </>
  );
}

export function SiteFooter({ onNavShop }: { onNavShop: NavShop }) {
  const s = useStorefront();
  const h3 =
    "mb-[18px] mt-0 font-mono text-[0.68rem] font-medium uppercase leading-none tracking-[0.1em] text-[rgba(243,240,232,0.56)]";
  const footerButton =
    "h-auto justify-start rounded-none bg-transparent p-0 text-left text-inherit hover:bg-transparent hover:text-inherit";

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
              <Button className={footerButton} type="button" onClick={() => onNavShop({ collection: "new" })} variant="ghost">
                New arrivals
              </Button>
              <Button className={footerButton} type="button" onClick={() => onNavShop({ category: "Women" })} variant="ghost">
                Women
              </Button>
              <Button className={footerButton} type="button" onClick={() => onNavShop({ category: "Men" })} variant="ghost">
                Men
              </Button>
              <Button className={footerButton} type="button" onClick={() => onNavShop({ collection: "one-of-one" })} variant="ghost">
                One-of-one
              </Button>
            </div>
          </div>
          <div>
            <h3 className={h3}>Customer care</h3>
            <div className="footer-links">
              <Button className={footerButton} type="button" onClick={() => s.open("deliveryModal")} variant="ghost">
                Delivery and returns
              </Button>
              <Button className={footerButton} type="button" onClick={() => s.open("conditionModal")} variant="ghost">
                Condition guide
              </Button>
              <Button className={footerButton} type="button" onClick={() => s.open("measureModal")} variant="ghost">
                Measurements
              </Button>
              <Button className={footerButton} type="button" onClick={() => s.open("authModal")} variant="ghost">
                Brand labelling
              </Button>
            </div>
          </div>
          <div>
            <h3 className={h3}>Follow</h3>
            <div className="footer-links">
              {/* TODO(button-action): Link to the verified Instagram profile when the public URL is configured. */}
              <Button
                aria-label="Instagram"
                className={footerButton}
                onClick={() => s.showToast("Instagram is not available yet.")}
                type="button"
                variant="ghost"
              >
                Instagram
              </Button>
              {/* TODO(button-action): Link to the verified TikTok profile when the public URL is configured. */}
              <Button
                aria-label="TikTok"
                className={footerButton}
                onClick={() => s.showToast("TikTok is not available yet.")}
                type="button"
                variant="ghost"
              >
                TikTok
              </Button>
              <Button className={footerButton} type="button" onClick={() => s.open("supportModal")} variant="ghost">
                Contact
              </Button>
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
