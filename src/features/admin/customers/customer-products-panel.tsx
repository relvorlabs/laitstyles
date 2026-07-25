import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatCustomerDate } from "@/features/admin/customers/customer-labels";
import type { CustomerProductRelationship } from "@/modules/customers/types";

export function CustomerProductsPanel({
  relationships,
}: {
  relationships: CustomerProductRelationship[];
}) {
  if (!relationships.length) {
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
        {relationships.map((relationship) => (
          <Link
            className="group flex min-w-0 gap-4 rounded-[16px] border border-border bg-card p-3 transition-colors hover:bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={`/admin/inventory?product=${encodeURIComponent(relationship.productId)}`}
            key={relationship.productId}
          >
            <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-[12px] bg-secondary">
              <Image
                alt={relationship.imageAlt}
                className="object-cover transition-transform group-hover:scale-[1.03] motion-reduce:transform-none"
                fill
                sizes="80px"
                src={relationship.image}
              />
            </div>
            <div className="min-w-0 flex-1 py-1">
              <h3 className="truncate text-sm font-semibold">{relationship.productName}</h3>
              <p className="mt-1 truncate text-[10.5px] text-muted-foreground">
                {relationship.category} · {relationship.inventoryMode.replaceAll("-", " ")}
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
