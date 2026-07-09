"use client";

import Image from "next/image";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getProductDescriptor,
  inventoryModeLabels,
} from "@/features/control-room/inventory/inventory-labels";
import { InventoryStatusBadge } from "@/features/control-room/inventory/inventory-status-badge";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import { formatNaira } from "@/lib/control-room/formatters";
import type { InventoryListItem } from "@/lib/control-room/types";

type InventoryProductCardProps = {
  item: InventoryListItem;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  onOpen: () => void;
};

export function InventoryProductCard({
  item,
  selected,
  onSelectedChange,
  onOpen,
}: InventoryProductCardProps) {
  const { product, stock } = item;

  return (
    <Card
      className="group overflow-hidden py-0 transition-shadow hover:shadow-[0_18px_50px_rgba(27,26,23,.10)]"
      data-state={selected ? "selected" : undefined}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
        <Image
          alt={item.coverImage.alt}
          className="object-cover transition-transform duration-300 group-hover:scale-[1.015] motion-reduce:transition-none"
          fill
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 33vw, 100vw"
          src={item.coverImage.url}
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
          <label className="grid size-11 cursor-pointer place-items-center rounded-full bg-background/92 shadow-sm backdrop-blur-sm">
            <span className="sr-only">Select {product.name}</span>
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelectedChange(checked)}
            />
          </label>
          <InventoryStatusBadge health={item.health} />
        </div>
      </div>

      <CardContent className="flex flex-col gap-4 px-4 py-4">
        <button
          className="rounded-[8px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={onOpen}
          type="button"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {product.category} · {item.reference}
              </p>
              <h3 className="mt-1.5 text-[15px] font-semibold leading-5">
                {product.name}
              </h3>
              <p className="mt-1 line-clamp-1 text-[11.5px] text-muted-foreground">
                {getProductDescriptor(product)}
              </p>
            </div>
            <span className="shrink-0 text-[14px] font-semibold tabular-nums">
              {product.price > 0 ? formatNaira(product.price) : "Needs price"}
            </span>
          </div>
        </button>

        <div className="grid grid-cols-3 gap-2 rounded-[13px] bg-secondary/65 p-3">
          <StockFigure label="Available" value={stock.available} />
          <StockFigure label="Reserved" value={stock.reserved} />
          <StockFigure label="Sold" value={stock.sold} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">
            {inventoryModeLabels[product.inventoryMode]}
          </Badge>
          {item.variantCount ? (
            <Badge variant="secondary">{item.variantCount} variants</Badge>
          ) : null}
          {item.attention.length ? (
            <Badge variant="secondary">
              {item.attention.length} attention item
              {item.attention.length === 1 ? "" : "s"}
            </Badge>
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="justify-between px-4 py-3">
        <span className="text-[10.5px] text-muted-foreground">
          {product.publication === "published" ? "Visible" : "Not visible"} ·{" "}
          {product.channels.length} channel
          {product.channels.length === 1 ? "" : "s"}
        </span>
        <Button
          aria-label={`Open ${product.name}`}
          className="size-9 rounded-full"
          onClick={onOpen}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ControlRoomIcon icon={ArrowRight01Icon} size={16} />
        </Button>
      </CardFooter>
    </Card>
  );
}

function StockFigure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-serif text-[22px] font-medium leading-none tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
