"use client";

import { Analytics } from "@vercel/analytics/next";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useStorefrontAuth } from "@/features/storefront/shared/storefront-auth-provider";
import type { StorefrontShellCatalogPayload } from "@/features/storefront/shared/catalog-types";
import { StorefrontProvider } from "@/features/storefront/shared/storefront-provider";
import { type NavShop, SiteFooter, SiteHeader } from "@/features/storefront/shell/site-header";
import { QueryProvider } from "@/lib/query/query-provider";

export function SiteChrome({
  catalog,
  children,
}: {
  catalog: StorefrontShellCatalogPayload;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { actions } = useStorefrontAuth();
  const isStandaloneSurface = pathname?.startsWith("/admin") || pathname?.startsWith("/auth");

  const navigateShop = useCallback<NavShop>(
    ({ category, collection }) => {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (collection) params.set("collection", collection);
      const query = params.toString();
      router.push(query ? `/products?${query}` : "/products");
    },
    [router],
  );

  useEffect(() => {
    if (isStandaloneSurface) return;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (auth !== "signin" && auth !== "signup") return;

    const next = params.get("next");
    const onSuccess =
      next?.startsWith("/") && !next.startsWith("//") ? () => router.push(next) : undefined;
    if (auth === "signup") actions.openSignup(onSuccess);
    else actions.openSignin(onSuccess);

    params.delete("auth");
    params.delete("next");
    const cleanQuery = params.toString();
    router.replace(cleanQuery ? `${pathname}?${cleanQuery}` : pathname, { scroll: false });
  }, [actions, isStandaloneSurface, pathname, router]);

  if (isStandaloneSurface) return <>{children}</>;

  return (
    <StorefrontProvider catalog={catalog}>
      <QueryProvider>
        <SiteHeader
          onGoHome={() => router.push("/")}
          onNavNew={() => navigateShop({ collection: "new" })}
          onNavShop={navigateShop}
        />
        {children}
        <SiteFooter onNavShop={navigateShop} />
        <Analytics />
      </QueryProvider>
    </StorefrontProvider>
  );
}
