"use client";

import { type ReactNode, use } from "react";
import type { StorefrontCatalogPayload } from "@/features/storefront/shared/catalog-types";
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
    <StorefrontExperienceProvider products={catalog.products}>
      <SiteChrome catalog={catalog}>{children}</SiteChrome>
    </StorefrontExperienceProvider>
  );
}
