import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppShellFallback } from "@/app/app-shell-fallback";
import { StorefrontClientBoundary } from "@/app/storefront-client-boundary";
import { loadStorefrontShellCatalogue } from "@/modules/products/server/storefront/catalogue-loader";

export function StorefrontRouteBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AppShellFallback />}>
      <ResolvedStorefrontRouteBoundary>{children}</ResolvedStorefrontRouteBoundary>
    </Suspense>
  );
}

async function ResolvedStorefrontRouteBoundary({ children }: { children: ReactNode }) {
  const catalogue = await loadStorefrontShellCatalogue();
  return <StorefrontClientBoundary catalogue={catalogue}>{children}</StorefrontClientBoundary>;
}
