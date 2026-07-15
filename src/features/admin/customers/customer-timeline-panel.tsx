import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  customerTimelineLabels,
  formatCustomerDateTime,
} from "@/features/admin/customers/customer-labels";
import type { CustomerTimelineEvent } from "@/lib/admin/customer-types";

export function CustomerTimelinePanel({ events }: { events: CustomerTimelineEvent[] }) {
  if (!events.length) {
    return (
      <p className="rounded-[16px] border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">
        No connected order, payment, delivery, hold, return or review events yet.
      </p>
    );
  }

  return (
    <section aria-labelledby="customer-timeline-title">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Connected history
        </p>
        <h2 className="mt-2 font-serif text-[26px] font-medium" id="customer-timeline-title">
          Relationship timeline
        </h2>
      </div>
      <ol className="mt-5 flex flex-col gap-3">
        {events.map((event) => {
          const href = getEventHref(event);
          const content = (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{customerTimelineLabels[event.kind]}</Badge>
                  <span className="text-[10.5px] text-muted-foreground">
                    {formatCustomerDateTime(event.occurredAt)}
                  </span>
                </div>
                <h3 className="mt-3 break-words text-sm font-semibold text-foreground">
                  {event.title}
                </h3>
                <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                  {event.detail}
                </p>
              </div>
              {href ? (
                <span className="shrink-0 text-[11px] font-semibold text-foreground underline underline-offset-4">
                  Open record
                </span>
              ) : null}
            </div>
          );

          return (
            <li key={event.id}>
              {href ? (
                <Link
                  className="block rounded-[16px] border border-border bg-card p-4 transition-colors hover:bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={href}
                >
                  {content}
                </Link>
              ) : (
                <article className="rounded-[16px] border border-border bg-card p-4">
                  {content}
                </article>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function getEventHref(event: CustomerTimelineEvent) {
  if (event.orderId) {
    return `/admin/orders?order=${encodeURIComponent(event.orderId)}`;
  }
  if (event.productId) {
    return `/admin/inventory?product=${encodeURIComponent(event.productId)}`;
  }
  return null;
}
