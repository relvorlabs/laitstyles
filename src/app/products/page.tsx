import type { Metadata } from "next";
import { ProductCatalogue } from "@/features/storefront/catalogue/product-catalogue";
import {
  type CatalogueSearchParams,
  parseCatalogueSearchParams,
} from "@/features/storefront/catalogue/catalogue-search-params";
import { projectLegacyProductSummary } from "@/features/storefront/shared/catalog-loader";
import { filteredProducts } from "@/features/storefront/shared/catalogue-data";
import { storefrontFontClassName } from "@/features/storefront/shared/storefront-fonts";
import { MAX_STOREFRONT_CATALOGUE_DETAILS } from "@/server/commerce/catalogue/catalogue-limits";
import { listPublishedProducts } from "@/server/commerce/catalogue/catalog-repository";

export const metadata: Metadata = {
  title: "Shop all pieces — Laitstyles",
  description: "Browse the complete Laitstyles catalogue of curated premium pre-owned fashion.",
};

const PAGE_SIZE = 12;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<CatalogueSearchParams>;
}) {
  const search = parseCatalogueSearchParams(await searchParams);

  // The repository is the only data source. Size and colour are applied in SQL
  // (including variant rows); the approved shopper vocabulary is then projected
  // and filtered on the server so the existing UI contract remains unchanged.
  const summaries = await listPublishedProducts({
    colours: search.colours.length ? search.colours : undefined,
    sizes: search.sizes.length ? search.sizes : undefined,
    limit: MAX_STOREFRONT_CATALOGUE_DETAILS,
  });
  const compatibleProducts = summaries.map(projectLegacyProductSummary);
  const filtered = filteredProducts(compatibleProducts, {
    category: search.category ?? "All",
    collection: search.collection,
    conditions: new Set(search.conditions),
    inventories: new Set(search.inventories),
    inStock: search.inStock,
    maxPrice: search.maxPriceNaira ?? null,
    search: search.search,
    sort: search.sort,
  });

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(search.page, pageCount);
  const start = (page - 1) * PAGE_SIZE;
  const productIds = filtered.slice(start, start + PAGE_SIZE).map((product) => product.id);

  return (
    <ProductCatalogue
      fontClassName={storefrontFontClassName}
      page={page}
      pageCount={pageCount}
      productIds={productIds}
      search={search}
      total={total}
    />
  );
}
