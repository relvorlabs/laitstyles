"use client";

import { ArrowUpRight, Expand } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { InventoryStatusBadge } from "@/features/control-room/inventory/inventory-status-badge";
import { formatNaira } from "@/lib/control-room/formatters";
import type { InventoryListItem } from "@/lib/control-room/types";

type InventoryProductCardProps = {
  item: InventoryListItem;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  onOpen: () => void;
  onOpenMedia: () => void;
};

export function InventoryProductCard({
  item,
  selected,
  onSelectedChange,
  onOpen,
  onOpenMedia,
}: InventoryProductCardProps) {
  const { product, stock } = item;

  return (
    <Card
      className="group min-w-0 gap-0 overflow-hidden py-0 shadow-laitstyle-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-laitstyle motion-reduce:transform-none"
      data-inventory-card
      data-state={selected ? "selected" : undefined}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
        <button
          aria-label={`View images for ${product.name}`}
          className="absolute inset-0 block size-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          onClick={onOpenMedia}
          type="button"
        >
          <Image
            alt={item.coverImage.alt}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.035] motion-reduce:transition-none"
            fill
            sizes="(min-width: 1280px) 18vw, (min-width: 768px) 30vw, 50vw"
            src={item.coverImage.url}
          />
          <span className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-full border border-border bg-surface-raised/92 text-surface-raised-foreground opacity-0 shadow-laitstyle-sm backdrop-blur transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
            <Expand aria-hidden="true" className="size-3.5" />
            <span className="sr-only">Preview images</span>
          </span>
        </button>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-2">
          <label className="pointer-events-auto grid size-8 cursor-pointer place-items-center rounded-full border border-border bg-surface-raised/92 shadow-laitstyle-sm backdrop-blur-sm">
            <span className="sr-only">Select {product.name}</span>
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelectedChange(Boolean(checked))}
            />
          </label>
          <InventoryStatusBadge health={item.health} />
        </div>
      </div>

      <CardContent className="min-w-0 px-2.5 py-2.5">
        <div className="flex min-w-0 items-start gap-2">
          <button
            className="min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            onClick={onOpen}
            type="button"
          >
            <p className="truncate text-[8.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              {product.category} · {item.reference}
            </p>
            <h3 className="mt-0.5 truncate text-[13px] font-semibold leading-5">{product.name}</h3>
          </button>
          <Button
            aria-label={`Open ${product.name} record`}
            className="size-8 shrink-0 rounded-full"
            onClick={onOpen}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Button>
        </div>

        <div className="mt-2 flex min-w-0 items-center justify-between gap-2 border-t border-border pt-2">
          <span className="truncate text-[13px] font-semibold tabular-nums">
            {product.price > 0 ? formatNaira(product.price) : "Needs price"}
          </span>
          <span className="shrink-0 text-[9px] font-medium text-muted-foreground">
            {stock.available} available
            {item.variantCount ? ` · ${item.variantCount} variants` : ""}
          </span>
        </div>

        {item.attention.length ? (
          <p className="mt-1.5 truncate text-[9px] font-medium text-warning-surface-foreground">
            {item.attention.length} inventory alert
            {item.attention.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
