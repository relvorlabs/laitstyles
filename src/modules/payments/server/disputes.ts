import "server-only";

import { createHash } from "node:crypto";
import { err, ok, type Result } from "@/lib/errors";
import { Prisma, prisma } from "@/lib/prisma";
import { hasCapability } from "@/modules/auth/permissions";
import type { StaffSession } from "@/modules/auth/server/session";
import type {
  DisputeDecisionBody,
  DisputeEvidenceBody,
  DisputeListQuery,
  UpdateDisputeBody,
} from "@/modules/payments/dispute-schema";
import {
  acceptDispute,
  addDisputeEvidence,
  declineDispute,
  fetchDispute,
  getDisputeUploadUrl,
  type PaystackDispute,
  updateDispute,
  uploadDisputeEvidenceFile,
} from "@/modules/payments/server/paystack/disputes";

const disputeInclude = {
  payments: {
    include: {
      orders: { include: { customer: true } },
    },
  },
} satisfies Prisma.payment_disputesInclude;

type DisputeRow = Prisma.payment_disputesGetPayload<{ include: typeof disputeInclude }>;
type TransactionClient = Prisma.TransactionClient;

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

export type DisputeError = {
  code:
    | "FORBIDDEN"
    | "DISPUTE_INVALID"
    | "DISPUTE_NOT_FOUND"
    | "DISPUTE_PAYMENT_NOT_FOUND"
    | "DISPUTE_INVALID_STATE"
    | "DISPUTE_COMMAND_PENDING"
    | "DISPUTE_IDEMPOTENCY_CONFLICT"
    | "DISPUTE_PROVIDER_UNAVAILABLE";
  message: string;
};

export type DisputeEvidenceFile = {
  blob: Blob;
  name: string;
  contentType: string;
};

export async function listPaymentDisputes(
  actor: StaffSession,
  query: DisputeListQuery,
): Promise<Result<{ items: DisputeProjection[]; page: number; perPage: number; total: number }, DisputeError>> {
  if (!hasCapability(actor.role, "finance:read")) return forbidden("view disputes");

  const where: Prisma.payment_disputesWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.paymentId ? { payment_id: query.paymentId } : {}),
    ...(query.dueBefore ? { evidence_due_at: { lte: new Date(query.dueBefore) } } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.payment_disputes.findMany({
      where,
      include: disputeInclude,
      orderBy: [{ evidence_due_at: "asc" }, { created_at: "desc" }],
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.payment_disputes.count({ where }),
  ]);
  return ok({ items: rows.map(toDisputeProjection), page: query.page, perPage: query.perPage, total });
}

export async function getPaymentDispute(
  actor: StaffSession,
  disputeId: string,
): Promise<Result<DisputeProjection, DisputeError>> {
  if (!hasCapability(actor.role, "finance:read")) return forbidden("view disputes");
  const row = await findLocalDispute(disputeId);
  return row ? ok(toDisputeProjection(row)) : notFound();
}

export async function refreshPaymentDispute(
  actor: StaffSession,
  disputeId: string,
): Promise<Result<DisputeProjection, DisputeError>> {
  if (!hasCapability(actor.role, "finance:read")) return forbidden("refresh disputes");
  const row = await findLocalDispute(disputeId);
  if (!row) return notFound();
  try {
    const provider = await fetchDispute(row.provider_dispute_id);
    return applyDisputeProviderState({ provider, actorProfileId: actor.authUserId });
  } catch {
    return err({
      code: "DISPUTE_PROVIDER_UNAVAILABLE",
      message: "Paystack dispute status could not be refreshed.",
    });
  }
}

export async function updatePaymentDispute(
  actor: StaffSession,
  disputeId: string,
  input: UpdateDisputeBody & { idempotencyKey: string },
): Promise<Result<DisputeProjection, DisputeError>> {
  if (!hasCapability(actor.role, "payments:refund")) return forbidden("update disputes");
  const row = await findLocalDispute(disputeId);
  if (!row) return notFound();
  if (row.status === "resolved" || row.status === "declined") return invalidState();

  const command = await beginCommand({
    scope: `dispute.update:${row.id}`,
    key: input.idempotencyKey,
    request: input,
    actor,
    dispute: row,
    action: "payments:dispute:update-requested",
  });
  if (!command.ok) return command;
  if (command.value.replayed) return ok(toDisputeProjection(row));

  try {
    const provider = await updateDispute(row.provider_dispute_id, input);
    const result = await applyDisputeProviderState({ provider, actorProfileId: actor.authUserId });
    await finishCommand(command.value.id, result.ok ? result.value : null, result.ok);
    return result;
  } catch {
    await finishCommand(command.value.id, null, false);
    return err({
      code: "DISPUTE_PROVIDER_UNAVAILABLE",
      message: "Paystack did not confirm the dispute update.",
    });
  }
}

