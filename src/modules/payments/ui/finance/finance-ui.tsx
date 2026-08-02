"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

export type FinanceFeedback = { tone: "error" | "success"; text: string } | null;

export function FinanceCard({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-[24px] border border-border bg-card p-6 shadow-sm sm:p-7">
      <h2 className="font-serif text-2xl font-medium">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function FinanceField({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="mt-5">
      <label className="mb-2 block text-sm font-semibold" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function FinanceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-border bg-card p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-4 font-serif text-2xl font-medium">{value}</p>
    </div>
  );
}

export function FinanceReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

export function FinanceStatus({ status }: { status: string }) {
  const warning = [
    "amount_mismatch",
    "currency_mismatch",
    "failed",
    "local_only",
    "needs_reconciliation",
    "provider_only",
    "reversed",
    "status_mismatch",
  ].includes(status);
  return (
    <span
      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
        warning
          ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
          : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
      }`}
    >
      {humanFinanceStatus(status)}
    </span>
  );
}

export function FinanceFeedbackBanner({ feedback }: { feedback: Exclude<FinanceFeedback, null> }) {
  return (
    <div
      className={`mt-4 flex items-start gap-2 rounded-2xl border p-4 text-sm ${
        feedback.tone === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-emerald-500/30 bg-emerald-500/5"
      }`}
      role={feedback.tone === "error" ? "alert" : "status"}
    >
      {feedback.tone === "error" ? (
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      )}
      {feedback.text}
    </div>
  );
}

export function FinanceEmptyState({
  text,
  tone = "neutral",
}: {
  text: string;
  tone?: "error" | "neutral";
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed p-8 text-center text-sm ${
        tone === "error" ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      {text}
    </div>
  );
}

export function formatFinanceMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function formatFinanceSignedMoney(amountMinor: number, currency: string) {
  return `${amountMinor >= 0 ? "+" : "-"}${formatFinanceMoney(Math.abs(amountMinor), currency)}`;
}

export function formatFinanceDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function toFinanceMinorUnits(value: string): number | null {
  if (!value.trim()) return null;
  const amount = Number(value);
  const minor = Math.round(amount * 100);
  return Number.isFinite(amount) && amount > 0 && Number.isSafeInteger(minor) ? minor : null;
}

export function humanFinanceStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function readableFinanceError(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}
