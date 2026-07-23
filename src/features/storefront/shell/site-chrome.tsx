"use client";

import { Analytics } from "@vercel/analytics/next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShopProvider } from "@/components/shop/shop-provider";
import type { StorefrontCatalogPayload } from "@/features/storefront/shared/catalog-types";
import { useStorefrontExperience } from "@/features/storefront/shared/storefront-experience-provider";
import { StorefrontProvider } from "@/features/storefront/shared/storefront-provider";
import { QueryProvider } from "@/lib/query/query-provider";
import { SiteFooter, SiteHeader } from "./site-header";

const EMPTY_COMPATIBILITY_CATALOG: StorefrontCatalogPayload = {
  products: [],
  categories: [],
  measurementsCm: {},
  variantOptionsByProductId: {},
};

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { actions } = useStorefrontExperience();
  const isStandaloneSurface =
    pathname.startsWith("/admin") || pathname.startsWith("/control-room") || pathname.startsWith("/auth");
  const needsLegacyCompatibility =
    pathname.startsWith("/account") || pathname.startsWith("/checkout") || pathname.startsWith("/order-confirmation");

  useEffect(() => {
    if (isStandaloneSurface) return;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (auth !== "signin" && auth !== "signup") return;
    const next = params.get("next");
    const onSuccess = next?.startsWith("/") && !next.startsWith("//") ? () => router.push(next) : undefined;
    if (auth === "signup") actions.openSignup(onSuccess);
    else actions.openSignin(onSuccess);
    params.delete("auth");
    params.delete("next");
    const cleanQuery = params.toString();
    router.replace(cleanQuery ? `${pathname}?${cleanQuery}` : pathname, { scroll: false });
  }, [actions, isStandaloneSurface, pathname, router]);

  if (isStandaloneSurface) return <>{children}</>;

  const frame = (
    <div className="lst-storefront flex min-h-screen flex-col">
      <a className="skip-link" href="#main">Skip to products</a>
      <div className="grain" aria-hidden="true" />
      <SiteHeader />
      {children}
      <SiteFooter />
      <Analytics />
    </div>
  );

  return (
    <ShopProvider>
      <QueryProvider>
        {needsLegacyCompatibility ? <StorefrontProvider catalog={EMPTY_COMPATIBILITY_CATALOG}>{frame}</StorefrontProvider> : frame}
      </QueryProvider>
    </ShopProvider>
  );
}
