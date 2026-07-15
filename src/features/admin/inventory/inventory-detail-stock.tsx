import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InventoryListItem } from "@/lib/admin/types";

export function ProductStockPanel({ item }: { item: InventoryListItem }) {
  const { product } = item;

  if (product.inventoryMode === "variant") {
    return (
      <div className="flex flex-col gap-4">
        <StockTotals item={item} />
        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border px-4 py-4 sm:px-5">
            <CardTitle className="text-[13px]">Variant availability</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.variants.map((variant) => (
                    <TableRow key={variant.id}>
                      <TableCell className="font-medium">{variant.label}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {variant.sku}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {variant.stock.available}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {variant.stock.reserved}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {variant.stock.sold}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="divide-y divide-border sm:hidden">
              {product.variants.map((variant) => (
                <article className="px-4 py-4" key={variant.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[13px] font-semibold">{variant.label}</h3>
                      <p className="mt-1 text-[10.5px] text-muted-foreground">{variant.sku}</p>
                    </div>
                    <Badge variant="secondary">{variant.stock.available} available</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-[12px] bg-secondary/60 p-3">
                    <MiniQuantity label="Received" value={variant.stock.totalReceived} />
                    <MiniQuantity label="Reserved" value={variant.stock.reserved} />
                    <MiniQuantity label="Sold" value={variant.stock.sold} />
                  </div>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <StockTotals item={item} />
      <Card>
        <CardHeader>
          <CardTitle className="text-[13px]">
            {product.inventoryMode === "unique" ? "Physical piece" : "Stock reference"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {product.inventoryMode === "unique" ? (
            <>
              <Reference label="Archive number" value={product.archiveNumber} />
              <Reference label="Condition" value={product.condition} />
              <Reference label="Size" value={product.size} />
              <Reference label="Colour" value={product.colour} />
              {product.measurements.map((measurement) => (
                <Reference
                  key={measurement.label}
                  label={measurement.label}
                  value={measurement.value}
                />
              ))}
            </>
          ) : (
            <>
              <Reference label="SKU" value={product.sku} />
              <Reference label="Size" value={product.sizeLabel} />
              <Reference label="Colour" value={product.colour} />
              <Reference label="Low-stock threshold" value={`${product.lowStockThreshold} units`} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StockTotals({ item }: { item: InventoryListItem }) {
  const { stock } = item;
  const figures = [
    ["Received", stock.totalReceived],
    ["Available", stock.available],
    ["Reserved", stock.reserved],
    ["Sold", stock.sold],
    ["Returned", stock.returned],
    ["Damaged", stock.damaged],
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {figures.map(([label, value]) => (
        <Card key={label}>
          <CardContent className="py-5">
            <div className="font-serif text-[28px] font-medium leading-none tabular-nums">
              {value}
            </div>
            <div className="mt-2 text-[9.5px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
              {label}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Reference({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-secondary/60 p-3">
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-[12px] font-medium">{value}</div>
    </div>
  );
}

function MiniQuantity({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-serif text-[20px] font-medium leading-none tabular-nums">{value}</div>
      <div className="mt-1 text-[8.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
