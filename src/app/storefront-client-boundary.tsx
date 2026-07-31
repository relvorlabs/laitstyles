"use client";

import { type ReactNode, use } from "react";
import { StorefrontAuthDialogHost } from "@/modules/auth/ui/auth-dialog-host";
import { StorefrontAuthProvider } from "@/modules/auth/ui/storefront-auth-provider";
import { useSeedStorefrontCatalogue } from "@/modules/products/client/storefront-catalogue";
import type { StorefrontShellCataloguePayload } from "@/modules/products/storefront/catalogue-contract";
import { StorefrontRecentPersistence } from "@/modules/storefront-shell/client/storefront-recent-persistence";
import { SiteChrome } from "@/modules/storefront-shell/ui/site-chrome";
import { StorefrontDataUnavailable } from "@/modules/storefront-shell/ui/storefront-data-unavailable";
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

  if (catalogue.availability === "temporarily-unavailable") {
    return <StorefrontDataUnavailable />;
  }

  return (
    <StorefrontStateHydrator>
      <StorefrontAuthProvider>
        <StorefrontRecentPersistence />
        <SiteChrome>{children}</SiteChrome>
        <StorefrontAuthDialogHost />
      </StorefrontAuthProvider>
    </StorefrontStateHydrator>
  );
}
