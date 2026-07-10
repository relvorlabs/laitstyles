"use client";

import { InventoryProductCard } from "@/features/control-room/inventory/inventory-product-card";
import type { InventoryListItem } from "@/lib/control-room/types";

type InventoryGridProps = {
  items: InventoryListItem[];
  selectedIds: Set<string>;
  onSelectedChange: (productId: string, selected: boolean) => void;
  onOpen: (productId: string) => void;
  onOpenMedia: (productId: string, mediaId: string) => void;
  className?: string;
};

export function InventoryGrid({
  items,
  selectedIds,
  onSelectedChange,
  onOpen,
  onOpenMedia,
  className,
}: InventoryGridProps) {
  return (
    <div
      className={
        className ??
        "grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-4"
      }
      data-inventory-grid
    >
      {items.map((item) => (
        <InventoryProductCard
          item={item}
          key={item.product.id}
          onOpen={() => onOpen(item.product.id)}
          onOpenMedia={() => onOpenMedia(item.product.id, item.coverImage.id)}
          onSelectedChange={(selected) =>
            onSelectedChange(item.product.id, selected)
          }
          selected={selectedIds.has(item.product.id)}
        />
      ))}
    </div>
  );
}
