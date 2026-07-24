"use client";

import { type ReactNode, use } from "react";
import { StorefrontAuthProvider } from "@/features/storefront/shared/storefront-auth-provider";
import type { StorefrontAuthSession } from "@/features/storefront/shared/storefront-auth-session";
import type { StorefrontShellCatalogPayload } from "@/features/storefront/shared/catalog-types";
import { StorefrontClientStateProvider } from "@/features/storefront/shared/storefront-client-state-provider";
import { SiteChrome } from "@/features/storefront/shell/site-chrome";

export function StorefrontClientBoundary({
  authSessionPromise,
  catalogPromise,
  children,
}: {
  authSessionPromise: Promise<StorefrontAuthSession>;
  catalogPromise: Promise<StorefrontShellCatalogPayload>;
  children: ReactNode;
}) {
  const authSession = use(authSessionPromise);
  const catalog = use(catalogPromise);

  return (
    <StorefrontClientStateProvider
      products={catalog.products}
      variantOptionsByProductId={catalog.variantOptionsByProductId}
    >
      <StorefrontAuthProvider authSession={authSession} products={catalog.products}>
        <SiteChrome catalog={catalog}>{children}</SiteChrome>
      </StorefrontAuthProvider>
    </StorefrontClientStateProvider>
  );
}
