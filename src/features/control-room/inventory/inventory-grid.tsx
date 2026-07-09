"use client";

import { InventoryProductCard } from "@/features/control-room/inventory/inventory-product-card";
import type { InventoryListItem } from "@/lib/control-room/types";

type InventoryGridProps = {
  items: InventoryListItem[];
  selectedIds: Set<string>;
  onSelectedChange: (productId: string, selected: boolean) => void;
  onOpen: (productId: string) => void;
  className?: string;
};

export function InventoryGrid({
  items,
  selectedIds,
  onSelectedChange,
  onOpen,
  className,
}: InventoryGridProps) {
  return (
    <div
      className={
        className ??
        "grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      }
    >
      {items.map((item) => (
        <InventoryProductCard
          item={item}
          key={item.product.id}
          onOpen={() => onOpen(item.product.id)}
          onSelectedChange={(selected) =>
            onSelectedChange(item.product.id, selected)
          }
          selected={selectedIds.has(item.product.id)}
        />
      ))}
    </div>
  );
}
