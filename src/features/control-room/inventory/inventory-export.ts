import type { InventoryListItem } from "@/lib/control-room/types";

export function downloadInventoryCsv(
  items: InventoryListItem[],
  reportingDate: string,
) {
  const csv = createInventoryCsv(items);
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `laitstyle-inventory-${reportingDate}.csv`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function createInventoryCsv(items: InventoryListItem[]) {
  const rows: Array<Array<string | number>> = [
    [
      "Product",
      "Reference",
      "Mode",
      "Category",
      "Collection",
      "Available",
      "Reserved",
      "Sold",
      "Returned",
      "Damaged",
      "Price",
      "Publication",
    ],
    ...items.map((item) => [
      item.product.name,
      item.reference,
      item.product.inventoryMode,
      item.product.category,
      item.product.collection ?? "",
      item.stock.available,
      item.stock.reserved,
      item.stock.sold,
      item.stock.returned,
      item.stock.damaged,
      item.product.price,
      item.product.publication,
    ]),
  ];

  return rows
    .map((row) => row.map((value) => escapeCsv(String(value))).join(","))
    .join("\n");
}

function escapeCsv(value: string) {
  if (!/[",\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}
