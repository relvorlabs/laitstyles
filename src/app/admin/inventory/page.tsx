import { defaultInventoryPageSize } from "@/features/admin/inventory/inventory-url";
import { InventoryWorkspace } from "@/features/admin/inventory/inventory-workspace";
import {
  defaultInventoryQuery,
  getInventoryFacetOptions,
  inventorySavedViews,
  inventorySortOptions,
} from "@/lib/admin/inventory/inventory-selectors";
import { activeAdminSeed } from "@/lib/admin/shared/admin-seed";
import type {
  CatalogueChannel,
  InventoryModeFilter,
  InventoryPresentation,
  InventorySavedView,
  InventorySortKey,
  InventoryStockFilter,
} from "@/lib/admin/shared/types";

type InventoryPageProps = {
  searchParams: Promise<{
    view?: string | string[];
    q?: string | string[];
    mode?: string | string[];
    stock?: string | string[];
    category?: string | string[];
    collection?: string | string[];
    channel?: string | string[];
    sort?: string | string[];
    presentation?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
    product?: string | string[];
  }>;
};

const savedViewValues = new Set<InventorySavedView>(inventorySavedViews.map((view) => view.value));
const modeValues = new Set<InventoryModeFilter>(["all", "unique", "stocked", "variant"]);
const stockValues = new Set<InventoryStockFilter>([
  "all",
  "healthy",
  "low-stock",
  "out-of-stock",
  "held",
  "sold",
]);
const channelValues = new Set<CatalogueChannel | "all">([
  "all",
  "storefront",
  "physical-store",
  "whatsapp",
  "instagram",
]);
const sortValues = new Set<InventorySortKey>(inventorySortOptions.map((option) => option.value));
const facets = getInventoryFacetOptions(activeAdminSeed.products);
const categoryValues = new Set(facets.categories);
const collectionValues = new Set(facets.collections);
const pageSizeValues = new Set([10, 15, 25, 50]);

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const params = await searchParams;
  const requestedView = first(params.view);
  const requestedPresentation = first(params.presentation);
  const requestedProduct = first(params.product);
  const requestedCategory = first(params.category);
  const requestedCollection = first(params.collection);

  const view = pick(requestedView, savedViewValues, "all");
  const presentation: InventoryPresentation = requestedPresentation === "table" ? "table" : "grid";
  const productId = activeAdminSeed.products.some((product) => product.id === requestedProduct)
    ? (requestedProduct ?? null)
    : null;
  const requestedPage = Number(first(params.page));
  const requestedPageSize = Number(first(params.pageSize));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = pageSizeValues.has(requestedPageSize)
    ? requestedPageSize
    : defaultInventoryPageSize;

  return (
    <InventoryWorkspace
      initialOpenProductId={productId}
      initialPage={page}
      initialPageSize={pageSize}
      initialPresentation={presentation}
      initialQuery={{
        ...defaultInventoryQuery,
        view,
        search: first(params.q) ?? "",
        mode: pick(first(params.mode), modeValues, "all"),
        stock: pick(first(params.stock), stockValues, "all"),
        category:
          requestedCategory && categoryValues.has(requestedCategory) ? requestedCategory : "all",
        collection:
          requestedCollection && collectionValues.has(requestedCollection)
            ? requestedCollection
            : "all",
        channel: pick(first(params.channel), channelValues, "all"),
        sort: pick(first(params.sort), sortValues, "updated-desc"),
      }}
    />
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pick<TValue extends string>(
  value: string | undefined,
  allowed: Set<TValue>,
  fallback: TValue,
): TValue {
  return value && allowed.has(value as TValue) ? (value as TValue) : fallback;
}
