"use client";

import { type ReactNode, use } from "react";
import { StorefrontAuthDialogHost } from "@/features/storefront/shared/storefront-auth-dialog-host";
import { StorefrontAuthProvider } from "@/features/storefront/shared/storefront-auth-provider";
import { useSeedStorefrontCatalogue } from "@/modules/products/client/storefront-catalogue";
import type { StorefrontShellCataloguePayload } from "@/modules/products/storefront/catalogue-contract";
import { SiteChrome } from "@/modules/storefront-shell/ui/site-chrome";
import { StorefrontStateHydrator } from "@/providers/storefront-state-hydrator";

export function StorefrontClientBoundary({
  cataloguePromise,
  children,
}: {
  cataloguePromise: Promise<StorefrontShellCataloguePayload>;
  children: ReactNode;
}) {
  const catalogue = use(cataloguePromise);
  useSeedStorefrontCatalogue(catalogue);

  return (
    <StorefrontStateHydrator>
      <StorefrontAuthProvider>
        <SiteChrome>{children}</SiteChrome>
        <StorefrontAuthDialogHost />
      </StorefrontAuthProvider>
    </StorefrontStateHydrator>
  );
}
