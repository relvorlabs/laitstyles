import type { Metadata } from "next";
import {
  type CatalogueSearchParams,
  parseCatalogueSearchParams,
} from "@/features/storefront/catalogue/catalogue-search-params";
import { ProductCatalogue } from "@/features/storefront/catalogue/product-catalogue";
import { storefrontFontClassName } from "@/features/storefront/shared/storefront-fonts";
import { queryStorefrontCataloguePage } from "@/modules/products/server/storefront/page";

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
  const { productIds, total, page, pageCount } = await queryStorefrontCataloguePage({
    ...search,
    pageSize: PAGE_SIZE,
  });

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
