"use client";

import { type ReactNode, use } from "react";
import type { StorefrontCatalogPayload } from "@/features/storefront/shared/catalog-types";
import { StorefrontClientStateProvider } from "@/features/storefront/shared/storefront-client-state-provider";
import { StorefrontExperienceProvider } from "@/features/storefront/shared/storefront-experience-provider";
import { SiteChrome } from "@/features/storefront/shell/site-chrome";

export function StorefrontProviders({
  catalogPromise,
  children,
}: {
  catalogPromise: Promise<StorefrontCatalogPayload>;
  children: ReactNode;
}) {
  const catalog = use(catalogPromise);

  return (
    <StorefrontClientStateProvider
      products={catalog.products}
      variantOptionsByProductId={catalog.variantOptionsByProductId}
    >
      <StorefrontExperienceProvider products={catalog.products}>
        <SiteChrome catalog={catalog}>{children}</SiteChrome>
      </StorefrontExperienceProvider>
    </StorefrontClientStateProvider>
  );
}
