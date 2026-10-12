"use client";

import { Edit02Icon } from "@hugeicons/core-free-icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CloudImage } from "@/components/ui/cloud-image";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import type { InventoryListItem } from "@/lib/admin/shared/types";
import { useProductEditorController } from "@/modules/products/ui/admin/product-editor/product-editor-controller";

export function InventoryIntakeQueue({
  items,
  totalItems = items.length,
}: {
  items: InventoryListItem[];
  totalItems?: number;
}) {
  const { openExistingProduct } = useProductEditorController();
  const visibleItems = uniqueInventoryItems(items);

  return (
    <section aria-labelledby="intake-queue-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Product intake · catalogue
          </p>
          <h2
            className="mt-2 font-serif text-[28px] font-medium leading-tight"
            id="intake-queue-title"
          >
            Intake products
          </h2>
          <p className="mt-2 max-w-[680px] text-[12.5px] leading-5 text-muted-foreground">
            Continue each product in the seven-step editor to complete its details, media, stock,
            pricing and delivery information.
          </p>
        </div>
        <Badge variant="outline">
          {totalItems} product{totalItems === 1 ? "" : "s"}
        </Badge>
      </div>

      <Alert>
        <AlertTitle>Stage changes are not available yet</AlertTitle>
        <AlertDescription>
          You can safely edit and save each product now. Moving products between intake stages will
          be added when that workflow is ready.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {visibleItems.map((item) => (
          <Card key={`inventory-intake:${item.product.id}`}>
            <CardContent className="grid gap-5 py-5 md:grid-cols-[96px_minmax(0,1fr)_auto] md:items-center">
              <div className="relative aspect-[4/5] w-24 overflow-hidden rounded-[12px] bg-secondary">
                {item.coverImage.url ? (
                  <CloudImage
                    alt={item.coverImage.alt || item.product.name}
                    className="object-cover"
                    fill
                    sizes="96px"
                    src={item.coverImage.url}
                  />
                ) : (
                  <span
                    aria-label={`${item.product.name} image unavailable`}
                    className="grid size-full place-items-center px-2 text-center text-[10px] text-muted-foreground"
                    role="img"
                  >
                    Image unavailable
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>Intake</Badge>
                  <Badge variant="outline">{item.reference}</Badge>
                </div>
                <h3 className="mt-3 font-serif text-[24px] font-medium leading-tight">
                  {item.product.name}
                </h3>
                <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
                  Edit the product information customers will see and the stock details your team
                  will use.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button
                  size="lg"
                  onClick={() => openExistingProduct(item.product.id)}
                  type="button"
                  variant="outline"
                >
                  <AdminIcon icon={Edit02Icon} size={16} />
                  Continue product
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function uniqueInventoryItems(items: readonly InventoryListItem[]): InventoryListItem[] {
  const byProductId = new Map<string, InventoryListItem>();
  for (const item of items) {
    if (!item?.product.id) continue;
    byProductId.set(item.product.id, item);
  }
  return Array.from(byProductId.values());
}
