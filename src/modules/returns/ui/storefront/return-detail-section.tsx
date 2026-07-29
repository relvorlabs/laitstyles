import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AccountReturn } from "@/modules/returns/types";
import {
  Eyebrow,
  monoClass,
  panelClass,
  panelElevatedClass,
  StatusBadge,
} from "@/modules/storefront-shell/ui/account-primitives";

function formatMoney(kobo: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function ReturnDetailSection({ record }: { record: AccountReturn }) {
  const status = record.status.replaceAll("_", " ");
  const completed = record.status === "refunded" || record.status === "closed";
  return (
    <>
      <Link
        className={cn(buttonVariants({ variant: "link", size: "lg" }), "mb-5 px-0")}
        href="/account/returns"
      >
        ← Back to returns
      </Link>
      <header>
        <Eyebrow className="text-[var(--acc-sage-deep)]">Return detail</Eyebrow>
        <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
          Return <span className={cn(monoClass, "text-[.6em]")}>#{record.id}</span>
        </h1>
        <p className="mt-4 text-[var(--acc-muted)]">
          Related order <span className={monoClass}>#{record.orderNumber}</span>
        </p>
      </header>
      <section className={cn("mt-7 p-5 sm:p-6", panelElevatedClass)}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Eyebrow className="text-[var(--acc-muted)]">Current state</Eyebrow>
            <h2 className="mt-3 font-serif text-3xl font-normal capitalize">{status}</h2>
          </div>
          <StatusBadge variant={completed ? "success" : "warning"}>{status}</StatusBadge>
        </div>
        <p className="mt-4 text-sm text-[var(--acc-muted)]">
          Requested {formatDate(record.requestedAt)} · Updated {formatDate(record.updatedAt)}
        </p>
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <section className={cn("p-5 sm:p-6", panelClass)}>
          <h2 className="font-serif text-3xl font-normal">Items</h2>
          <div className="mt-5 divide-y divide-[var(--acc-line)]">
            {record.lines.map((line) => (
              <div className="py-4 first:pt-0" key={line.id}>
                <p className="font-semibold">{line.productName}</p>
                <p className="mt-1 text-sm text-[var(--acc-muted)]">
                  {[line.variantLabel, `Quantity ${line.quantity}`, line.disposition]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className={cn("p-5 sm:p-6", panelClass)}>
          <Eyebrow className="text-[var(--acc-muted)]">Request summary</Eyebrow>
          <dl className="mt-5 space-y-5">
            <div>
              <dt className="text-sm font-semibold">Reason</dt>
              <dd className="mt-1 text-[var(--acc-muted)]">{record.reason}</dd>
            </div>
            {record.note ? (
              <div>
                <dt className="text-sm font-semibold">Note</dt>
                <dd className="mt-1 text-[var(--acc-muted)]">{record.note}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-sm font-semibold">Refund amount</dt>
              <dd className={cn("mt-1 text-xl", monoClass)}>
                {formatMoney(record.refundAmountKobo, record.currency)}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
