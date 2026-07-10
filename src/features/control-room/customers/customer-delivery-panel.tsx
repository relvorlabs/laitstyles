import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCustomerDateTime } from "@/features/control-room/customers/customer-labels";
import { orderStatusLabels } from "@/features/control-room/orders/order-labels";
import type { CustomerRelationshipProfile } from "@/lib/control-room/customer-types";

export function CustomerDeliveryPanel({
  profile,
}: {
  profile: CustomerRelationshipProfile;
}) {
  const addresses = profile.customer.addresses ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="customer-addresses-title">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Saved delivery context
          </p>
          <h2 className="mt-2 font-serif text-[26px] font-medium" id="customer-addresses-title">
            Addresses
          </h2>
        </div>
        {addresses.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {addresses.map((address) => (
              <article
                className="min-w-0 rounded-[16px] border border-border bg-card p-4"
                key={address.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="break-words text-sm font-semibold">{address.label}</h3>
                  {address.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                </div>
                <p className="mt-3 break-words text-sm leading-6 text-muted-foreground">
                  {address.line1}
                  {address.line2 ? <><br />{address.line2}</> : null}
                  <br />
                  {address.city}, {address.state}
                </p>
                {address.deliveryNotes ? (
                  <p className="mt-3 break-words rounded-[12px] bg-secondary/65 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
                    {address.deliveryNotes}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-[16px] border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">
            No saved address. Delivery history can still show the city captured on connected orders.
          </p>
        )}
      </section>

      <Separator />

      <section aria-labelledby="customer-delivery-history-title">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Connected orders
          </p>
          <h2 className="mt-2 font-serif text-[26px] font-medium" id="customer-delivery-history-title">
            Delivery history
          </h2>
        </div>
        {profile.deliveryHistory.length ? (
          <div className="mt-5 flex flex-col gap-3">
            {profile.deliveryHistory.map((delivery) => (
              <Link
                className="flex min-w-0 flex-wrap items-start justify-between gap-4 rounded-[16px] border border-border bg-card p-4 transition-colors hover:bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={`/admin/orders?order=${encodeURIComponent(delivery.orderId)}`}
                key={delivery.orderId}
              >
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-semibold">{delivery.orderId}</h3>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {delivery.address?.line1 ?? delivery.city}
                  </p>
                  <p className="mt-1 text-[10.5px] text-muted-foreground">
                    {formatCustomerDateTime(delivery.occurredAt)}
                  </p>
                </div>
                <Badge variant="outline">{orderStatusLabels[delivery.status]}</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-[16px] border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">
            No connected delivery records yet.
          </p>
        )}
      </section>
    </div>
  );
}