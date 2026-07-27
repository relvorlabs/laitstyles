import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppShellFallback } from "@/app/app-shell-fallback";
import { StorefrontClientBoundary } from "@/app/storefront-client-boundary";
import { loadStorefrontShellCatalogue } from "@/modules/products/server/storefront/catalogue-loader";

export function StorefrontRouteBoundary({ children }: { children: ReactNode }) {
  const cataloguePromise = loadStorefrontShellCatalogue();

  return (
    <Suspense fallback={<AppShellFallback />}>
      <StorefrontClientBoundary cataloguePromise={cataloguePromise}>
        {children}
      </StorefrontClientBoundary>
    </Suspense>
  );
}
