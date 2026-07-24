import { defaultInventoryPageSize } from "@/features/admin/inventory/inventory-url";
import { InventoryWorkspace } from "@/features/admin/inventory/inventory-workspace";
import { AdminAccessDenied } from "@/features/admin/shell/admin-access-denied";
import {
  defaultInventoryQuery,
  inventorySavedViews,
  inventorySortOptions,
} from "@/lib/admin/inventory/inventory-selectors";
import type {
  CatalogueChannel,
  InventoryModeFilter,
  InventoryPresentation,
  InventorySavedView,
  InventorySortKey,
  InventoryStockFilter,
} from "@/lib/admin/shared/types";
import { productIdSchema } from "@/modules/products/schema";
import { getStaffAccess } from "@/server/auth/session";

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
const pageSizeValues = new Set([10, 15, 25, 50]);

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const access = await getStaffAccess("inventory:read");
  if (!access.ok) return <AdminAccessDenied reason={access.reason} />;

  const params = await searchParams;
  const requestedView = first(params.view);
  const requestedPresentation = first(params.presentation);
  const requestedProduct = first(params.product);
  const requestedPage = Number(first(params.page));
  const requestedPageSize = Number(first(params.pageSize));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = pageSizeValues.has(requestedPageSize)
    ? requestedPageSize
    : defaultInventoryPageSize;
  const productId = productIdSchema.safeParse(requestedProduct).success
    ? (requestedProduct ?? null)
    : null;

  return (
    <InventoryWorkspace
      initialOpenProductId={productId}
      initialPage={page}
      initialPageSize={pageSize}
      initialPresentation={requestedPresentation === "table" ? "table" : "grid"}
      initialQuery={{
        ...defaultInventoryQuery,
        view: pick(requestedView, savedViewValues, "all"),
        search: first(params.q)?.slice(0, 200) ?? "",
        mode: pick(first(params.mode), modeValues, "all"),
        stock: pick(first(params.stock), stockValues, "all"),
        category: normalizedFilter(first(params.category)),
        collection: normalizedFilter(first(params.collection)),
        channel: pick(first(params.channel), channelValues, "all"),
        sort: pick(first(params.sort), sortValues, "updated-desc"),
      }}
    />
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizedFilter(value: string | undefined) {
  const normalized = value?.trim().slice(0, 120);
  return normalized || "all";
}

function pick<TValue extends string>(
  value: string | undefined,
  allowed: Set<TValue>,
  fallback: TValue,
): TValue {
  return value && allowed.has(value as TValue) ? (value as TValue) : fallback;
}
