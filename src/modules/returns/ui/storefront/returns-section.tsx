"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCreateAccountReturn } from "@/modules/returns/client/hooks";
import type { AccountEligibleReturnOrder, AccountReturn } from "@/modules/returns/types";
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

type EligibleReturnLine = {
  key: string;
  order: AccountEligibleReturnOrder;
  line: AccountEligibleReturnOrder["lines"][number];
};

export function ReturnsSection({
  initialReturns,
  eligibleOrders,
}: {
  initialReturns: AccountReturn[];
  eligibleOrders: AccountEligibleReturnOrder[];
}) {
  const mutation = useCreateAccountReturn();
  const router = useRouter();
  const visibleReturns = useMemo(() => uniqueReturns(initialReturns), [initialReturns]);
  const eligibleLines = useMemo(() => flattenEligibleLines(eligibleOrders), [eligibleOrders]);
  const firstLine = eligibleLines.at(0) ?? null;
  const [open, setOpen] = useState(false);
  const [selectedLineKey, setSelectedLineKey] = useState(firstLine?.key ?? "");
  const [pending, setPending] = useState(false);
  const selected = useMemo(
    () => eligibleLines.find((item) => item.key === selectedLineKey) ?? null,
    [eligibleLines, selectedLineKey],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      toast.error("Choose an item to return.");
      return;
    }
    const data = new FormData(event.currentTarget);
    setPending(true);
    try {
      await mutation.mutateAsync({
        orderNumber: selected.order.orderNumber,
        reason: String(data.get("reason") ?? ""),
        note: "",
        lines: [{ orderLineId: selected.line.id, quantity: 1 }],
      });
      toast.success("Return request submitted.");
      setOpen(false);
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "We could not submit this return.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Eyebrow className="text-[var(--acc-sage-deep)]">Post-purchase</Eyebrow>
          <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
            Returns.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
            Every request stays connected to the order, item, outcome and refund method.
          </p>
        </div>
        <Button disabled={!firstLine} onClick={() => setOpen(true)} size="lg">
          Start a return
        </Button>
      </header>
      <div className="mt-7 space-y-4">
        {visibleReturns.length ? (
          visibleReturns.map((record, index) => (
            <article
              className={cn("overflow-hidden p-5", index === 0 ? panelElevatedClass : panelClass)}
              key={`account-return:${record.id}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Eyebrow className="text-[var(--acc-muted)]">
                    Return <span className={monoClass}>#{record.id.slice(0, 8)}</span>
                  </Eyebrow>
                  <h2 className="mt-3 font-serif text-3xl font-normal">
                    {record.reason || "Return request"}
                  </h2>
                  <p className="mt-2 text-[var(--acc-muted)]">
                    Order #{record.orderNumber} ·{" "}
                    {formatMoney(record.refundAmountKobo, record.currency)}
                  </p>
                </div>
                <StatusBadge
                  variant={
                    record.status === "closed" || record.status === "refunded"
                      ? "success"
                      : "warning"
                  }
                >
                  {record.status.replaceAll("_", " ")}
                </StatusBadge>
              </div>
              <Link
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-5")}
                href={`/account/returns/detail?returnId=${encodeURIComponent(record.id)}`}
              >
                View return
              </Link>
            </article>
          ))
        ) : (
          <div className={cn("border-dashed p-10 text-center", panelClass)}>
            No return requests yet.
          </div>
        )}
      </div>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a return</DialogTitle>
            <DialogDescription>Only delivered, unreturned quantities are shown.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <label className="grid gap-2 text-sm font-semibold">
              Item
              <select
                aria-label="Return item"
                className="h-11 rounded-lg border border-input bg-control px-3 font-normal"
                onChange={(event) => setSelectedLineKey(event.target.value)}
                value={selectedLineKey}
              >
                {eligibleLines.map(({ key, order, line }) => (
                  <option key={`eligible-return:${key}`} value={key}>
                    {order.orderNumber} · {line.productName || "Item"}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold" htmlFor="return-reason">
              Reason for return
              <Input id="return-reason" name="reason" required />
            </label>
            <Button disabled={pending || !selected} type="submit">
              {pending ? "Submitting…" : "Submit return"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function uniqueReturns(returns: readonly AccountReturn[]): AccountReturn[] {
  const byId = new Map<string, AccountReturn>();
  for (const record of returns) {
    if (!record?.id) continue;
    byId.set(record.id, record);
  }
  return Array.from(byId.values());
}

function flattenEligibleLines(orders: readonly AccountEligibleReturnOrder[]): EligibleReturnLine[] {
  const byKey = new Map<string, EligibleReturnLine>();
  for (const order of orders) {
    if (!order?.orderNumber) continue;
    for (const line of order.lines ?? []) {
      if (!line?.id) continue;
      const key = `${order.orderNumber}:${line.id}`;
      byKey.set(key, { key, order, line });
    }
  }
  return Array.from(byKey.values());
}
