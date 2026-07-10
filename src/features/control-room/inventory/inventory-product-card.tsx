"use client";

import Image from "next/image";
import { ArrowRight, Expand } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getProductDescriptor } from "@/features/control-room/inventory/inventory-labels";
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
      className="group h-full min-w-0 gap-0 overflow-hidden py-0 shadow-laitstyle-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-laitstyle motion-reduce:transform-none"
      data-inventory-card
      data-state={selected ? "selected" : undefined}
    >
      <div className="relative aspect-[5/6] overflow-hidden bg-surface-sunken">
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
            sizes="(min-width: 1280px) 18vw, (min-width: 768px) 30vw, 50vw"
            src={item.coverImage.url}
          />
          <span className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-full border border-border bg-surface-raised/92 text-surface-raised-foreground opacity-0 shadow-laitstyle-sm backdrop-blur transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
            <Expand aria-hidden="true" className="size-3.5" />
            <span className="sr-only">Preview images</span>
          </span>
        </button>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-2">
          <label className="pointer-events-auto grid size-9 cursor-pointer place-items-center rounded-full border border-border bg-surface-raised/92 shadow-laitstyle-sm backdrop-blur-sm">
            <span className="sr-only">Select {product.name}</span>
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelectedChange(Boolean(checked))}
            />
          </label>
          <InventoryStatusBadge health={item.health} />
        </div>
      </div>

      <CardContent className="flex min-w-0 flex-1 flex-col gap-2.5 px-3 py-3">
        <button
          className="min-w-0 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={onOpen}
          type="button"
        >
          <p className="truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {product.category} · {item.reference}
          </p>
          <h3 className="mt-1 line-clamp-2 text-[14px] font-semibold leading-[1.25]">
            {product.name}
          </h3>
          <p className="mt-1 truncate text-[10.5px] text-muted-foreground">
            {getProductDescriptor(product)}
          </p>
        </button>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
          <span className="text-[14px] font-semibold tabular-nums">
            {product.price > 0 ? formatNaira(product.price) : "Needs price"}
          </span>
          {item.variantCount ? (
            <Badge className="shrink-0" variant="secondary">
              {item.variantCount} variants
            </Badge>
          ) : null}
        </div>

        <div className="grid grid-cols-3 divide-x divide-border rounded-xl bg-surface-sunken px-1 py-2">
          <StockFigure label="Available" value={stock.available} />
          <StockFigure label="Held" value={stock.reserved} />
          <StockFigure label="Sold" value={stock.sold} />
        </div>

        {item.attention.length ? (
          <p className="line-clamp-1 text-[10px] font-medium text-warning-surface-foreground">
            {item.attention.length} inventory alert{item.attention.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="mt-auto min-w-0 justify-between gap-2 border-t border-border px-3 py-2">
        <span className="min-w-0 truncate text-[9.5px] text-muted-foreground">
          {product.publication === "published" ? "Visible" : "Not visible"} · {product.channels.length} channel
          {product.channels.length === 1 ? "" : "s"}
        </span>
        <Button
          aria-label={`Open ${product.name} record`}
          className="size-9 shrink-0 rounded-full"
          onClick={onOpen}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

function StockFigure({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 px-1 text-center">
      <div className="font-serif text-[17px] font-medium leading-none tabular-nums">
        {value}
      </div>
      <div className="mt-1 truncate text-[8px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
