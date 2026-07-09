import type {
  InventoryQuery,
  InventorySavedView,
  InventorySortKey,
} from "@/lib/control-room/inventory-types";

export const defaultInventoryQuery: InventoryQuery = {
  search: "",
  view: "all",
  mode: "all",
  stock: "all",
  category: "all",
  collection: "all",
  channel: "all",
  sort: "updated-desc",
};

export const inventorySavedViews = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "drafts", label: "Drafts" },
  { value: "intake", label: "Intake" },
  { value: "low-stock", label: "Low stock" },
  { value: "out-of-stock", label: "Out of stock" },
  { value: "held", label: "Held" },
  { value: "sold", label: "Sold" },
  { value: "unpublished", label: "Unpublished" },
  { value: "needs-attention", label: "Needs attention" },
] as const satisfies ReadonlyArray<{
  value: InventorySavedView;
  label: string;
}>;

export const inventorySortOptions = [
  { value: "updated-desc", label: "Recently updated" },
  { value: "stock-asc", label: "Available stock: low to high" },
  { value: "stock-desc", label: "Available stock: high to low" },
  { value: "sold-desc", label: "Units sold" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name-asc", label: "Product name" },
] as const satisfies ReadonlyArray<{
  value: InventorySortKey;
  label: string;
}>;
