import "server-only";

import { createHash } from "node:crypto";
import { err, ok, type Result } from "@/lib/errors";
import { Prisma, prisma } from "@/lib/prisma";
import type { StaffSession } from "@/modules/auth/server/session";
import type { DisputeError } from "@/modules/payments/server/disputes";
import type {
  DisputeProjection,
  DisputeRow,
} from "@/modules/payments/server/dispute-projection";

export async function beginDisputeCommand(input: {
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

export async function finishDisputeCommand(
  id: string,
  response: DisputeProjection | null,
  succeeded: boolean,
) {
  await prisma.idempotency_records.update({
    where: { id },
    data: {
      status: succeeded ? "completed" : "failed",
      completed_at: new Date(),
      response_snapshot: response ? (response as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
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
