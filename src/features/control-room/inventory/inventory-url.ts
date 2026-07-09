import type {
  InventoryPresentation,
  InventorySavedView,
} from "@/lib/control-room/types";

type InventoryUrlState = {
  view: InventorySavedView;
  presentation: InventoryPresentation;
  productId: string | null;
};

export function buildInventoryHref(
  pathname: string,
  state: InventoryUrlState,
) {
  const params = new URLSearchParams();

  if (state.view !== "all") params.set("view", state.view);
  if (state.presentation !== "grid") {
    params.set("presentation", state.presentation);
  }
  if (state.productId) params.set("product", state.productId);

  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}
