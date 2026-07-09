import type {
  InventoryPresentation,
  InventoryQuery,
} from "@/lib/control-room/types";

type InventoryUrlState = {
  query: InventoryQuery;
  presentation: InventoryPresentation;
  productId: string | null;
};

export function buildInventoryHref(
  pathname: string,
  state: InventoryUrlState,
) {
  const params = new URLSearchParams();
  const { query } = state;

  if (query.view !== "all") params.set("view", query.view);
  if (query.search.trim()) params.set("q", query.search.trim());
  if (query.mode !== "all") params.set("mode", query.mode);
  if (query.stock !== "all") params.set("stock", query.stock);
  if (query.category !== "all") params.set("category", query.category);
  if (query.collection !== "all") params.set("collection", query.collection);
  if (query.channel !== "all") params.set("channel", query.channel);
  if (query.sort !== "updated-desc") params.set("sort", query.sort);
  if (state.presentation !== "grid") {
    params.set("presentation", state.presentation);
  }
  if (state.productId) params.set("product", state.productId);

  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}
