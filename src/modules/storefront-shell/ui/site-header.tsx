"use client";

import { FavouriteIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LaitstyleSymbol } from "@/components/brand/laitstyle-symbol";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import { openQuickView } from "@/modules/storefront-shell/client/storefront-overlay-events";
import {
  useStorefrontCatalogueData,
  useStorefrontOverlay,
  useStorefrontSavedItems,
  useStorefrontUtility,
} from "@/modules/storefront-shell/client/storefront-runtime";
import { StorefrontAccountMenu } from "@/modules/storefront-shell/ui/storefront-account-menu";
import { StorefrontCartSheet } from "@/modules/storefront-shell/ui/storefront-cart-sheet";
import { IconClose, IconSearch } from "@/modules/storefront-shell/ui/storefront-icons";

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
  const pathname = usePathname();
  const { products } = useStorefrontCatalogueData();
  const saved = useStorefrontSavedItems();
  const utility = useStorefrontUtility();
  const overlay = useStorefrontOverlay();
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const mobileFeature = products[4] ?? products[0];
  const mobileFeatureImage = mobileFeature?.defaultImage ?? "/brand/laitstyle-symbol.svg";

  useEffect(() => {
    const onScroll = () => setHeaderScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    void pathname;
    overlay.close();
  }, [pathname, overlay.close]);

  const mobileNavigate = (action: () => void) => {
    overlay.close();
    action();
  };
  const headerClassName =
    "sticky top-0 z-[60] border-b border-b-transparent backdrop-blur-[16px] [background:color-mix(in_srgb,var(--bone)_92%,transparent)] [transition:border-color_220ms_var(--ease),box-shadow_220ms_var(--ease)]" +
    (headerScrolled ? " border-b-[var(--line)] shadow-[0_8px_28px_rgba(25,26,23,0.06)]" : "");

  return (
    <>
      {!utility.dismissed ? (
        <div
          className="bg-[var(--ink)] text-[0.77rem] tracking-[0.02em] text-[var(--bone)]"
          id="utility"
        >
          <div className="shell relative flex min-h-[34px] items-center justify-center gap-5 max-[600px]:justify-start max-[600px]:pr-10 max-[600px]:text-[0.7rem]">
            <p className="m-0">
              Nationwide delivery · Every piece inspected · New drop every Friday
            </p>
            <Button
              aria-label="Dismiss announcement"
              onClick={utility.dismiss}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
        </div>
      ) : null}

      <header className={headerClassName} id="header">
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
            onClick={() => overlay.open("mobileMenu")}
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
              <LaitstyleSymbol
                aria-hidden="true"
                className="h-full w-full"
                data-storefront-logo="woven"
                focusable="false"
                role="presentation"
                title=""
              />
            </span>
            <span className="brand-word">LAITSTYLES</span>
          </Button>

          <div className="flex items-center justify-self-end gap-1 max-[600px]:gap-0">
            <Button
              aria-label="Search products"
              onClick={() => overlay.open("searchModal")}
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <IconSearch />
            </Button>
            <Button
              aria-label={`Saved items, ${saved.ids.length}`}
              className="relative"
              onClick={() => overlay.open("savedDrawer")}
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon aria-hidden="true" icon={FavouriteIcon} size={19} strokeWidth={1.6} />
              {saved.ids.length > 0 ? (
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
        className={`overlay${overlay.openId === "mobileMenu" ? " open" : ""}`}
        id="mobileMenu"
        onClick={(event) => event.target === event.currentTarget && overlay.close()}
        role="dialog"
      >
        <aside className="drawer">
          <div className="drawer-head">
            <div className="brand">
              <span className="brand-symbol">
                <LaitstyleSymbol
                  aria-hidden="true"
                  className="h-full w-full"
                  data-storefront-logo="woven"
                  focusable="false"
                  role="presentation"
                  title=""
                />
              </span>
              <span className="brand-word">LAITSTYLES</span>
            </div>
            <Button
              aria-label="Close navigation"
              onClick={overlay.close}
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
              onClick={() => mobileNavigate(() => onNavShop({ collection: "new" }))}
              type="button"
              variant="ghost"
            >
              New arrivals <span>→</span>
            </Button>
            <Button
              className="w-full justify-between"
              onClick={() => mobileNavigate(() => onNavShop({ category: "Women" }))}
              type="button"
              variant="ghost"
            >
              Women <span>→</span>
            </Button>
            <Button
              className="w-full justify-between"
              onClick={() => mobileNavigate(() => onNavShop({ category: "Men" }))}
              type="button"
              variant="ghost"
            >
              Men <span>→</span>
            </Button>
            <Button
              className="w-full justify-between"
              onClick={() => mobileNavigate(() => onNavShop({ category: "Unisex" }))}
              type="button"
              variant="ghost"
            >
              Unisex <span>→</span>
            </Button>
            <Button
              className="w-full justify-between"
              onClick={() => mobileNavigate(() => onNavShop({ collection: "one-of-one" }))}
              type="button"
              variant="ghost"
            >
              One-of-one <span>→</span>
            </Button>
            <Button
              className="w-full justify-between"
              onClick={() => mobileNavigate(() => onNavShop({}))}
              type="button"
              variant="ghost"
            >
              Shop all <span>→</span>
            </Button>
          </nav>
          <Button
            className="mobile-feature h-auto w-full justify-start p-0 text-left"
            onClick={() => {
              if (!mobileFeature) return;
              overlay.close();
              openQuickView(mobileFeature.id);
            }}
            type="button"
            variant="ghost"
          >
            <CloudImage
              alt={mobileFeature?.name ?? "Laitstyles featured product"}
              height={1125}
              sizes="320px"
              src={mobileFeatureImage}
              width={900}
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
