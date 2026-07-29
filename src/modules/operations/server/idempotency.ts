import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import { Prisma, prisma } from "@/lib/prisma";
import type { IdempotencyClaim } from "@/modules/operations/types";

/** Thrown when a scope/key pair is reused with a different actor or input
 * hash than the request that originally claimed it. */
export class IdempotencyConflictError extends ApiError {
  constructor(scope: string, key: string) {
    super({
      code: "IDEMPOTENCY_CONFLICT",
      message: `The idempotency key "${key}" for "${scope}" was already used for a different request.`,
      status: 409,
    });
  }
}

/** Thrown when `completeIdempotency`/`failIdempotency` is called on a record
 * that is not `in_progress` and not already in the requested terminal state —
 * i.e. the record doesn't exist, or it is terminal in the *other* state. Both
 * are caller bugs (a double-invocation racing a different outcome, or a
 * stale/garbage record id) and must not be allowed to silently overwrite a
 * durable terminal result. */
export class IdempotencyTerminalStateError extends ApiError {
  constructor(recordId: string, requested: "completed" | "failed", actual: string | undefined) {
    super({
      code: "IDEMPOTENCY_INVALID_TRANSITION",
      message:
        actual === undefined
          ? `Cannot mark idempotency record "${recordId}" as "${requested}": no such record exists.`
          : `Cannot mark idempotency record "${recordId}" as "${requested}": it is already "${actual}".`,
      status: 409,
    });
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// idempotency_records only has one hash column (request_hash), so the actor
// and the caller-supplied input hash are folded into a single composite
// value: a retried request must present both the same actor and the same
// input to be treated as a safe replay.
function buildRequestHash(actorId: string, inputHash: string): string {
  return JSON.stringify({ actorId, inputHash });
}

/**
 * Claims the (scope, idempotency_key) pair for the caller, using the unique
 * database constraint as the concurrency primitive: only one concurrent
 * caller can ever create the row, so only one caller is ever told to run the
 * business command.
 *
 * - A brand-new pair returns `state: "claimed"` — the caller must run its
 *   business command exactly once and call `completeIdempotency`.
 * - A pair claimed by an identical (actor, input hash) request that is still
 *   running returns `state: "in_progress"`.
 * - A pair claimed by an identical request that already completed returns
 *   `state: "completed"` with the original response, and the business
 *   command must not run again.
 * - A previously failed claim with a matching actor/input hash may be
 *   reclaimed for a retry.
 * - A pair claimed with a different actor or input hash rejects with an
 *   `IdempotencyConflictError` (`code: "IDEMPOTENCY_CONFLICT"`).
 */
export async function claimIdempotency(
  scope: string,
  key: string,
  actorId: string,
  inputHash: string,
): Promise<IdempotencyClaim> {
  const requestHash = buildRequestHash(actorId, inputHash);

  try {
    const created = await prisma.idempotency_records.create({
      data: {
        scope,
        idempotency_key: key,
        status: "in_progress",
        request_hash: requestHash,
      },
    });
    return { id: created.id, state: "claimed" };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }

  const existing = await prisma.idempotency_records.findUnique({
    where: { scope_idempotency_key: { scope, idempotency_key: key } },
  });
  if (!existing) {
    // The colliding row was deleted between the failed create and this read
    // (e.g. an expired-record sweep). Retry once from a clean slate.
    return claimIdempotency(scope, key, actorId, inputHash);
  }

  if (existing.request_hash !== requestHash) {
    throw new IdempotencyConflictError(scope, key);
  }

  if (existing.status === "completed") {
    return {
      id: existing.id,
      state: "completed",
      response: existing.response_snapshot ?? undefined,
    };
  }

  if (existing.status === "in_progress") {
    return { id: existing.id, state: "in_progress" };
  }

  // status === "failed": the previous attempt never completed. Reclaim it
  // for a retry, guarding the transition so only one concurrent retrier wins.
  const reclaimed = await prisma.idempotency_records.updateMany({
    where: { id: existing.id, status: "failed" },
    data: { status: "in_progress", completed_at: null },
  });
  if (reclaimed.count === 1) {
    return { id: existing.id, state: "claimed" };
  }

  const reloaded = await prisma.idempotency_records.findUniqueOrThrow({
    where: { id: existing.id },
  });
  if (reloaded.status === "completed") {
    return {
      id: reloaded.id,
      state: "completed",
      response: reloaded.response_snapshot ?? undefined,
    };
  }
  return { id: reloaded.id, state: "in_progress" };
}

/** Marks a claimed record as completed with its durable response snapshot.
 * Must be called exactly once, by whichever caller received `state:
 * "claimed"` from `claimIdempotency`, after its business command finishes.
 *
 * The transition is guarded — only an `in_progress` record moves to
 * `completed` — the same conditional-`updateMany` + recheck pattern
 * `claimIdempotency` uses to reclaim a `failed` record. This closes the
 * terminal-state corruption a naive unconditional `update` allows: a second
 * call (buggy caller, retried webhook handler) can no longer silently
 * overwrite a durable `response_snapshot`/`completed_at`.
 *
 * - If the record is already `completed`, this is treated as a safe replay
 *   of the same terminal state and no-ops (the snapshot is not touched, so
 *   an earlier legitimate response is never clobbered by a later, possibly
 *   different, one).
 * - If the record is `failed` (the *other* terminal state) or doesn't exist,
 *   that is a real caller bug — completing something that already failed, or
 *   completing a stale/garbage id — and throws
 *   `IdempotencyTerminalStateError` (`code: "IDEMPOTENCY_INVALID_TRANSITION"`)
 *   rather than silently doing nothing or overwriting it. */
export async function completeIdempotency(recordId: string, response: unknown): Promise<void> {
  const updated = await prisma.idempotency_records.updateMany({
    where: { id: recordId, status: "in_progress" },
    data: {
      status: "completed",
      response_snapshot: response as Prisma.InputJsonValue,
      completed_at: new Date(),
    },
  });
  if (updated.count === 1) return;

  const existing = await prisma.idempotency_records.findUnique({ where: { id: recordId } });
  if (existing?.status === "completed") return;
  throw new IdempotencyTerminalStateError(recordId, "completed", existing?.status);
}

/** Marks a claimed record as failed so a later request with a matching
 * actor/input hash may reclaim it and retry the business command.
 *
 * Guarded the same way as `completeIdempotency`: only an `in_progress`
 * record moves to `failed`, so a second call can never downgrade an already
 * `completed` record back to `failed` (the exact corruption this primitive
 * exists to prevent for financial mutations).
 *
 * - Already `failed` no-ops (same terminal state — safe replay).
 * - Already `completed`, or the record doesn't exist, throws
 *   `IdempotencyTerminalStateError` — a real caller bug. */
export async function failIdempotency(recordId: string): Promise<void> {
  const updated = await prisma.idempotency_records.updateMany({
    where: { id: recordId, status: "in_progress" },
    // `completed_at` is required whenever status is "completed" or "failed"
    // (idempotency_records_completed_at_matches_status), so a failed attempt
    // records the time it stopped, not just that it stopped.
    data: { status: "failed", completed_at: new Date() },
  });
  if (updated.count === 1) return;

  const existing = await prisma.idempotency_records.findUnique({ where: { id: recordId } });
  if (existing?.status === "failed") return;
  throw new IdempotencyTerminalStateError(recordId, "failed", existing?.status);
}
