import "server-only";

import {
  buildStorefrontCatalog,
  buildStorefrontShellCatalog,
} from "@/features/storefront/shared/catalog-adapter";
import type { StorefrontShellCatalogPayload } from "@/features/storefront/shared/catalog-types";
import {
  listPublishedProductDetails,
  listStorefrontCategories,
} from "@/modules/products/server/storefront/queries";

export async function getStorefrontShellCatalog(): Promise<StorefrontShellCatalogPayload> {
  const [details, categories] = await Promise.all([
    listPublishedProductDetails(),
    listStorefrontCategories(),
  ]);

  return buildStorefrontShellCatalog(buildStorefrontCatalog(details, categories));
}
