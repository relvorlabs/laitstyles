"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Expand } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getProductDescriptor } from "@/features/control-room/inventory/inventory-labels";
import { InventoryStatusBadge } from "@/features/control-room/inventory/inventory-status-badge";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import { formatNaira } from "@/lib/control-room/formatters";
import type { InventoryListItem } from "@/lib/control-room/types";

type InventoryMobileListProps = {
  items: InventoryListItem[];
  selectedIds: Set<string>;
  onSelectedChange: (productId: string, selected: boolean) => void;
  onOpen: (productId: string) => void;
  onOpenMedia: (productId: string, mediaId: string) => void;
};

export function InventoryMobileList({
  items,
  selectedIds,
  onSelectedChange,
  onOpen,
  onOpenMedia,
}: InventoryMobileListProps) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      {items.map((item) => {
        const selected = selectedIds.has(item.product.id);

        return (
          <Card className="overflow-hidden py-0" key={item.product.id}>
            <div className="grid grid-cols-[96px_minmax(0,1fr)]">
              <button
                aria-label={`View images for ${item.product.name}`}
                className="group relative min-h-[150px] bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
                onClick={() => onOpenMedia(item.product.id, item.coverImage.id)}
                type="button"
              >
                <Image
                  alt={item.coverImage.alt}
                  className="object-cover transition-transform group-hover:scale-[1.025] motion-reduce:transition-none"
                  fill
                  sizes="96px"
                  src={item.coverImage.url}
                />
                <span className="absolute bottom-2 left-1/2 inline-flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-lg backdrop-blur">
                  <Expand aria-hidden="true" className="size-4" />
                </span>
              </button>

              <div className="flex min-w-0 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    className="min-w-0 rounded-[8px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    onClick={() => onOpen(item.product.id)}
                    type="button"
                  >
                    <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {item.product.category} · {item.reference}
                    </p>
                    <h3 className="mt-1 text-[14px] font-semibold leading-5">
                      {item.product.name}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                      {getProductDescriptor(item.product)}
                    </p>
                  </button>
                  <label className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-background">
                    <span className="sr-only">Select {item.product.name}</span>
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(checked) =>
                        onSelectedChange(item.product.id, Boolean(checked))
                      }
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <InventoryStatusBadge health={item.health} />
                  <Badge variant="outline">
                    {item.product.price > 0 ? formatNaira(item.product.price) : "Needs price"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-[12px] bg-secondary/65 p-2.5">
                  <MobileStock label="Available" value={item.stock.available} />
                  <MobileStock label="Reserved" value={item.stock.reserved} />
                  <MobileStock label="Sold" value={item.stock.sold} />
                </div>

                <Button
                  className="h-10 w-full justify-between rounded-full px-4"
                  onClick={() => onOpen(item.product.id)}
                  type="button"
                  variant="outline"
                >
                  Open product record
                  <ControlRoomIcon icon={ArrowRight01Icon} size={16} />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function MobileStock({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-serif text-[20px] font-medium leading-none tabular-nums">{value}</div>
      <div className="mt-1 text-[8.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
