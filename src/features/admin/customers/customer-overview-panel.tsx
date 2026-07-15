import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  customerTypeLabels,
  formatCustomerDateTime,
} from "@/features/admin/customers/customer-labels";
import { CustomerNoteForm } from "@/features/admin/customers/customer-note-form";
import type { CustomerRelationshipProfile } from "@/lib/admin/customer-types";
import { formatNaira } from "@/lib/admin/formatters";

export function CustomerOverviewPanel({
  profile,
  onAddNote,
}: {
  profile: CustomerRelationshipProfile;
  onAddNote: (body: string) => string | null;
}) {
  const customer = profile.customer;
  const preferences = customer.preferences;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="customer-summary-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Relationship value
            </p>
            <h2
              className="mt-2 font-serif text-[34px] font-medium tabular-nums"
              id="customer-summary-title"
            >
              {formatNaira(profile.metrics.lifetimeSpend)}
            </h2>
          </div>
          <Badge variant="outline">{customerTypeLabels[customer.type ?? "individual"]}</Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Metric label="Average order" value={formatNaira(profile.metrics.averageOrderValue)} />
          <Metric label="Orders" value={String(profile.metrics.orderCount)} />
          <Metric label="Active holds" value={String(profile.metrics.activeHoldCount)} />
          <Metric label="Returns" value={String(profile.metrics.returnCount)} />
          <Metric label="Reviews" value={String(profile.metrics.reviewCount)} />
          <Metric label="Cancellations" value={String(profile.metrics.cancellationCount)} />
        </div>
      </section>

      <Separator />

      <section aria-labelledby="customer-contact-title">
        <h2 className="font-serif text-[24px] font-medium" id="customer-contact-title">
          Contact & preferences
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[16px] border border-border bg-card p-4 text-sm leading-6">
            <p className="break-words font-semibold text-foreground">
              {customer.email || "No email captured"}
            </p>
            <p className="break-words text-muted-foreground">
              {customer.phone || "No phone captured"}
            </p>
            <p className="break-words text-muted-foreground">
              {customer.city || "No city captured"}
            </p>
          </div>
          <div className="rounded-[16px] border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
            <p className="break-words">
              Preferred contact: {preferences?.contact.replaceAll("-", " ") ?? "Not recorded"}
            </p>
            <p className="break-words">
              Sizes: {preferences?.sizes.length ? preferences.sizes.join(", ") : "Not recorded"}
            </p>
            <p className="break-words">
              Colours:{" "}
              {preferences?.colours.length ? preferences.colours.join(", ") : "Not recorded"}
            </p>
          </div>
        </div>
        {preferences?.deliveryNotes ? (
          <p className="mt-4 break-words rounded-[14px] bg-secondary/65 px-4 py-3 text-sm leading-6 text-muted-foreground">
            {preferences.deliveryNotes}
          </p>
        ) : null}
      </section>

      <Separator />

      <section aria-labelledby="customer-notes-title">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Prototype boundary
          </p>
          <h2 className="font-serif text-[24px] font-medium" id="customer-notes-title">
            Internal notes
          </h2>
        </div>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
          <CustomerNoteForm customerId={customer.id} onSubmit={onAddNote} />
          <div className="flex flex-col gap-3">
            {(customer.notes ?? []).length ? (
              (customer.notes ?? []).map((note) => (
                <article className="rounded-[16px] border border-border bg-card p-4" key={note.id}>
                  <p className="break-words text-sm leading-6 text-foreground">{note.body}</p>
                  <p className="mt-3 text-[10.5px] text-muted-foreground">
                    {note.author} · {formatCustomerDateTime(note.createdAt)}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-[16px] border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground">
                No internal notes yet. Add only context that helps the store serve this customer
                better.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[14px] bg-secondary/65 p-3.5">
      <p className="break-words font-serif text-[19px] font-medium leading-tight tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
