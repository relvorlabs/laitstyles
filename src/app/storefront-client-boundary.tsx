"use client";

import { type ReactNode, use } from "react";
import { StorefrontAuthDialogHost } from "@/features/storefront/shared/storefront-auth-dialog-host";
import { StorefrontAuthProvider } from "@/features/storefront/shared/storefront-auth-provider";
import type { StorefrontAuthSession } from "@/features/storefront/shared/storefront-auth-session";
import { SiteChrome } from "@/features/storefront/shell/site-chrome";
import type { StorefrontShellCataloguePayload } from "@/modules/products/storefront/catalogue-contract";
import { StorefrontQueryProvider } from "@/providers/storefront-query-provider";
import { StorefrontStateHydrator } from "@/providers/storefront-state-hydrator";

export function StorefrontClientBoundary({
  authSessionPromise,
  cataloguePromise,
  children,
}: {
  authSessionPromise: Promise<StorefrontAuthSession>;
  cataloguePromise: Promise<StorefrontShellCataloguePayload>;
  children: ReactNode;
}) {
  const authSession = use(authSessionPromise);
  const catalogue = use(cataloguePromise);

  return (
    <StorefrontQueryProvider initialCatalogue={catalogue}>
      <StorefrontStateHydrator>
        <StorefrontAuthProvider authSession={authSession}>
          <SiteChrome>{children}</SiteChrome>
          <StorefrontAuthDialogHost />
        </StorefrontAuthProvider>
      </StorefrontStateHydrator>
    </StorefrontQueryProvider>
  );
}
