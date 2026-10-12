import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudImage } from "@/components/ui/cloud-image";
import {
  channelLabels,
  getProductDescriptor,
  inventoryModeLabels,
} from "@/modules/inventory/ui/admin/inventory-labels";
import { InventoryStatusBadge } from "@/modules/inventory/ui/admin/inventory-status-badge";
import type { InventoryListItem } from "@/lib/admin/shared/types";

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
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[16px] bg-secondary">
        <CloudImage
          alt={item.coverImage.alt}
          className="object-cover"
          fill
          sizes="(min-width: 1024px) 220px, 100vw"
          src={item.coverImage.url}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <InventoryStatusBadge health={item.health} />
              <Badge variant="outline">{inventoryModeLabels[product.inventoryMode]}</Badge>
            </div>
            <CardTitle className="font-serif text-[28px] font-medium leading-tight">
              {product.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-[13px] leading-6 text-muted-foreground">{product.description}</p>
            <dl className="grid gap-3 text-[12px] sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div className="min-w-0 rounded-[12px] bg-secondary/60 p-3" key={label}>
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
