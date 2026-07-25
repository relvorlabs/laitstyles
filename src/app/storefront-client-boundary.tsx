"use client";

import { type ReactNode, use } from "react";
import type { StorefrontShellCatalogPayload } from "@/features/storefront/shared/catalog-types";
import { StorefrontAuthProvider } from "@/features/storefront/shared/storefront-auth-provider";
import type { StorefrontAuthSession } from "@/features/storefront/shared/storefront-auth-session";
import { StorefrontStateHydrator } from "@/features/storefront/shared/storefront-state-hydrator";
import { SiteChrome } from "@/features/storefront/shell/site-chrome";
import { StorefrontQueryProvider } from "@/providers/storefront-query-provider";

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
    <StorefrontQueryProvider initialCatalog={catalog}>
      <StorefrontStateHydrator>
        <StorefrontAuthProvider authSession={authSession} products={catalog.products}>
          <SiteChrome catalog={catalog}>{children}</SiteChrome>
        </StorefrontAuthProvider>
      </StorefrontStateHydrator>
    </StorefrontQueryProvider>
  );
}
