import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { OverviewInventoryItem } from "@/modules/overview/types";

export function InventoryWatch({
  lowStock,
  lowStockCount,
  unpublished,
  unpublishedCount,
}: {
  lowStock: OverviewInventoryItem[];
  lowStockCount: number;
  unpublished: OverviewInventoryItem[];
  unpublishedCount: number;
}) {
  return (
    <section
      aria-labelledby="inventory-watch-heading"
      className="scroll-mt-24 border-t border-border pt-6"
      id="inventory-watch"
    >
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Inventory watch
      </p>
      <h2
        className="mt-1.5 font-serif text-[24px] font-medium leading-tight"
        id="inventory-watch-heading"
      >
        Protect the catalogue before stock becomes a surprise.
      </h2>

      <h3 className="mt-5 flex items-baseline justify-between gap-3 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Low stock
        <span className="tabular-nums">{lowStockCount}</span>
      </h3>
      {lowStock.length ? (
        <div className="mt-1 divide-y divide-border">
          {lowStock.map((product) => (
            <LowStockRow key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[12.5px] leading-5 text-muted-foreground">
          No active product is below its stock threshold.
        </p>
      )}

      <h3 className="mt-6 flex items-baseline justify-between gap-3 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Not visible to shoppers
        <span className="tabular-nums">{unpublishedCount}</span>
      </h3>
      {unpublished.length ? (
        <div className="mt-1 divide-y divide-border">
          {unpublished.map((product) => (
            <UnpublishedRow key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[12.5px] leading-5 text-muted-foreground">
          Every active product is visible on its intended channel.
        </p>
      )}
    </section>
  );
}

function LowStockRow({ product }: { product: OverviewInventoryItem }) {
  return (
    <article className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 py-3">
      <div className="relative aspect-[4/5] w-10 overflow-hidden rounded-sm bg-secondary">
        <Image
          alt={product.imageAlt}
          className="object-cover"
          fill
          sizes="40px"
          src={product.image}
        />
      </div>
      <div className="min-w-0">
        <h4 className="truncate text-[13px] font-semibold">{product.name}</h4>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {modeLabel(product)} · threshold {product.lowStockThreshold}
          {product.reserved ? ` · ${product.reserved} reserved` : ""}
        </p>
      </div>
      <div className="text-right">
        <span className="font-serif text-[20px] font-medium leading-none tabular-nums text-oxblood">
          {product.available}
        </span>
        <span className="block font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          left
        </span>
      </div>
    </article>
  );
}

function UnpublishedRow({ product }: { product: OverviewInventoryItem }) {
  return (
    <article className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 py-3">
      <div className="relative aspect-[4/5] w-10 overflow-hidden rounded-sm bg-secondary">
        <Image
          alt={product.imageAlt}
          className="object-cover opacity-80"
          fill
          sizes="40px"
          src={product.image}
        />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="truncate text-[13px] font-semibold">{product.name}</h4>
          <Badge variant="outline">{product.lifecycle}</Badge>
        </div>
        <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
          {product.publication === "published"
            ? "Published record waiting for its next inventory step."
            : "Not currently visible on the customer storefront."}
        </p>
      </div>
    </article>
  );
}

function modeLabel(product: OverviewInventoryItem) {
  if (product.inventoryMode === "unique") return "Unique piece";
  if (product.inventoryMode === "stocked") return "Stocked product";
  return `${product.variantCount} variants`;
}
