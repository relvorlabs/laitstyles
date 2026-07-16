"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Expand } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
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
  channelLabels,
  formatInventoryDate,
  inventoryModeLabels,
} from "@/features/admin/inventory/inventory-labels";
import { InventoryStatusBadge } from "@/features/admin/inventory/inventory-status-badge";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import { formatNaira } from "@/lib/admin/formatters";
import type { InventoryListItem } from "@/lib/admin/types";

type InventoryTableProps = {
  items: InventoryListItem[];
  selectedIds: Set<string>;
  onSelectedChange: (productId: string, selected: boolean) => void;
  onSelectVisible: (selected: boolean) => void;
  onOpen: (productId: string) => void;
  onOpenMedia: (productId: string, mediaId: string) => void;
};

export function InventoryTable({
  items,
  selectedIds,
  onSelectedChange,
  onSelectVisible,
  onOpen,
  onOpenMedia,
}: InventoryTableProps) {
  const visibleSelected = items.filter((item) => selectedIds.has(item.product.id)).length;
  const allSelected = items.length > 0 && visibleSelected === items.length;
  const partiallySelected = visibleSelected > 0 && !allSelected;

  return (
    <div className="hidden overflow-hidden rounded-[18px] border border-border bg-card lg:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-surface-sunken hover:bg-surface-sunken">
            <TableHead className="w-12 px-4">
              <Checkbox
                aria-label="Select all visible products"
                checked={allSelected}
                indeterminate={partiallySelected}
                onCheckedChange={onSelectVisible}
              />
            </TableHead>
            <TableHead className="min-w-[300px]">Product</TableHead>
            <TableHead className="hidden xl:table-cell">Mode</TableHead>
            <TableHead className="text-right">Available</TableHead>
            <TableHead className="hidden text-right xl:table-cell">Reserved</TableHead>
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
              <TableRow data-state={selected ? "selected" : undefined} key={item.product.id}>
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
                  <div className="flex min-w-0 items-center gap-3">
                    <Button
                      aria-label={`Preview images for ${item.product.name}`}
                      className="group/media relative aspect-[4/5] h-auto w-14 shrink-0 overflow-hidden p-0"
                      onClick={() => onOpenMedia(item.product.id, item.coverImage.id)}
                      type="button"
                      variant="ghost"
                    >
                      <Image
                        alt={item.coverImage.alt}
                        className="object-cover transition-transform group-hover/media:scale-105 motion-reduce:transition-none"
                        fill
                        sizes="56px"
                        src={item.coverImage.url}
                      />
                      <span className="absolute inset-0 grid place-items-center bg-overlay/0 text-surface-inverse-foreground opacity-0 transition-opacity group-hover/media:bg-overlay/55 group-hover/media:opacity-100 group-focus-visible/media:bg-overlay/55 group-focus-visible/media:opacity-100">
                        <Expand aria-hidden="true" className="size-4" />
                      </span>
                    </Button>
                    <Button
                      className="h-auto min-w-0 justify-start p-0 text-left"
                      onClick={() => onOpen(item.product.id)}
                      type="button"
                      variant="link"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold">
                          {item.product.name}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                          {item.reference} · {item.product.category} · {item.product.brand}
                        </span>
                      </span>
                    </Button>
                  </div>
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
                  {item.product.price > 0 ? formatNaira(item.product.price) : "Needs price"}
                </TableCell>
                <TableCell>
                  <div className="flex max-w-[220px] flex-wrap items-center gap-1.5">
                    <InventoryStatusBadge health={item.health} />
                    <Badge variant="outline">
                      {item.product.publication === "published" ? "Published" : "Not published"}
                    </Badge>
                    {item.product.channels.slice(0, 1).map((channel) => (
                      <Badge key={channel} variant="secondary">
                        {channelLabels[channel]}
                      </Badge>
                    ))}
                    {item.product.channels.length > 1 ? (
                      <Badge variant="outline">+{item.product.channels.length - 1}</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="hidden text-[11px] text-muted-foreground 2xl:table-cell">
                  {formatInventoryDate(item.product.updatedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    aria-label={`Open ${item.product.name}`}
                    onClick={() => onOpen(item.product.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <AdminIcon icon={ArrowRight01Icon} size={16} />
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
