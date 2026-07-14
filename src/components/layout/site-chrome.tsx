"use client";

import { Analytics } from "@vercel/analytics/next";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { type NavShop, SiteFooter, SiteHeader } from "@/features/storefront/home-lab/site-header";
import { StorefrontProvider } from "@/features/storefront/home-lab/storefront-context";
import { useStorefrontExperience } from "@/features/storefront/shared/storefront-experience-provider";
import { QueryProvider } from "@/lib/query/query-provider";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { actions } = useStorefrontExperience();
  const isStandaloneSurface = pathname?.startsWith("/admin") || pathname?.startsWith("/auth");

  const navigateShop = useCallback<NavShop>(
    ({ category, collection }) => {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (collection) params.set("collection", collection);
      const query = params.toString();
      router.push(query ? `/shop?${query}` : "/shop");
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
    <StorefrontProvider>
      <QueryProvider>
        <div className="lst-lab flex min-h-full flex-1 flex-col">
          <SiteHeader
            onGoHome={() => router.push("/")}
            onNavNew={() => navigateShop({ collection: "new" })}
            onNavShop={navigateShop}
          />
          {children}
          <SiteFooter onNavShop={navigateShop} />
          <Analytics />
        </div>
      </QueryProvider>
    </StorefrontProvider>
  );
}
