"use client";

import Image from "next/image";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatInventoryDate,
  inventoryModeLabels,
} from "@/features/control-room/inventory/inventory-labels";
import { InventoryStatusBadge } from "@/features/control-room/inventory/inventory-status-badge";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import { formatNaira } from "@/lib/control-room/formatters";
import type { InventoryListItem } from "@/lib/control-room/types";

type InventoryTableProps = {
  items: InventoryListItem[];
  selectedIds: Set<string>;
  onSelectedChange: (productId: string, selected: boolean) => void;
  onSelectVisible: (selected: boolean) => void;
  onOpen: (productId: string) => void;
};

export function InventoryTable({
  items,
  selectedIds,
  onSelectedChange,
  onSelectVisible,
  onOpen,
}: InventoryTableProps) {
  const visibleSelected = items.filter((item) =>
    selectedIds.has(item.product.id),
  ).length;
  const allSelected = items.length > 0 && visibleSelected === items.length;
  const partiallySelected = visibleSelected > 0 && !allSelected;

  return (
    <div className="hidden overflow-hidden rounded-[18px] border border-border bg-card lg:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/55 hover:bg-secondary/55">
            <TableHead className="w-12 px-4">
              <Checkbox
                aria-label="Select all visible products"
                checked={allSelected ? true : partiallySelected ? "mixed" : false}
                onCheckedChange={(checked) => onSelectVisible(Boolean(checked))}
              />
            </TableHead>
            <TableHead className="min-w-[280px]">Product</TableHead>
            <TableHead className="hidden xl:table-cell">Mode</TableHead>
            <TableHead className="text-right">Available</TableHead>
            <TableHead className="hidden text-right xl:table-cell">
              Reserved
            </TableHead>
            <TableHead className="hidden text-right xl:table-cell">Sold</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead>Status & visibility</TableHead>
            <TableHead className="hidden 2xl:table-cell">Updated</TableHead>
            <TableHead className="w-14 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const selected = selectedIds.has(item.product.id);

            return (
              <TableRow
                data-state={selected ? "selected" : undefined}
                key={item.product.id}
              >
                <TableCell className="px-4">
                  <Checkbox
                    aria-label={`Select ${item.product.name}`}
                    checked={selected}
                    onCheckedChange={(checked) =>
                      onSelectedChange(item.product.id, Boolean(checked))
                    }
                  />
                </TableCell>
                <TableCell>
                  <button
                    className="flex min-w-0 items-center gap-3 text-left"
                    onClick={() => onOpen(item.product.id)}
                    type="button"
                  >
                    <span className="relative aspect-[4/5] w-12 shrink-0 overflow-hidden rounded-[9px] bg-secondary">
                      <Image
                        alt={item.coverImage.alt}
                        className="object-cover"
                        fill
                        sizes="48px"
                        src={item.coverImage.url}
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold">
                        {item.product.name}
                      </span>
                      <span className="mt-1 block truncate text-[10.5px] text-muted-foreground">
                        {item.reference} · {item.product.category} · {item.product.brand}
                      </span>
                    </span>
                  </button>
                </TableCell>
                <TableCell className="hidden text-[11.5px] text-muted-foreground xl:table-cell">
                  {inventoryModeLabels[item.product.inventoryMode]}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {item.stock.available}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums text-muted-foreground xl:table-cell">
                  {item.stock.reserved}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums text-muted-foreground xl:table-cell">
                  {item.stock.sold}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {item.product.price > 0
                    ? formatNaira(item.product.price)
                    : "Needs price"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1.5">
                    <InventoryStatusBadge health={item.health} />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {item.product.publication === "published"
                        ? `${item.product.channels.length} selling channel${item.product.channels.length === 1 ? "" : "s"}`
                        : "Not visible to shoppers"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden text-[11px] text-muted-foreground 2xl:table-cell">
                  {formatInventoryDate(item.product.updatedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    aria-label={`Open ${item.product.name}`}
                    className="size-9 rounded-full"
                    onClick={() => onOpen(item.product.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <ControlRoomIcon icon={ArrowRight01Icon} size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
