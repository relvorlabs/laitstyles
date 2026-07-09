import Image from "next/image";
import { PackageIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import { SectionHeading } from "@/features/control-room/shared/section-heading";
import { getProductStock } from "@/lib/control-room/selectors";
import type { InventoryProduct } from "@/lib/control-room/types";

export function InventoryWatch({
  lowStock,
  unpublished,
}: {
  lowStock: InventoryProduct[];
  unpublished: InventoryProduct[];
}) {
  return (
    <section className="scroll-mt-24" id="inventory-watch">
      <SectionHeading
        description="Recognition first: see the product, the available quantity and why it needs attention without opening a table."
        eyebrow="Inventory watch"
        title="Protect the catalogue before stock becomes a surprise."
      />

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border px-5 py-4 sm:px-6">
            <CardTitle className="flex items-center justify-between gap-3 text-[13px]">
              <span>Low-stock products</span>
              <Badge variant="secondary">{lowStock.length}</Badge>
            </CardTitle>
            <CardDescription className="text-[12px]">
              Available quantity is at or below each product’s threshold.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {lowStock.length ? (
              <div className="divide-y divide-border">
                {lowStock.slice(0, 4).map((product) => (
                  <ProductWatchRow key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <InventoryClearState message="No active product is below its stock threshold." />
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border px-5 py-4 sm:px-6">
            <CardTitle className="flex items-center justify-between gap-3 text-[13px]">
              <span>Not visible to shoppers</span>
              <Badge variant="outline">{unpublished.length}</Badge>
            </CardTitle>
            <CardDescription className="text-[12px]">
              Intake, draft or unpublished records that need a decision.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {unpublished.length ? (
              <div className="divide-y divide-border">
                {unpublished.slice(0, 4).map((product) => (
                  <UnpublishedRow key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <InventoryClearState message="Every active product is visible on its intended channel." />
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function ProductWatchRow({ product }: { product: InventoryProduct }) {
  const inventory = getProductStock(product);

  return (
    <article className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:px-5">
      <div className="relative aspect-[4/5] w-16 overflow-hidden rounded-[10px] bg-secondary">
        <Image
          alt={product.name}
          className="object-cover"
          fill
          sizes="64px"
          src={product.image}
        />
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-[13.5px] font-semibold">{product.name}</h3>
        <p className="mt-1 truncate text-[11.5px] text-muted-foreground">
          {modeLabel(product)} · threshold {product.lowStockThreshold}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="secondary">{inventory.available} available</Badge>
          {inventory.reserved ? (
            <Badge variant="outline">{inventory.reserved} reserved</Badge>
          ) : null}
        </div>
      </div>
      <div className="text-right">
        <div className="font-serif text-[24px] font-medium tabular-nums">
          {inventory.available}
        </div>
        <div className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          left
        </div>
      </div>
    </article>
  );
}

function UnpublishedRow({ product }: { product: InventoryProduct }) {
  return (
    <article className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 px-4 py-4 sm:px-5">
      <div className="relative aspect-[4/5] w-14 overflow-hidden rounded-[10px] bg-secondary">
        <Image
          alt={product.name}
          className="object-cover opacity-80"
          fill
          sizes="56px"
          src={product.image}
        />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-[13.5px] font-semibold">{product.name}</h3>
          <Badge variant="outline">{product.lifecycle}</Badge>
        </div>
        <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
          {product.publication === "published"
            ? "Published record waiting for its next inventory step."
            : "Not currently visible on the customer storefront."}
        </p>
      </div>
    </article>
  );
}

function InventoryClearState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-secondary text-[#4A5540]">
        <ControlRoomIcon icon={PackageIcon} size={21} />
      </span>
      <p className="mt-4 max-w-[320px] text-[13px] leading-5 text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

function modeLabel(product: InventoryProduct) {
  if (product.inventoryMode === "unique") return "Unique piece";
  if (product.inventoryMode === "stocked") return "Stocked product";
  return `${product.variants.length} variants`;
}
