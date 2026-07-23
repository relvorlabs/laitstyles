import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppShellFallback } from "@/app/app-shell-fallback";
import { StorefrontProviders } from "@/app/storefront-providers";
import { loadStorefrontCatalog } from "@/features/storefront/shared/catalog-loader";

export function StorefrontRouteBoundary({ children }: { children: ReactNode }) {
  const catalogPromise = loadStorefrontCatalog();

  return (
    <Suspense fallback={<AppShellFallback />}>
      <StorefrontProviders catalogPromise={catalogPromise}>{children}</StorefrontProviders>
    </Suspense>
  );
}
