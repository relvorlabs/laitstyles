"use client";

import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { paymentTimelineQueryOptions } from "@/modules/payments/client/payment-timeline";

export function PaymentTimeline({ paymentId }: { paymentId: string | null }) {
  const timeline = useQuery(paymentTimelineQueryOptions(paymentId ?? ""));

  return (
    <section
      aria-labelledby="payment-timeline-heading"
      className="rounded-2xl border border-border p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
          <History className="size-5" />
        </span>
        <div>
          <h3 className="font-serif text-xl font-medium" id="payment-timeline-heading">
            Audit timeline
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Provider transitions and immutable operator actions for this payment.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {!paymentId ? (
          <TimelineEmpty text="Select a payment record to view its history." />
        ) : timeline.isPending ? (
          <TimelineEmpty text="Loading payment history…" />
        ) : timeline.isError ? (
          <TimelineEmpty text="Payment history could not be loaded." error />
        ) : !timeline.data?.length ? (
          <TimelineEmpty text="No payment events have been recorded." />
        ) : (
          timeline.data.slice(0, 12).map((event) => (
            <article
              className="rounded-xl border border-border bg-muted/20 px-4 py-3"
              key={event.id}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <strong className="text-sm">{humanize(event.kind)}</strong>
                <time className="text-xs text-muted-foreground" dateTime={event.occurredAt}>
                  {formatDate(event.occurredAt)}
                </time>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {event.status ? <span>Status: {humanize(event.status)}</span> : null}
                {event.amountMinor > 0 ? (
                  <span>{formatMoney(event.amountMinor, event.currency)}</span>
                ) : null}
                <span>Actor: {event.actor ?? "Paystack/system"}</span>
              </div>
              {event.note ? <p className="mt-2 text-sm leading-6">{event.note}</p> : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function TimelineEmpty({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-dashed px-4 py-8 text-center text-sm ${
        error ? "border-destructive/30 text-destructive" : "border-border text-muted-foreground"
      }`}
      role={error ? "alert" : undefined}
    >
      {text}
    </div>
  );
}

function humanize(value: string) {
  return value.replaceAll(":", " ").replaceAll("_", " ").replaceAll("-", " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(amountMinor / 100);
}
