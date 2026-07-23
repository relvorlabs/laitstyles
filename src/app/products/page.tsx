import type { Metadata } from "next";
import { ProductCatalogue } from "@/features/storefront/catalogue/product-catalogue";
import {
  parseCatalogueSearchParams,
  type CatalogueSearchParams,
} from "@/features/storefront/catalogue/catalogue-search-params";
import {
  countPublishedProducts,
  getStorefrontCategoryBySlug,
  getStorefrontCollectionBySlug,
  getStorefrontFacets,
  listPublishedProducts,
  listStorefrontCategories,
} from "@/server/commerce/catalogue/catalog-repository";

export const metadata: Metadata = {
  title: "Shop all pieces — Laitstyles",
  description: "Browse the complete Laitstyles catalogue of curated premium pre-owned fashion.",
};

const PAGE_SIZE = 12;
const MISSING_ID = "00000000-0000-0000-0000-000000000000";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<CatalogueSearchParams>;
}) {
  const parsed = parseCatalogueSearchParams(await searchParams);
  const [category, collection] = await Promise.all([
    parsed.category ? getStorefrontCategoryBySlug(parsed.category) : null,
    parsed.collection ? getStorefrontCollectionBySlug(parsed.collection) : null,
  ]);

  const filters = {
    search: parsed.search || undefined,
    categoryId: parsed.category ? category?.id ?? MISSING_ID : undefined,
    collectionId: parsed.collection ? collection?.id ?? MISSING_ID : undefined,
    brands: parsed.brands,
    conditions: parsed.conditions,
    colours: parsed.colours,
    sizes: parsed.sizes,
    modes: parsed.modes,
    priceMinNaira: parsed.minPriceNaira,
    priceMaxNaira: parsed.maxPriceNaira,
  };

  const [total, products, facets, categories] = await Promise.all([
    countPublishedProducts(filters),
    listPublishedProducts({
      ...filters,
      sort: parsed.sort,
      limit: PAGE_SIZE,
      offset: (parsed.page - 1) * PAGE_SIZE,
    }),
    getStorefrontFacets(),
    listStorefrontCategories(),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(parsed.page, pageCount);

  const normalizedProducts =
    page === parsed.page
      ? products
      : await listPublishedProducts({
          ...filters,
          sort: parsed.sort,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        });

  return (
    <ProductCatalogue
      categories={categories}
      facets={facets}
      page={page}
      pageCount={pageCount}
      products={normalizedProducts}
      search={parsed}
      total={total}
    />
  );
}
