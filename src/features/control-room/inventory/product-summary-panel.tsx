import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  channelLabels,
  getProductDescriptor,
  inventoryModeLabels,
} from "@/features/control-room/inventory/inventory-labels";
import { InventoryStatusBadge } from "@/features/control-room/inventory/inventory-status-badge";
import type { InventoryListItem } from "@/lib/control-room/types";

export function ProductSummaryPanel({ item }: { item: InventoryListItem }) {
  const { product, stock } = item;
  const details = [
    ["Reference", item.reference],
    ["Category", product.category],
    ["Collection", product.collection ?? "No collection"],
    ["Brand", product.brand],
    ["Product detail", getProductDescriptor(product)],
    ["Publication", product.publication],
  ] as const;
  const quantities = [
    ["Available", stock.available],
    ["Reserved", stock.reserved],
    ["Sold", stock.sold],
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[16px] bg-secondary">
        <Image
          alt={item.coverImage.alt}
          className="object-cover"
          fill
          sizes="(min-width: 640px) 220px, 100vw"
          src={item.coverImage.url}
        />
      </div>

      <div className="min-w-0 space-y-4">
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
          <CardContent className="space-y-4">
            <p className="text-[13px] leading-6 text-muted-foreground">
              {product.description}
            </p>
            <dl className="grid gap-3 text-[12px] sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div
                  className="min-w-0 rounded-[12px] bg-secondary/60 p-3"
                  key={label}
                >
                  <dt className="text-[9.5px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-1 break-words font-medium capitalize text-foreground">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid grid-cols-3 gap-3 py-5">
            {quantities.map(([label, value]) => (
              <div key={label}>
                <div className="font-serif text-[28px] font-medium leading-none tabular-nums">
                  {value}
                </div>
                <div className="mt-1.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {label}
                </div>
              </div>
            ))}
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
