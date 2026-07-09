import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  channelLabels,
  getProductDescriptor,
  inventoryModeLabels,
} from "@/features/control-room/inventory/inventory-labels";
import { InventoryStatusBadge } from "@/features/control-room/inventory/inventory-status-badge";
import { formatNaira } from "@/lib/control-room/formatters";
import type { InventoryListItem } from "@/lib/control-room/types";

export function ProductSummaryPanel({ item }: { item: InventoryListItem }) {
  const { product, stock } = item;

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[16px] bg-secondary">
        <Image
          alt={item.coverImage.alt}
          className="object-cover"
          fill
          sizes="(min-width: 1024px) 260px, 100vw"
          src={item.coverImage.url}
        />
      </div>
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <InventoryStatusBadge health={item.health} />
              <Badge variant="outline">
                {inventoryModeLabels[product.inventoryMode]}
              </Badge>
            </div>
            <CardTitle className="font-serif text-[28px] font-medium leading-tight">
              {product.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-[13px] leading-6 text-muted-foreground">
              {product.description}
            </p>
            <dl className="grid grid-cols-2 gap-3 text-[12px]">
              <DetailTerm label="Reference" value={item.reference} />
              <DetailTerm label="Category" value={product.category} />
              <DetailTerm label="Collection" value={product.collection ?? "No collection"} />
              <DetailTerm label="Brand" value={product.brand} />
              <DetailTerm label="Product detail" value={getProductDescriptor(product)} />
              <DetailTerm label="Publication" value={product.publication} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid grid-cols-3 gap-3 py-5">
            <Quantity label="Available" value={stock.available} />
            <Quantity label="Reserved" value={stock.reserved} />
            <Quantity label="Sold" value={stock.sold} />
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          {product.channels.length ? (
            product.channels.map((channel) => (
              <Badge key={channel} variant="secondary">
                {channelLabels[channel]}
              </Badge>
            ))
          ) : (
            <Badge variant="outline">No selling channel</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductMediaPanel({ item }: { item: InventoryListItem }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {item.product.media.map((media) => (
        <figure className="overflow-hidden rounded-[16px] border border-border bg-card" key={media.id}>
          <div className="relative aspect-[4/5] bg-secondary">
            <Image
              alt={media.alt}
              className="object-cover"
              fill
              sizes="(min-width: 640px) 340px, 100vw"
              src={media.url}
            />
          </div>
          <figcaption className="flex items-center justify-between gap-3 px-4 py-3 text-[11px] text-muted-foreground">
            <span>{media.alt}</span>
            <Badge variant="outline">{media.kind}</Badge>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function ProductPricingPanel({ item }: { item: InventoryListItem }) {
  const { product } = item;
  const margin = product.price > 0 ? product.price - product.cost : 0;
  const marginRate = product.price > 0 ? Math.round((margin / product.price) * 100) : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <PricingCard label="Selling price" value={product.price > 0 ? formatNaira(product.price) : "Not set"} />
      <PricingCard label="Acquisition cost" value={formatNaira(product.cost)} />
      <PricingCard
        label="Reference price"
        value={product.referencePrice ? formatNaira(product.referencePrice) : "Not recorded"}
      />
      <PricingCard
        label="Gross margin"
        value={product.price > 0 ? `${formatNaira(margin)} · ${marginRate}%` : "Available after pricing"}
      />
    </div>
  );
}

function DetailTerm({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[12px] bg-secondary/60 p-3">
      <dt className="text-[9.5px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 truncate font-medium capitalize text-foreground">{value}</dd>
    </div>
  );
}

function Quantity({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-serif text-[28px] font-medium leading-none tabular-nums">{value}</div>
      <div className="mt-1.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function PricingCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-2 font-serif text-[25px] font-medium leading-tight tabular-nums">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