export async function submitDisputeEvidence(
  actor: StaffSession,
  disputeId: string,
  input: DisputeEvidenceBody & { idempotencyKey: string; file?: DisputeEvidenceFile },
): Promise<Result<DisputeProjection, DisputeError>> {
  if (!hasCapability(actor.role, "payments:refund")) return forbidden("submit dispute evidence");
  const row = await findLocalDispute(disputeId);
  if (!row) return notFound();
  if (row.status === "resolved" || row.status === "declined") return invalidState();

  const command = await beginCommand({
    scope: `dispute.evidence:${row.id}`,
    key: input.idempotencyKey,
    request: { ...input, file: input.file ? fileFingerprint(input.file) : null },
    actor,
    dispute: row,
    action: "payments:dispute:evidence-requested",
  });
  if (!command.ok) return command;
  if (command.value.replayed) return ok(toDisputeProjection(row));

  try {
    let uploadedFilename = input.uploadedFilename;
    if (input.file) {
      const upload = await getDisputeUploadUrl(row.provider_dispute_id, input.file.name);
      await uploadDisputeEvidenceFile({
        signedUrl: upload.signedUrl,
        file: input.file.blob,
        contentType: input.file.contentType,
      });
      uploadedFilename = upload.fileName;
      await updateDispute(row.provider_dispute_id, {
        refundAmountMinor: decimalToMinor(row.amount),
        uploadedFilename,
      });
    }

    const evidence = await addDisputeEvidence(row.provider_dispute_id, input);
    const provider = await fetchDispute(row.provider_dispute_id);
    const applied = await applyDisputeProviderState({ provider, actorProfileId: actor.authUserId });
    if (!applied.ok) {
      await finishCommand(command.value.id, null, false);
      return applied;
    }

    const updated = await appendEvidenceMetadata(row.id, {
      evidenceId: evidence.id,
      providerFilename: uploadedFilename ?? null,
      originalFilename: input.file?.name ?? null,
      contentType: input.file?.contentType ?? null,
      size: input.file?.blob.size ?? null,
      submittedByProfileId: actor.authUserId,
      submittedAt: new Date().toISOString(),
    });
    await finishCommand(command.value.id, toDisputeProjection(updated), true);
    return ok(toDisputeProjection(updated));
  } catch {
    await finishCommand(command.value.id, null, false);
    return err({
      code: "DISPUTE_PROVIDER_UNAVAILABLE",
      message: "Paystack did not confirm the dispute evidence submission.",
    });
  }
}

export function acceptPaymentDispute(
  actor: StaffSession,
  disputeId: string,
  input: DisputeDecisionBody & { idempotencyKey: string },
) {
  return decideDispute(actor, disputeId, input, "accept");
}

export function declinePaymentDispute(
  actor: StaffSession,
  disputeId: string,
  input: DisputeDecisionBody & { idempotencyKey: string },
) {
  return decideDispute(actor, disputeId, input, "decline");
}

async function decideDispute(
  actor: StaffSession,
  disputeId: string,
  input: DisputeDecisionBody & { idempotencyKey: string },
  decision: "accept" | "decline",
): Promise<Result<DisputeProjection, DisputeError>> {
  if (!hasCapability(actor.role, "payments:refund")) return forbidden("resolve disputes");
  const row = await findLocalDispute(disputeId);
  if (!row) return notFound();
  if (row.status === "resolved" || row.status === "declined") return invalidState();

  const command = await beginCommand({
    scope: `dispute.${decision}:${row.id}`,
    key: input.idempotencyKey,
    request: input,
    actor,
    dispute: row,
    action: `payments:dispute:${decision}-requested`,
  });
  if (!command.ok) return command;
  if (command.value.replayed) return ok(toDisputeProjection(row));

  try {
    const provider =
      decision === "accept"
        ? await acceptDispute(row.provider_dispute_id, input)
        : await declineDispute(row.provider_dispute_id, input);
    const result = await applyDisputeProviderState({ provider, actorProfileId: actor.authUserId });
    await finishCommand(command.value.id, result.ok ? result.value : null, result.ok);
    return result;
  } catch {
    await finishCommand(command.value.id, null, false);
    return err({
      code: "DISPUTE_PROVIDER_UNAVAILABLE",
      message: "Paystack did not confirm the dispute decision.",
    });
  }
}

