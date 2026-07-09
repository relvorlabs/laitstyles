import { Card, CardContent } from "@/components/ui/card";
import { formatNaira } from "@/lib/control-room/formatters";
import type { InventoryListItem } from "@/lib/control-room/types";

export function ProductPricingPanel({ item }: { item: InventoryListItem }) {
  const { product } = item;
  const margin = product.price > 0 ? product.price - product.cost : 0;
  const marginRate =
    product.price > 0 ? Math.round((margin / product.price) * 100) : 0;
  const figures = [
    ["Selling price", product.price > 0 ? formatNaira(product.price) : "Not set"],
    ["Acquisition cost", formatNaira(product.cost)],
    [
      "Reference price",
      product.referencePrice
        ? formatNaira(product.referencePrice)
        : "Not recorded",
    ],
    [
      "Gross margin",
      product.price > 0
        ? `${formatNaira(margin)} · ${marginRate}%`
        : "Available after pricing",
    ],
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {figures.map(([label, value]) => (
        <Card key={label}>
          <CardContent className="py-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
              {label}
            </div>
            <div className="mt-2 break-words font-serif text-[25px] font-medium leading-tight tabular-nums">
              {value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
