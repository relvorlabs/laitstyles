import { InventoryWorkspace } from "@/features/control-room/inventory/inventory-workspace";
import {
  defaultInventoryQuery,
  inventorySavedViews,
} from "@/lib/control-room/inventory-selectors";
import { activeControlRoomSeed } from "@/lib/control-room/seed";
import type { InventorySavedView } from "@/lib/control-room/types";

type InventoryPageProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

const savedViewValues = new Set<InventorySavedView>(
  inventorySavedViews.map((view) => view.value),
);

export default async function InventoryPage({
  searchParams,
}: InventoryPageProps) {
  const params = await searchParams;
  const requestedView = Array.isArray(params.view) ? params.view[0] : params.view;
  const view = savedViewValues.has(requestedView as InventorySavedView)
    ? (requestedView as InventorySavedView)
    : "all";

  return (
    <InventoryWorkspace
      initialQuery={{ ...defaultInventoryQuery, view }}
      state={activeControlRoomSeed}
    />
  );
}
