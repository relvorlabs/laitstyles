import "server-only";

import type { Prisma } from "@/lib/prisma";
import { Prisma as PrismaRuntime } from "@/lib/prisma";
import type { PaystackDispute } from "@/modules/payments/server/paystack/disputes";

export const disputeInclude = {
  payments: {
    include: {
      orders: { include: { customer: true } },
    },
  },
} satisfies Prisma.payment_disputesInclude;

export type DisputeRow = Prisma.payment_disputesGetPayload<{ include: typeof disputeInclude }>;

export type DisputeProjection = {
  id: string;
  paymentId: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string | null;
  providerDisputeId: string;
  providerStatus: string | null;
  status: "awaiting_evidence" | "pending" | "resolved" | "declined";
  category: string | null;
  amountMinor: number;
  currency: string;
  reason: string | null;
  evidence: unknown[];
  evidenceDueAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  lastProviderSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LocalEvidenceDescriptor = {
  evidenceId: string;
  providerFilename: string | null;
  originalFilename: string | null;
  contentType: string | null;
  size: number | null;
  submittedByProfileId: string;
  submittedAt: string;
};

export function toDisputeProjection(row: DisputeRow): DisputeProjection {
  return {
    id: row.id,
    paymentId: row.payment_id,
    orderId: row.payments.order_id,
    orderNumber: row.payments.orders.order_number,
    customerId: row.payments.orders.customer_id,
    customerName: row.payments.orders.customer_name ?? row.payments.orders.customer.name ?? null,
    providerDisputeId: row.provider_dispute_id,
    providerStatus: row.provider_status,
    status: row.status,
    category: row.category,
    amountMinor: decimalToMinor(row.amount),
    currency: row.currency,
    reason: row.reason,
    evidence: [...providerEvidence(row.evidence), ...localEvidence(row.metadata)],
    evidenceDueAt: row.evidence_due_at?.toISOString() ?? null,
    resolvedAt: row.resolved_at?.toISOString() ?? null,
    resolutionNote: row.resolution_note,
    lastProviderSyncAt: row.last_provider_sync_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function mergeDisputeMetadata(
  current: Prisma.JsonValue | null | undefined,
  provider: PaystackDispute,
): Prisma.InputJsonValue {
  const existing = jsonRecord(current);
  return {
    ...existing,
    provider: {
      transactionId: provider.transactionId,
      transactionReference: provider.transactionReference,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    },
    localEvidence: localEvidence(current),
  } as Prisma.InputJsonValue;
}

export function appendLocalEvidenceMetadata(
  current: Prisma.JsonValue | null | undefined,
  item: LocalEvidenceDescriptor,
): Prisma.InputJsonValue {
  const existing = jsonRecord(current);
  return {
    ...existing,
    localEvidence: [...localEvidence(current), item],
  } as Prisma.InputJsonValue;
}

export function normalizeProviderEvidence(evidence: unknown, attachments: unknown): unknown[] {
  const values: unknown[] = [];
  if (evidence !== null && evidence !== undefined) {
    values.push({ kind: "provider-evidence", value: evidence });
  }
  if (attachments !== null && attachments !== undefined) {
    values.push({ kind: "provider-attachments", value: attachments });
  }
  return values;
}

export function parseProviderDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function sameTimestamp(left: Date | null, right: Date | null) {
  return left?.getTime() === right?.getTime();
}

export function minorToDecimal(amountMinor: number) {
  return new PrismaRuntime.Decimal(amountMinor).div(100);
}

export function decimalToMinor(amount: Prisma.Decimal) {
  return amount.mul(100).toDecimalPlaces(0).toNumber();
}

function providerEvidence(value: Prisma.JsonValue): unknown[] {
  return Array.isArray(value) ? value : [];
}

function localEvidence(value: Prisma.JsonValue | null | undefined): LocalEvidenceDescriptor[] {
  const candidate = jsonRecord(value).localEvidence;
  if (!Array.isArray(candidate)) return [];
  return candidate.filter(isLocalEvidenceDescriptor);
}

function jsonRecord(value: Prisma.JsonValue | null | undefined): Record<string, Prisma.JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

function isLocalEvidenceDescriptor(value: unknown): value is LocalEvidenceDescriptor {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.evidenceId === "string" &&
    typeof item.submittedByProfileId === "string" &&
    typeof item.submittedAt === "string"
  );
}
