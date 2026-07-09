import { InventoryWorkspace } from "@/features/control-room/inventory/inventory-workspace";
import {
  defaultInventoryQuery,
  inventorySavedViews,
} from "@/lib/control-room/inventory-selectors";
import { activeControlRoomSeed } from "@/lib/control-room/seed";
import type {
  InventoryPresentation,
  InventorySavedView,
} from "@/lib/control-room/types";

type InventoryPageProps = {
  searchParams: Promise<{
    view?: string | string[];
    presentation?: string | string[];
    product?: string | string[];
  }>;
};

const savedViewValues = new Set<InventorySavedView>(
  inventorySavedViews.map((view) => view.value),
);

export default async function InventoryPage({
  searchParams,
}: InventoryPageProps) {
  const params = await searchParams;
  const requestedView = Array.isArray(params.view) ? params.view[0] : params.view;
  const requestedPresentation = Array.isArray(params.presentation)
    ? params.presentation[0]
    : params.presentation;
  const requestedProduct = Array.isArray(params.product)
    ? params.product[0]
    : params.product;
  const view = savedViewValues.has(requestedView as InventorySavedView)
    ? (requestedView as InventorySavedView)
    : "all";
  const presentation: InventoryPresentation =
    requestedPresentation === "table" ? "table" : "grid";
  const productId = activeControlRoomSeed.products.some(
    (product) => product.id === requestedProduct,
  )
    ? requestedProduct ?? null
    : null;

  return (
    <InventoryWorkspace
      initialOpenProductId={productId}
      initialPresentation={presentation}
      initialQuery={{ ...defaultInventoryQuery, view }}
      state={activeControlRoomSeed}
    />
  );
}
