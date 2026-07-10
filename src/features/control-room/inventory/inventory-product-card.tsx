"use client";

import Image from "next/image";
import { ArrowRight, Expand } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getProductDescriptor,
  inventoryModeLabels,
} from "@/features/control-room/inventory/inventory-labels";
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
      className="group h-full min-h-[500px] min-w-0 gap-0 overflow-hidden py-0 shadow-laitstyle-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-laitstyle motion-reduce:transform-none"
      data-inventory-card
      data-state={selected ? "selected" : undefined}
    >
      <div className="relative aspect-[4/5] min-h-[250px] overflow-hidden bg-surface-sunken">
        <button
          aria-label={`View images for ${product.name}`}
          className="absolute inset-0 block size-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          onClick={onOpenMedia}
          type="button"
        >
          <Image
            alt={item.coverImage.alt}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transition-none"
            fill
            sizes="(min-width: 1700px) 220px, (min-width: 1024px) 24vw, (min-width: 768px) 32vw, 100vw"
            src={item.coverImage.url}
          />
          <span className="absolute inset-x-3 bottom-3 flex min-h-10 items-center justify-center gap-2 rounded-full border border-border bg-surface-raised/92 px-3 text-[11px] font-semibold text-surface-raised-foreground opacity-0 shadow-laitstyle-sm backdrop-blur transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
            <Expand aria-hidden="true" className="size-3.5" />
            Preview images
          </span>
        </button>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
          <label className="pointer-events-auto grid size-10 cursor-pointer place-items-center rounded-full border border-border bg-surface-raised/92 shadow-laitstyle-sm backdrop-blur-sm">
            <span className="sr-only">Select {product.name}</span>
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelectedChange(Boolean(checked))}
            />
          </label>
          <InventoryStatusBadge health={item.health} />
        </div>
      </div>

      <CardContent className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4">
        <button
          className="min-w-0 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={onOpen}
          type="button"
        >
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {product.category} · {item.reference}
          </p>
          <h3 className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-[1.3]">
            {product.name}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-muted-foreground">
            {getProductDescriptor(product)}
          </p>
        </button>

        <div className="flex items-end justify-between gap-3 border-t border-border pt-3">
          <span className="text-[16px] font-semibold tabular-nums">
            {product.price > 0 ? formatNaira(product.price) : "Needs price"}
          </span>
          <Badge className="max-w-[116px] truncate" variant="outline">
            {inventoryModeLabels[product.inventoryMode]}
          </Badge>
        </div>

        <div className="grid grid-cols-3 divide-x divide-border rounded-2xl bg-surface-sunken px-1 py-3">
          <StockFigure label="Available" value={stock.available} />
          <StockFigure label="Held" value={stock.reserved} />
          <StockFigure label="Sold" value={stock.sold} />
        </div>

        {item.variantCount || item.attention.length ? (
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {item.variantCount ? (
              <Badge variant="secondary">{item.variantCount} variants</Badge>
            ) : null}
            {item.attention.length ? (
              <Badge variant="secondary">
                {item.attention.length} alert
                {item.attention.length === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </div>
        ) : (
          <p className="text-[11px] leading-5 text-muted-foreground">
            No inventory exception needs attention.
          </p>
        )}
      </CardContent>

      <CardFooter className="mt-auto min-w-0 justify-between gap-2 border-t border-border px-4 py-3">
        <span className="min-w-0 truncate text-[10.5px] text-muted-foreground">
          {product.publication === "published" ? "Visible" : "Not visible"} · {product.channels.length} channel
          {product.channels.length === 1 ? "" : "s"}
        </span>
        <Button
          aria-label={`Open ${product.name} record`}
          className="h-9 shrink-0 rounded-full px-3 text-[11px]"
          onClick={onOpen}
          size="sm"
          type="button"
          variant="ghost"
        >
          Open record
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}

function StockFigure({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 px-1.5 text-center">
      <div className="font-serif text-[19px] font-medium leading-none tabular-nums">
        {value}
      </div>
      <div className="mt-1.5 truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
