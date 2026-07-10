import { Card, CardContent } from "@/components/ui/card";
import { formatNaira } from "@/lib/control-room/formatters";
import type { InventoryListItem } from "@/lib/control-room/types";

export function ProductPricingPanel({ item }: { item: InventoryListItem }) {
  const { product } = item;
  const hasUnitCost = product.cost !== null;
  const margin =
    hasUnitCost && product.price > 0 ? product.price - product.cost : null;
  const marginRate =
    margin !== null && product.price > 0
      ? Math.round((margin / product.price) * 100)
      : null;
  const prices = [
    [
      "Selling price",
      product.price > 0 ? formatNaira(product.price) : "Not set",
    ],
    ["Unit cost", hasUnitCost ? formatNaira(product.cost) : "Not recorded"],
    [
      "Compare-at price",
      product.referencePrice
        ? formatNaira(product.referencePrice)
        : "Not recorded",
    ],
    [
      "Gross margin",
      margin !== null && marginRate !== null
        ? `${formatNaira(margin)} · ${marginRate}%`
        : "Add unit cost",
    ],
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {prices.map(([label, value]) => (
        <Card key={label}>
          <CardContent className="py-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
              {label}
            </div>
            <div className="mt-2 font-serif text-[25px] font-medium leading-tight tabular-nums">
              {value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
