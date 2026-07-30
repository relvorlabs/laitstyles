"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, FileUp, Scale } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type DisputeRecord,
  disputesQueryOptions,
  useAcceptDispute,
  useDeclineDispute,
  useSubmitDisputeEvidence,
} from "@/modules/payments/client/disputes";
import {
  DISPUTE_EVIDENCE_CONTENT_TYPES,
  DISPUTE_EVIDENCE_MAX_BYTES,
} from "@/modules/payments/dispute-contract";

export function DisputesWorkspace({ canDecide }: { canDecide: boolean }) {
  const disputesQuery = useQuery(disputesQueryOptions({ perPage: 50 }));
  const submitEvidence = useSubmitDisputeEvidence();
  const acceptDispute = useAcceptDispute();
  const declineDispute = useDeclineDispute();
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [evidence, setEvidence] = useState({
    customerEmail: "",
    customerName: "",
    customerPhone: "",
    serviceDetails: "",
    deliveryAddress: "",
    deliveryDate: "",
    file: null as File | null,
  });
  const [decision, setDecision] = useState({ note: "", refundNaira: "0.00" });

  const disputes = disputesQuery.data ?? [];
  const selected = useMemo(
    () => disputes.find((dispute) => dispute.id === selectedId) ?? disputes[0] ?? null,
    [disputes, selectedId],
  );
  const unresolved = disputes.filter((item) =>
    item.status === "awaiting_evidence" || item.status === "pending",
  ).length;

  async function uploadEvidence() {
    if (!canDecide || !selected) return;
    if (!evidence.file) {
      setMessage({ tone: "error", text: "Attach a PDF, PNG or JPEG evidence file." });
      return;
    }
    if (
      !DISPUTE_EVIDENCE_CONTENT_TYPES.includes(
        evidence.file.type as (typeof DISPUTE_EVIDENCE_CONTENT_TYPES)[number],
      ) ||
      evidence.file.size > DISPUTE_EVIDENCE_MAX_BYTES
    ) {
      setMessage({ tone: "error", text: "Evidence must be a PDF, PNG or JPEG no larger than 5 MB." });
      return;
    }
    setMessage(null);
    try {
      await submitEvidence.mutateAsync({
        disputeId: selected.id,
        idempotencyKey: crypto.randomUUID(),
        customerEmail: evidence.customerEmail,
        customerName: evidence.customerName,
        customerPhone: evidence.customerPhone,
        serviceDetails: evidence.serviceDetails,
        deliveryAddress: evidence.deliveryAddress || undefined,
        deliveryDate: evidence.deliveryDate || undefined,
        file: evidence.file,
      });
      setMessage({
        tone: "success",
        text: "Evidence was submitted to Paystack. Final dispute state remains provider-authoritative.",
      });
      setEvidence((current) => ({ ...current, serviceDetails: "", file: null }));
    } catch (error) {
      setMessage({ tone: "error", text: readableError(error, "Evidence could not be submitted.") });
    }
  }

  async function resolve(kind: "accept" | "decline") {
    if (!canDecide || !selected) return;
    const refundAmountMinor = toMinorUnits(decision.refundNaira);
    if (refundAmountMinor === null || !decision.note.trim()) {
      setMessage({ tone: "error", text: "Enter a decision note and a valid refund amount." });
      return;
    }
    const confirmed = window.confirm(
      kind === "accept"
        ? "Accept this dispute and submit the refund decision to Paystack?"
        : "Decline this dispute and submit the evidence-backed decision to Paystack?",
    );
    if (!confirmed) return;

    setMessage(null);
    const mutation = kind === "accept" ? acceptDispute : declineDispute;
    try {
      await mutation.mutateAsync({
        disputeId: selected.id,
        idempotencyKey: crypto.randomUUID(),
        message: decision.note.trim(),
        refundAmountMinor,
      });
      setMessage({
        tone: "success",
        text: "Decision submitted. The workspace will continue to show Paystack’s canonical state.",
      });
    } catch (error) {
      setMessage({ tone: "error", text: readableError(error, "The dispute decision failed.") });
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-col gap-4 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
            <Scale className="size-3.5" /> Auditable provider reconciliation
          </div>
          <h1 className="font-serif text-4xl font-medium tracking-tight">Payment disputes</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review Paystack chargebacks, meet evidence deadlines and submit explicit owner decisions.
            Signed provider events remain authoritative for final resolution.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Metric label="All" value={disputes.length} />
          <Metric label="Open" value={unresolved} />
          <Metric label="Due soon" value={disputes.filter(isDueSoon).length} />
        </div>
      </header>

      <div className="grid gap-7 xl:grid-cols-[minmax(330px,.75fr)_minmax(0,1.25fr)]">
        <section className="rounded-[24px] border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-medium">Dispute queue</h2>
              <p className="mt-1 text-sm text-muted-foreground">Earliest evidence deadlines first.</p>
            </div>
            {disputesQuery.isFetching ? (
              <span className="text-xs text-muted-foreground">Refreshing…</span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-2">
            {disputesQuery.isPending ? (
              <EmptyState text="Loading disputes…" />
            ) : disputesQuery.isError ? (
              <EmptyState text="Disputes could not be loaded." tone="error" />
            ) : disputes.length === 0 ? (
              <EmptyState text="No Paystack disputes have been received." />
            ) : (
              disputes.map((dispute) => (
                <button
                  aria-pressed={selected?.id === dispute.id}
                  className={`rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selected?.id === dispute.id
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-muted/20 hover:bg-muted/40"
                  }`}
                  key={dispute.id}
                  onClick={() => setSelectedId(dispute.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong className="block">{dispute.orderNumber}</strong>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {dispute.customerName ?? "Customer"}
                      </span>
                    </div>
                    <DisputeStatus status={dispute.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{formatMoney(dispute.amountMinor, dispute.currency)}</span>
                    <span>{dispute.category ?? "Uncategorised"}</span>
                    <span>{dispute.evidenceDueAt ? `Due ${formatDate(dispute.evidenceDueAt)}` : "No due date"}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-border bg-card p-5 shadow-sm sm:p-7">
          {!selected ? (
            <EmptyState text="Select a dispute to review its evidence and decisions." />
          ) : (
            <div className="grid gap-7">
              <DisputeSummary dispute={selected} />
              {message ? <Feedback message={message} /> : null}

              <section aria-labelledby="evidence-heading" className="rounded-2xl border border-border p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <FileUp className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-serif text-xl font-medium" id="evidence-heading">
                      Submit fulfilment evidence
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      PDF, PNG or JPEG, maximum 5 MB. The file is uploaded through Paystack’s signed URL.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <TextField
                    disabled={!canDecide}
                    id="evidence-name"
                    label="Customer name"
                    onChange={(value) => setEvidence((current) => ({ ...current, customerName: value }))}
                    value={evidence.customerName}
                  />
                  <TextField
                    disabled={!canDecide}
                    id="evidence-email"
                    label="Customer email"
                    onChange={(value) => setEvidence((current) => ({ ...current, customerEmail: value }))}
                    type="email"
                    value={evidence.customerEmail}
                  />
                  <TextField
                    disabled={!canDecide}
                    id="evidence-phone"
                    label="Customer phone"
                    onChange={(value) => setEvidence((current) => ({ ...current, customerPhone: value }))}
                    value={evidence.customerPhone}
                  />
                  <TextField
                    disabled={!canDecide}
                    id="evidence-date"
                    label="Delivery date"
                    onChange={(value) => setEvidence((current) => ({ ...current, deliveryDate: value }))}
                    type="date"
                    value={evidence.deliveryDate}
                  />
                </div>
                <label className="mt-4 block text-sm font-semibold" htmlFor="evidence-service">
                  Service and fulfilment details
                </label>
                <textarea
                  className="mt-2 min-h-28 w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={!canDecide}
                  id="evidence-service"
                  maxLength={2000}
                  onChange={(event) =>
                    setEvidence((current) => ({ ...current, serviceDetails: event.target.value }))
                  }
                  value={evidence.serviceDetails}
                />
                <label className="mt-4 block text-sm font-semibold" htmlFor="evidence-file">
                  Evidence file
                </label>
                <Input
                  accept={DISPUTE_EVIDENCE_CONTENT_TYPES.join(",")}
                  disabled={!canDecide}
                  id="evidence-file"
                  onChange={(event) =>
                    setEvidence((current) => ({ ...current, file: event.target.files?.[0] ?? null }))
                  }
                  type="file"
                />
                <Button
                  className="mt-5"
                  disabled={!canDecide || submitEvidence.isPending}
                  onClick={uploadEvidence}
                  type="button"
                >
                  {submitEvidence.isPending ? "Uploading evidence…" : "Submit evidence"}
                </Button>
              </section>

              <section aria-labelledby="decision-heading" className="rounded-2xl border border-border p-5">
                <h3 className="font-serif text-xl font-medium" id="decision-heading">
                  Owner decision
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review the selected dispute carefully. Decisions are auditable and sent directly to Paystack.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <TextField
                    disabled={!canDecide}
                    id="decision-refund"
                    label="Refund amount (NGN)"
                    onChange={(value) => setDecision((current) => ({ ...current, refundNaira: value }))}
                    type="number"
                    value={decision.refundNaira}
                  />
                  <TextField
                    disabled={!canDecide}
                    id="decision-note"
                    label="Decision note"
                    onChange={(value) => setDecision((current) => ({ ...current, note: value }))}
                    value={decision.note}
                  />
                </div>
                {!canDecide ? (
                  <div className="mt-4 rounded-2xl border border-border bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
                    Read-only finance access. An owner must upload evidence or decide a dispute.
                  </div>
                ) : null}
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button
                    disabled={!canDecide || acceptDispute.isPending || declineDispute.isPending}
                    onClick={() => resolve("accept")}
                    type="button"
                  >
                    Accept dispute
                  </Button>
                  <Button
                    disabled={!canDecide || acceptDispute.isPending || declineDispute.isPending}
                    onClick={() => resolve("decline")}
                    type="button"
                    variant="outline"
                  >
                    Decline with evidence
                  </Button>
                </div>
              </section>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DisputeSummary({ dispute }: { dispute: DisputeRecord }) {
  return (
    <div className="grid gap-5 border-b border-border pb-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-3xl font-medium">{dispute.orderNumber}</h2>
            <DisputeStatus status={dispute.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Paystack dispute {dispute.providerDisputeId} · {dispute.providerStatus ?? "status unavailable"}
          </p>
        </div>
        <strong className="text-xl">{formatMoney(dispute.amountMinor, dispute.currency)}</strong>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Fact label="Customer" value={dispute.customerName ?? "Not recorded"} />
        <Fact label="Category" value={dispute.category ?? "Not provided"} />
        <Fact
          label="Evidence due"
          value={dispute.evidenceDueAt ? formatDate(dispute.evidenceDueAt) : "Not provided"}
        />
      </div>
      {dispute.reason ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{dispute.reason}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  disabled,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      <Input
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </div>
  );
}

function DisputeStatus({ status }: { status: DisputeRecord["status"] }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
      {status === "awaiting_evidence" ? <CalendarClock className="size-3.5" /> : null}
      {status.replaceAll("_", " ")}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <strong className="mt-2 block text-sm">{value}</strong>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-2xl border border-border bg-card px-4 py-3 text-center shadow-sm">
      <strong className="block text-xl font-semibold">{value}</strong>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

function EmptyState({ text, tone = "normal" }: { text: string; tone?: "normal" | "error" }) {
  return (
    <div
      className={`rounded-2xl border border-dashed px-5 py-10 text-center text-sm ${
        tone === "error" ? "border-destructive/30 text-destructive" : "border-border text-muted-foreground"
      }`}
      role={tone === "error" ? "alert" : undefined}
    >
      {text}
    </div>
  );
}

function Feedback({ message }: { message: { tone: "error" | "success"; text: string } }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
        message.tone === "error"
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : "border-primary/20 bg-primary/10 text-foreground"
      }`}
      role={message.tone === "error" ? "alert" : "status"}
    >
      {message.text}
    </div>
  );
}

function isDueSoon(dispute: DisputeRecord) {
  if (!dispute.evidenceDueAt || dispute.status === "resolved" || dispute.status === "declined") return false;
  const remaining = new Date(dispute.evidenceDueAt).getTime() - Date.now();
  return remaining >= 0 && remaining <= 3 * 24 * 60 * 60 * 1_000;
}

function toMinorUnits(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(amountMinor / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function readableError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
