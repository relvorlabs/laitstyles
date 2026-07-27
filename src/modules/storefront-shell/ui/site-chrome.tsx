"use client";

import { Analytics } from "@vercel/analytics/next";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { isAuthFlowErrorCode } from "@/modules/auth/errors";
import type { StorefrontAuthSupportMode } from "@/modules/auth/ui/auth-dialog";
import { useStorefrontAuth } from "@/modules/auth/ui/storefront-auth-provider";
import { useCatalogueNavigation } from "@/modules/products/client/use-catalogue-navigation";
import { type NavShop, SiteFooter, SiteHeader } from "@/modules/storefront-shell/ui/site-header";
import { StorefrontOverlays } from "@/modules/storefront-shell/ui/storefront-overlays";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { push: navigateCatalogue } = useCatalogueNavigation();
  const { actions } = useStorefrontAuth();
  const isStandaloneSurface = pathname?.startsWith("/admin") || pathname?.startsWith("/auth");

  const navigateShop = useCallback<NavShop>(
    ({ category, collection }) => {
      navigateCatalogue({
        category: category ?? null,
        collection: collection ?? null,
        page: 1,
      });
    },
    [navigateCatalogue],
  );

  useEffect(() => {
    if (isStandaloneSurface) return;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (auth !== "signin" && auth !== "signup") return;

    const next = params.get("next");
    const errorValue = params.get("error");
    const supportValue = params.get("support");
    const initialError = isAuthFlowErrorCode(errorValue) ? errorValue : undefined;
    const initialSupport: StorefrontAuthSupportMode | undefined =
      supportValue === "recovery" || supportValue === "confirmation" ? supportValue : undefined;
    const onSuccess =
      next?.startsWith("/") && !next.startsWith("//") ? () => router.push(next) : undefined;
    if (auth === "signup") actions.openSignup(onSuccess, initialError);
    else actions.openSignin(onSuccess, initialError, initialSupport);

    params.delete("auth");
    params.delete("next");
    params.delete("error");
    params.delete("support");
    const cleanQuery = params.toString();
    const cleanUrl = cleanQuery ? `${pathname}?${cleanQuery}` : pathname;
    window.history.replaceState(window.history.state, "", cleanUrl);
  }, [actions, isStandaloneSurface, pathname, router]);

  if (isStandaloneSurface) return <>{children}</>;

  return (
    <div className="lst-storefront flex min-h-full flex-1 flex-col">
      <SiteHeader
        onGoHome={() => router.push("/")}
        onNavNew={() => navigateShop({ collection: "new" })}
        onNavShop={navigateShop}
      />

      {children}

      <SiteFooter onNavShop={navigateShop} />
      <StorefrontOverlays />
      <Analytics />
    </div>
  );
}