export async function applyDisputeProviderState(input: {
  provider: PaystackDispute;
  actorProfileId?: string | null;
}): Promise<Result<DisputeProjection, DisputeError>> {
  const result = await prisma.$transaction(
    async (tx): Promise<Result<DisputeRow, DisputeError>> => {
      const existing = await tx.payment_disputes.findUnique({
        where: {
          provider_provider_dispute_id: {
            provider: "paystack",
            provider_dispute_id: input.provider.id,
          },
        },
        include: disputeInclude,
      });
      const payment = existing
        ? existing.payments
        : await tx.payments.findFirst({
            where: {
              OR: [
                ...(input.provider.transactionId
                  ? [{ provider: "paystack" as const, provider_transaction_id: input.provider.transactionId }]
                  : []),
                ...(input.provider.transactionReference
                  ? [{ reference: input.provider.transactionReference }]
                  : []),
              ],
            },
            include: { orders: { include: { customer: true } } },
          });
      if (!payment) {
        return err({
          code: "DISPUTE_PAYMENT_NOT_FOUND",
          message: "The disputed Paystack transaction is not linked to a local payment.",
        });
      }

      const status = mapProviderDisputeStatus(input.provider);
      const amount = minorToDecimal(input.provider.amountMinor);
      const evidenceDueAt = parseDate(input.provider.dueAt);
      const resolvedAt = parseDate(input.provider.resolvedAt);
      const evidence = normalizeEvidence(input.provider.evidence, input.provider.attachments);
      const unchanged =
        existing &&
        existing.provider_status === input.provider.providerStatus &&
        existing.status === status &&
        existing.amount.equals(amount) &&
        sameTime(existing.evidence_due_at, evidenceDueAt) &&
        sameTime(existing.resolved_at, resolvedAt) &&
        existing.resolution_note === input.provider.resolution;
      if (unchanged) return ok(existing);

      const row = await tx.payment_disputes.upsert({
        where: {
          provider_provider_dispute_id: {
            provider: "paystack",
            provider_dispute_id: input.provider.id,
          },
        },
        update: {
          payment_id: payment.id,
          provider_status: input.provider.providerStatus,
          status,
          category: input.provider.category,
          amount,
          currency: input.provider.currency,
          reason: input.provider.reason,
          evidence: evidence as Prisma.InputJsonValue,
          evidence_due_at: evidenceDueAt,
          resolved_at: resolvedAt,
          resolution_note: input.provider.resolution,
          last_provider_sync_at: new Date(),
          metadata: providerMetadata(input.provider),
        },
        create: {
          payment_id: payment.id,
          provider: "paystack",
          provider_dispute_id: input.provider.id,
          provider_status: input.provider.providerStatus,
          status,
          category: input.provider.category,
          amount,
          currency: input.provider.currency,
          reason: input.provider.reason,
          evidence: evidence as Prisma.InputJsonValue,
          evidence_due_at: evidenceDueAt,
          resolved_at: resolvedAt,
          resolution_note: input.provider.resolution,
          last_provider_sync_at: new Date(),
          metadata: providerMetadata(input.provider),
        },
        include: disputeInclude,
      });

      if (status === "awaiting_evidence" || status === "pending") {
        await tx.orders.update({
          where: { id: payment.order_id },
          data: {
            payment_status: "review_required",
            attention: `Paystack dispute ${input.provider.id} requires review.`,
          },
        });
      } else {
        const unresolved = await tx.payment_disputes.count({
          where: {
            payment_id: payment.id,
            id: { not: row.id },
            status: { in: ["awaiting_evidence", "pending"] },
          },
        });
        if (unresolved === 0) {
          await tx.orders.update({
            where: { id: payment.order_id },
            data: {
              payment_status: payment.status === "success" ? "paid" : "review_required",
              attention: null,
            },
          });
        }
      }

      await tx.audit_events.create({
        data: {
          actor_profile_id: input.actorProfileId ?? null,
          action: `payments:dispute:${status}`,
          target_table: "payment_disputes",
          target_id: row.id,
          metadata: {
            payment_id: payment.id,
            order_id: payment.order_id,
            provider_dispute_id: input.provider.id,
            provider_status: input.provider.providerStatus,
            resolution: input.provider.resolution,
          },
        },
      });
      return ok(row);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  return result.ok ? ok(toDisputeProjection(result.value)) : result;
}

async function beginCommand(input: {
  scope: string;
  key: string;
  request: unknown;
  actor: StaffSession;
  dispute: DisputeRow;
  action: string;
}): Promise<Result<{ id: string; replayed: boolean }, DisputeError>> {
  const requestHash = createHash("sha256").update(stableStringify(input.request)).digest("hex");
  const existing = await prisma.idempotency_records.findUnique({
    where: { scope_idempotency_key: { scope: input.scope, idempotency_key: input.key } },
  });
  if (existing) {
    if (existing.request_hash !== requestHash) {
      return err({
        code: "DISPUTE_IDEMPOTENCY_CONFLICT",
        message: "This idempotency key was already used for a different dispute command.",
      });
    }
    if (existing.status === "completed") return ok({ id: existing.id, replayed: true });
    if (existing.status === "in_progress") {
      return err({
        code: "DISPUTE_COMMAND_PENDING",
        message: "This dispute command is already being processed.",
      });
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const record = existing
        ? await tx.idempotency_records.update({
            where: { id: existing.id },
            data: { status: "in_progress", response_snapshot: Prisma.JsonNull, completed_at: null },
          })
        : await tx.idempotency_records.create({
            data: {
              scope: input.scope,
              idempotency_key: input.key,
              request_hash: requestHash,
              status: "in_progress",
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1_000),
            },
          });
      await tx.audit_events.create({
        data: {
          actor_profile_id: input.actor.authUserId,
          action: input.action,
          target_table: "payment_disputes",
          target_id: input.dispute.id,
          metadata: {
            provider_dispute_id: input.dispute.provider_dispute_id,
            idempotency_key: input.key,
          },
        },
      });
      return ok({ id: record.id, replayed: false });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return err({
        code: "DISPUTE_COMMAND_PENDING",
        message: "This dispute command is already being processed.",
      });
    }
    throw error;
  }
}

async function finishCommand(id: string, response: DisputeProjection | null, succeeded: boolean) {
  await prisma.idempotency_records.update({
    where: { id },
    data: {
      status: succeeded ? "completed" : "failed",
      completed_at: new Date(),
      response_snapshot: response ? (response as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}

async function appendEvidenceMetadata(disputeId: string, item: Record<string, unknown>) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.payment_disputes.findUniqueOrThrow({
      where: { id: disputeId },
      include: disputeInclude,
    });
    const current = Array.isArray(row.evidence) ? row.evidence : [];
    return tx.payment_disputes.update({
      where: { id: disputeId },
      data: { evidence: [...current, item] as Prisma.InputJsonValue },
      include: disputeInclude,
    });
  });
}

async function findLocalDispute(id: string) {
  return /^[0-9a-f-]{36}$/i.test(id)
    ? prisma.payment_disputes.findUnique({ where: { id }, include: disputeInclude })
    : null;
}

function mapProviderDisputeStatus(provider: PaystackDispute): DisputeProjection["status"] {
  if (provider.providerStatus === "awaiting-merchant-feedback") return "awaiting_evidence";
  if (provider.providerStatus === "resolved") {
    return provider.resolution === "declined" ? "declined" : "resolved";
  }
  return "pending";
}

function normalizeEvidence(evidence: unknown, attachments: unknown): unknown[] {
  const values: unknown[] = [];
  if (evidence !== null && evidence !== undefined) values.push({ kind: "provider-evidence", value: evidence });
  if (attachments !== null && attachments !== undefined) values.push({ kind: "provider-attachments", value: attachments });
  return values;
}

function providerMetadata(provider: PaystackDispute): Prisma.InputJsonValue {
  return {
    transactionId: provider.transactionId,
    transactionReference: provider.transactionReference,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  } as Prisma.InputJsonValue;
}

function toDisputeProjection(row: DisputeRow): DisputeProjection {
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
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    evidenceDueAt: row.evidence_due_at?.toISOString() ?? null,
    resolvedAt: row.resolved_at?.toISOString() ?? null,
    resolutionNote: row.resolution_note,
    lastProviderSyncAt: row.last_provider_sync_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function fileFingerprint(file: DisputeEvidenceFile) {
  return { name: file.name, contentType: file.contentType, size: file.blob.size };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameTime(left: Date | null, right: Date | null) {
  return left?.getTime() === right?.getTime();
}

function minorToDecimal(amountMinor: number) {
  return new Prisma.Decimal(amountMinor).div(100);
}

function decimalToMinor(amount: Prisma.Decimal) {
  return amount.mul(100).toDecimalPlaces(0).toNumber();
}

function forbidden(action: string): Result<never, DisputeError> {
  return err({ code: "FORBIDDEN", message: `You do not have permission to ${action}.` });
}

function notFound(): Result<never, DisputeError> {
  return err({ code: "DISPUTE_NOT_FOUND", message: "The dispute could not be found." });
}

function invalidState(): Result<never, DisputeError> {
  return err({
    code: "DISPUTE_INVALID_STATE",
    message: "This dispute is already in a terminal state.",
  });
}
