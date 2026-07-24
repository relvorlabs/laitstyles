"use client";

import { Edit02Icon } from "@hugeicons/core-free-icons";
import Image from "next/image";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProductEditorController } from "@/features/admin/product-editor/product-editor-controller";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import type { InventoryListItem } from "@/lib/admin/shared/types";

export function InventoryIntakeQueue({
  items,
  totalItems = items.length,
}: {
  items: InventoryListItem[];
  totalItems?: number;
}) {
  const { openExistingProduct } = useProductEditorController();

  return (
    <section aria-labelledby="intake-queue-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Same product record · persistent catalogue
          </p>
          <h2
            className="mt-2 font-serif text-[28px] font-medium leading-tight"
            id="intake-queue-title"
          >
            Intake products
          </h2>
          <p className="mt-2 max-w-[680px] text-[12.5px] leading-5 text-muted-foreground">
            Continue each Prisma-backed product in the seven-step editor. Intake stage transitions
            stay unavailable until the intake workflow itself is migrated to persistent storage.
          </p>
        </div>
        <Badge variant="outline">
          {totalItems} product{totalItems === 1 ? "" : "s"}
        </Badge>
      </div>

      <Alert>
        <AlertTitle>Intake transitions are read-only in this phase</AlertTitle>
        <AlertDescription>
          Product details and drafts persist after reload. Moving products between operational
          intake stages belongs to the later admin-domain cutover and is not simulated in memory.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.product.id}>
            <CardContent className="grid gap-5 py-5 md:grid-cols-[96px_minmax(0,1fr)_auto] md:items-center">
              <div className="relative aspect-[4/5] w-24 overflow-hidden rounded-[12px] bg-secondary">
                <Image
                  alt={item.coverImage.alt || item.product.name}
                  className="object-cover"
                  fill
                  sizes="96px"
                  src={item.coverImage.url}
                />
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
                  Edit identity, media, stock, pricing and fulfilment on this same persistent
                  product record.
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
