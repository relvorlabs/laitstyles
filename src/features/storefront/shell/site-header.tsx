"use client";

import { FavouriteIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import { StorefrontAccountMenu } from "@/components/layout/storefront-account-menu";
import { StorefrontCartSheet } from "@/components/layout/storefront-cart-sheet";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { IconClose, IconSearch } from "@/features/storefront/shared/storefront-icons";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";
import { BrandMark } from "./brand-mark";

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
  const mobileFeature = s.products[4] ?? s.products[0];
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
              aria-label="Dismiss announcement"
              onClick={s.dismissUtility}
              size="icon-sm"
              type="button"
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
            aria-label="Primary navigation"
            className="flex items-center gap-[22px] text-[0.86rem] max-[860px]:hidden"
          >
            <Button onClick={onNavNew} type="button" variant="ghost">
              New arrivals
            </Button>
            <Button onClick={() => onNavShop({ category: "Women" })} type="button" variant="ghost">
              Women
            </Button>
            <Button onClick={() => onNavShop({ category: "Men" })} type="button" variant="ghost">
              Men
            </Button>
            <Button onClick={() => onNavShop({ category: "Unisex" })} type="button" variant="ghost">
              Unisex
            </Button>
            <Button
              onClick={() => onNavShop({ collection: "one-of-one" })}
              type="button"
              variant="ghost"
            >
              One-of-one
            </Button>
          </nav>

          <Button
            aria-label="Open navigation"
            className="menu-button"
            onClick={() => s.open("mobileMenu")}
            size="icon-lg"
            type="button"
            variant="ghost"
          >
            <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </Button>

          <Button aria-label="Laitstyles home" onClick={onGoHome} type="button" variant="ghost">
            <span className="brand-symbol">
              <BrandMark />
            </span>
            <span className="brand-word">LAITSTYLES</span>
          </Button>

          <div className="flex items-center justify-self-end gap-1 max-[600px]:gap-0">
            <Button
              aria-label="Search products"
              onClick={() => s.open("searchModal")}
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <IconSearch />
            </Button>
            <Button
              aria-label={`Saved items, ${s.saved.size}`}
              className="relative"
              onClick={() => s.open("savedDrawer")}
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon aria-hidden="true" icon={FavouriteIcon} size={19} strokeWidth={1.6} />
              {s.saved.size > 0 ? (
                <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-[var(--sage)]" />
              ) : null}
            </Button>
            <ThemeToggle className="max-[600px]:hidden" />

            <StorefrontCartSheet className="max-[600px]:size-10" />
            <StorefrontAccountMenu />
          </div>
        </div>
      </header>

      <div
        aria-label="Navigation"
        aria-modal="true"
        className={`overlay${s.openId === "mobileMenu" ? " open" : ""}`}
        id="mobileMenu"
        onClick={(event) => event.target === event.currentTarget && s.closeAll()}
        role="dialog"
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
              aria-label="Close navigation"
              onClick={s.closeAll}
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <nav aria-label="Mobile navigation" className="mobile-nav">
            <Button
              className="w-full justify-between"
              onClick={() => onNavShop({ collection: "new" })}
              type="button"
              variant="ghost"
            >
              New arrivals <span>→</span>
            </Button>
            <Button
              className="w-full justify-between"
              onClick={() => onNavShop({ category: "Women" })}
              type="button"
              variant="ghost"
            >
              Women <span>→</span>
            </Button>
            <Button
              className="w-full justify-between"
              onClick={() => onNavShop({ category: "Men" })}
              type="button"
              variant="ghost"
            >
              Men <span>→</span>
            </Button>
            <Button
              className="w-full justify-between"
              onClick={() => onNavShop({ category: "Unisex" })}
              type="button"
              variant="ghost"
            >
              Unisex <span>→</span>
            </Button>
            <Button
              className="w-full justify-between"
              onClick={() => onNavShop({ collection: "one-of-one" })}
              type="button"
              variant="ghost"
            >
              One-of-one <span>→</span>
            </Button>
            <Button
              className="w-full justify-between"
              onClick={() => onNavShop({})}
              type="button"
              variant="ghost"
            >
              Shop all <span>→</span>
            </Button>
          </nav>
          <Button
            className="mobile-feature h-auto w-full justify-start p-0 text-left"
            onClick={() => mobileFeature && s.openQuick(mobileFeature.id)}
            type="button"
            variant="ghost"
          >
            <Image
              alt={mobileFeature?.name ?? "Laitstyles featured product"}
              src={mobileFeature?.images[0] ?? "/brand/laitstyle-symbol.svg"}
              width={900}
              height={1125}
              sizes="320px"
            />
            <p>Vintage sportswear edit →</p>
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
  const storefront = useStorefront();
  const headingClass =
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
            <h3 className={headingClass}>Shop</h3>
            <div className="footer-links">
              <Button
                onClick={() => onNavShop({ collection: "new" })}
                type="button"
                variant="ghost"
              >
                New arrivals
              </Button>
              <Button
                onClick={() => onNavShop({ category: "Women" })}
                type="button"
                variant="ghost"
              >
                Women
              </Button>
              <Button onClick={() => onNavShop({ category: "Men" })} type="button" variant="ghost">
                Men
              </Button>
              <Button
                onClick={() => onNavShop({ collection: "one-of-one" })}
                type="button"
                variant="ghost"
              >
                One-of-one
              </Button>
            </div>
          </div>
          <div>
            <h3 className={headingClass}>Customer care</h3>
            <div className="footer-links">
              <Button
                onClick={() => storefront.open("deliveryModal")}
                type="button"
                variant="ghost"
              >
                Delivery and returns
              </Button>
              <Button
                onClick={() => storefront.open("conditionModal")}
                type="button"
                variant="ghost"
              >
                Condition guide
              </Button>
              <Button onClick={() => storefront.open("measureModal")} type="button" variant="ghost">
                Measurements
              </Button>
              <Button onClick={() => storefront.open("authModal")} type="button" variant="ghost">
                Brand labelling
              </Button>
            </div>
          </div>
          <div>
            <h3 className={headingClass}>Follow</h3>
            <div className="footer-links">
              {/* TODO(button-action): Link to the verified Instagram profile when the public URL is configured. */}
              <Button
                aria-label="Instagram"
                onClick={() => storefront.showToast("Instagram is not available yet.")}
                type="button"
                variant="ghost"
              >
                Instagram
              </Button>
              {/* TODO(button-action): Link to the verified TikTok profile when the public URL is configured. */}
              <Button
                aria-label="TikTok"
                onClick={() => storefront.showToast("TikTok is not available yet.")}
                type="button"
                variant="ghost"
              >
                TikTok
              </Button>
              <Button onClick={() => storefront.open("supportModal")} type="button" variant="ghost">
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
