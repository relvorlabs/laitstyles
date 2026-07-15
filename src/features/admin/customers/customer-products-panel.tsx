import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatCustomerDate } from "@/features/admin/customers/customer-labels";
import type { AdminState, CustomerProductRelationship } from "@/lib/admin/types";

export function CustomerProductsPanel({
  state,
  relationships,
}: {
  state: AdminState;
  relationships: CustomerProductRelationship[];
}) {
  const productById = new Map(state.products.map((product) => [product.id, product]));
  const items = relationships.flatMap((relationship) => {
    const product = productById.get(relationship.productId);
    return product ? [{ product, relationship }] : [];
  });

  if (!items.length) {
    return (
      <p className="rounded-[16px] border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">
        No purchased, held, saved or reviewed products are connected yet.
      </p>
    );
  }

  return (
    <section aria-labelledby="customer-products-title">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Product context
        </p>
        <h2 className="mt-2 font-serif text-[26px] font-medium" id="customer-products-title">
          Purchased, held, saved & reviewed
        </h2>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map(({ product, relationship }) => (
          <Link
            className="group flex min-w-0 gap-4 rounded-[16px] border border-border bg-card p-3 transition-colors hover:bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={`/admin/inventory?product=${encodeURIComponent(product.id)}`}
            key={product.id}
          >
            <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-[12px] bg-secondary">
              <Image
                alt={product.media[0]?.alt ?? `${product.name} product image`}
                className="object-cover transition-transform group-hover:scale-[1.03] motion-reduce:transform-none"
                fill
                sizes="80px"
                src={product.image}
              />
            </div>
            <div className="min-w-0 flex-1 py-1">
              <h3 className="truncate text-sm font-semibold">{product.name}</h3>
              <p className="mt-1 truncate text-[10.5px] text-muted-foreground">
                {product.category} · {product.inventoryMode.replaceAll("-", " ")}
              </p>
              <RelationshipBadges relationship={relationship} />
              <p className="mt-3 text-[10.5px] text-muted-foreground">
                Last interaction {formatCustomerDate(relationship.lastInteractionAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RelationshipBadges({ relationship }: { relationship: CustomerProductRelationship }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {relationship.purchasedQuantity > 0 ? (
        <Badge variant="secondary">Bought {relationship.purchasedQuantity}</Badge>
      ) : null}
      {relationship.heldQuantity > 0 ? (
        <Badge variant="outline">Held {relationship.heldQuantity}</Badge>
      ) : null}
      {relationship.saved ? <Badge variant="outline">Saved</Badge> : null}
      {relationship.reviewed ? <Badge variant="outline">Reviewed</Badge> : null}
    </div>
  );
}
