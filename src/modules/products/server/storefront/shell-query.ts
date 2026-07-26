import "server-only";

import {
  buildStorefrontCatalogue,
  buildStorefrontShellCatalogue,
} from "@/modules/products/server/storefront/catalogue-projection";
import {
  listPublishedProductDetails,
  listStorefrontCategories,
} from "@/modules/products/server/storefront/queries";
import type { StorefrontShellCataloguePayload } from "@/modules/products/storefront/catalogue-contract";

export async function getStorefrontShellCatalogue(): Promise<StorefrontShellCataloguePayload> {
  const [details, categories] = await Promise.all([
    listPublishedProductDetails(),
    listStorefrontCategories(),
  ]);

  return buildStorefrontShellCatalogue(buildStorefrontCatalogue(details, categories));
}
