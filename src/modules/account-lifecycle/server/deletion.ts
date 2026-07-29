import "server-only";

import { prisma } from "@/lib/prisma";
import { anonymizeCustomerData } from "@/modules/account-lifecycle/server/anonymize";
import { deleteAccountExportArtifact } from "@/modules/account-lifecycle/server/artifacts";
import {
  addDays,
  DELETION_CANCELLATION_DAYS,
  findActiveDeletionBlocker,
} from "@/modules/account-lifecycle/server/policy";
import type {
  AccountDeletionRequestSummary,
  CustomerIdentity,
  RequestAccountDeletionInput,
} from "@/modules/account-lifecycle/types";
import { AccountLifecycleError } from "@/modules/account-lifecycle/types";

const ACTIVE_DELETION_STATUSES = ["requested", "blocked", "scheduled"] as const;

function mapSummary(row: {
  id: string;
  status: AccountDeletionRequestSummary["status"];
  reason: string | null;
  requested_at: Date;
  scheduled_for: Date | null;
  cancelled_at: Date | null;
  completed_at: Date | null;
}): AccountDeletionRequestSummary {
  return {
    id: row.id,
    status: row.status,
    reason: row.reason,
    requestedAt: row.requested_at.toISOString(),
    scheduledFor: row.scheduled_for ? row.scheduled_for.toISOString() : null,
    cancelledAt: row.cancelled_at ? row.cancelled_at.toISOString() : null,
    completedAt: row.completed_at ? row.completed_at.toISOString() : null,
  };
}

export async function getActiveAccountDeletionRequest(
  identity: CustomerIdentity,
): Promise<AccountDeletionRequestSummary | null> {
  const row = await prisma.account_deletion_requests.findFirst({
    where: { customer_id: identity.customerId, status: { in: [...ACTIVE_DELETION_STATUSES] } },
    orderBy: { requested_at: "desc" },
  });
  return row ? mapSummary(row) : null;
}

/** Records a deletion request. Blocked by any active order, open return,
 * pending refund, open dispute or unresolved payment-method-verification
 * payout — the attempt is still recorded (status `blocked`) so the customer
 * can see why, but no cancellation window starts until it is unblocked. */
export async function requestAccountDeletion(
  identity: CustomerIdentity,
  input: RequestAccountDeletionInput,
  now: Date = new Date(),
): Promise<AccountDeletionRequestSummary> {
  const existing = await getActiveAccountDeletionRequest(identity);
  if (existing) return existing;

  const blocker = await findActiveDeletionBlocker(identity.customerId);
  if (blocker) {
    // The attempt is still recorded (status `blocked`) so the customer can
    // see why via getActiveAccountDeletionRequest — it just never starts a
    // cancellation window.
    await prisma.account_deletion_requests.create({
      data: {
        customer_id: identity.customerId,
        status: "blocked",
        reason: input.reason ?? null,
        requested_at: now,
      },
    });
    throw new AccountLifecycleError(
      "ACCOUNT_DELETION_BLOCKED",
      "This account has activity that must be resolved before it can be deleted.",
      blocker,
    );
  }

  const row = await prisma.account_deletion_requests.create({
    data: {
      customer_id: identity.customerId,
      status: "scheduled",
      reason: input.reason ?? null,
      requested_at: now,
      scheduled_for: addDays(now, DELETION_CANCELLATION_DAYS),
    },
  });

  return mapSummary(row);
}

export async function cancelAccountDeletion(
  identity: CustomerIdentity,
  now: Date = new Date(),
): Promise<AccountDeletionRequestSummary> {
  const existing = await getActiveAccountDeletionRequest(identity);
  if (!existing) {
    throw new AccountLifecycleError(
      "ACCOUNT_DELETION_NOT_FOUND",
      "There is no pending deletion request to cancel.",
    );
  }

  const row = await prisma.account_deletion_requests.update({
    where: { id: existing.id },
    data: { status: "cancelled", cancelled_at: now },
  });

  return mapSummary(row);
}

/** Executes a deletion request whose cancellation window has passed.
 * Intended for a scheduled worker (not a customer-facing endpoint); the
 * blocker check runs again in case new activity started after the request
 * was scheduled. */
export async function executeScheduledDeletion(
  deletionRequestId: string,
  now: Date = new Date(),
): Promise<AccountDeletionRequestSummary> {
  const request = await prisma.account_deletion_requests.findUnique({
    where: { id: deletionRequestId },
  });
  if (!request) {
    throw new AccountLifecycleError(
      "ACCOUNT_DELETION_NOT_FOUND",
      "The selected deletion request could not be found.",
    );
  }
  if (request.status !== "scheduled" || !request.scheduled_for || request.scheduled_for > now) {
    throw new AccountLifecycleError(
      "ACCOUNT_DELETION_NOT_DUE",
      "This deletion request is not yet due for execution.",
    );
  }

  const blocker = await findActiveDeletionBlocker(request.customer_id);
  if (blocker) {
    await prisma.account_deletion_requests.update({
      where: { id: request.id },
      data: { status: "blocked" },
    });
    throw new AccountLifecycleError(
      "ACCOUNT_DELETION_BLOCKED",
      "New account activity blocked this scheduled deletion.",
      blocker,
    );
  }

  const exportArtifacts = await prisma.data_export_jobs.findMany({
    where: { customer_id: request.customer_id, storage_key: { not: null } },
    select: { storage_key: true },
  });
  for (const artifact of exportArtifacts) {
    if (artifact.storage_key) {
      await deleteAccountExportArtifact(artifact.storage_key);
    }
  }

  const completed = await prisma.$transaction(async (tx) => {
    await anonymizeCustomerData(tx, request.customer_id);
    return tx.account_deletion_requests.update({
      where: { id: request.id },
      data: { status: "completed", completed_at: now },
    });
  });

  return mapSummary(completed);
}
