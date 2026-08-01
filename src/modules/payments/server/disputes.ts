import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { Prisma, prisma } from "@/lib/prisma";
import { runSerializable } from "@/lib/prisma/serializable";
import { hasCapability } from "@/modules/auth/permissions";
import type { StaffSession } from "@/modules/auth/server/session";
import type {
  DisputeDecisionBody,
  DisputeEvidenceBody,
  DisputeListQuery,
  UpdateDisputeBody,
} from "@/modules/payments/dispute-schema";
import { appendDisputeEvidenceMetadata } from "@/modules/payments/server/dispute-evidence";
import {
  beginDisputeCommand,
  finishDisputeCommand,
} from "@/modules/payments/server/dispute-idempotency";
import {
  decimalToMinor,
  disputeInclude,
  type DisputeProjection,
  type DisputeRow,
  mergeDisputeMetadata,
  minorToDecimal,
  normalizeProviderEvidence,
  parseProviderDate,
  sameTimestamp,
  toDisputeProjection,
} from "@/modules/payments/server/dispute-projection";
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

export type { DisputeProjection } from "@/modules/payments/server/dispute-projection";

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
): Promise<
  Result<{ items: DisputeProjection[]; page: number; perPage: number; total: number }, DisputeError>
> {
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
  return ok({
    items: rows.map(toDisputeProjection),
    page: query.page,
    perPage: query.perPage,
    total,
  });
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
  if (isTerminal(row)) return invalidState();

  const command = await beginDisputeCommand({
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
    const result = await applyDisputeProviderState({
      provider,
      actorProfileId: actor.authUserId,
    });
    await finishDisputeCommand(command.value.id, result.ok ? result.value : null, result.ok);
    return result;
  } catch {
    await finishDisputeCommand(command.value.id, null, false);
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
  if (!hasCapability(actor.role, "payments:refund")) {
    return forbidden("submit dispute evidence");
  }
  const row = await findLocalDispute(disputeId);
  if (!row) return notFound();
  if (isTerminal(row)) return invalidState();

  const command = await beginDisputeCommand({
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
    const applied = await applyDisputeProviderState({
      provider,
      actorProfileId: actor.authUserId,
    });
    if (!applied.ok) {
      await finishDisputeCommand(command.value.id, null, false);
      return applied;
    }

    const updated = await appendDisputeEvidenceMetadata(row.id, {
      evidenceId: evidence.id,
      providerFilename: uploadedFilename ?? null,
      originalFilename: input.file?.name ?? null,
      contentType: input.file?.contentType ?? null,
      size: input.file?.blob.size ?? null,
      submittedByProfileId: actor.authUserId,
      submittedAt: new Date().toISOString(),
    });
    const projection = toDisputeProjection(updated);
    await finishDisputeCommand(command.value.id, projection, true);
    return ok(projection);
  } catch {
    await finishDisputeCommand(command.value.id, null, false);
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
  if (isTerminal(row)) return invalidState();

  const command = await beginDisputeCommand({
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
    const result = await applyDisputeProviderState({
      provider,
      actorProfileId: actor.authUserId,
    });
    await finishDisputeCommand(command.value.id, result.ok ? result.value : null, result.ok);
    return result;
  } catch {
    await finishDisputeCommand(command.value.id, null, false);
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
  const result = await runSerializable(
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
      const payment = existing?.payments ?? (await findProviderPayment(tx, input.provider));
      if (!payment) {
        return err({
          code: "DISPUTE_PAYMENT_NOT_FOUND",
          message: "The disputed Paystack transaction is not linked to a local payment.",
        });
      }

      const status = mapProviderDisputeStatus(input.provider);
      const amount = minorToDecimal(input.provider.amountMinor);
      const evidenceDueAt = parseProviderDate(input.provider.dueAt);
      const resolvedAt = parseProviderDate(input.provider.resolvedAt);
      const evidence = normalizeProviderEvidence(
        input.provider.evidence,
        input.provider.attachments,
      );
      const metadata = mergeDisputeMetadata(existing?.metadata, input.provider);
      if (
        existing &&
        existing.provider_status === input.provider.providerStatus &&
        existing.status === status &&
        existing.amount.equals(amount) &&
        sameTimestamp(existing.evidence_due_at, evidenceDueAt) &&
        sameTimestamp(existing.resolved_at, resolvedAt) &&
        existing.resolution_note === input.provider.resolution &&
        sameJson(existing.evidence, evidence) &&
        sameJson(existing.metadata, metadata)
      ) {
        return ok(existing);
      }

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
          metadata,
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
          metadata,
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
  );
  return result.ok ? ok(toDisputeProjection(result.value)) : result;
}

async function findProviderPayment(tx: Prisma.TransactionClient, provider: PaystackDispute) {
  const predicates: Prisma.paymentsWhereInput[] = [];
  if (provider.transactionId) {
    predicates.push({
      provider: "paystack",
      provider_transaction_id: provider.transactionId,
    });
  }
  if (provider.transactionReference) predicates.push({ reference: provider.transactionReference });
  if (!predicates.length) return null;
  return tx.payments.findFirst({
    where: { OR: predicates },
    include: { orders: { include: { customer: true } } },
  });
}

async function findLocalDispute(id: string) {
  return /^[0-9a-f-]{36}$/i.test(id)
    ? prisma.payment_disputes.findUnique({ where: { id }, include: disputeInclude })
    : null;
}

function mapProviderDisputeStatus(provider: PaystackDispute): DisputeProjection["status"] {
  if (provider.providerStatus === "awaiting-merchant-feedback") return "awaiting_evidence";
  if (provider.providerStatus === "resolved" || provider.providerStatus === "archived") {
    return provider.resolution === "declined" ? "declined" : "resolved";
  }
  return "pending";
}

function isTerminal(row: DisputeRow) {
  return row.status === "resolved" || row.status === "declined" || row.provider_status === "archived";
}

function fileFingerprint(file: DisputeEvidenceFile) {
  return { name: file.name, contentType: file.contentType, size: file.blob.size };
}

function sameJson(left: Prisma.JsonValue, right: Prisma.InputJsonValue) {
  return JSON.stringify(left) === JSON.stringify(right);
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
