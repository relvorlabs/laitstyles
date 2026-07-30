import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type {
  PaymentMethodError,
  PaymentMethodSetup,
} from "@/modules/payments/types";

export const PAYMENT_METHOD_SETUP_SCOPE = "payment-method.setup";

type SetupReplay =
  | { kind: "replay"; value: PaymentMethodSetup }
  | { kind: "pending" }
  | { kind: "failed" }
  | { kind: "conflict" };

export async function findPaymentMethodSetupReplay(
  customerId: string,
  idempotencyKey: string,
): Promise<SetupReplay | null> {
  const record = await prisma.idempotency_records.findUnique({
    where: {
      scope_idempotency_key: {
        scope: PAYMENT_METHOD_SETUP_SCOPE,
        idempotency_key: idempotencyKey,
      },
    },
  });
  if (!record) return null;
  if (record.request_hash !== customerId) return { kind: "conflict" };
  if (record.response_snapshot) {
    return {
      kind: "replay",
      value: record.response_snapshot as unknown as PaymentMethodSetup,
    };
  }
  return record.status === "failed" ? { kind: "failed" } : { kind: "pending" };
}

export function paymentMethodSetupReplayResult(
  replay: SetupReplay | null,
): Result<PaymentMethodSetup, PaymentMethodError> | null {
  if (!replay) return null;
  switch (replay.kind) {
    case "replay":
      return ok(replay.value);
    case "pending":
      return err({
        code: "PAYMENT_METHOD_SETUP_PENDING",
        message: "This payment method setup is already being prepared.",
      });
    case "failed":
      return err({
        code: "PAYMENT_METHOD_PROVIDER_UNAVAILABLE",
        message: "The previous setup attempt failed. Start again with a new request.",
      });
    case "conflict":
      return err({
        code: "PAYMENT_METHOD_INVALID",
        message: "The idempotency key is already associated with another account.",
        field: "idempotencyKey",
      });
  }
}

export function isPrismaUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002",
  );
}

export function isAuthorizationSignatureConflict(error: unknown) {
  if (!isPrismaUniqueConstraintError(error) || !error || typeof error !== "object") {
    return false;
  }
  const meta = "meta" in error && error.meta && typeof error.meta === "object" ? error.meta : null;
  const target = meta && "target" in meta ? meta.target : null;
  if (Array.isArray(target)) {
    return target.includes("provider") && target.includes("signature");
  }
  if (typeof target === "string") {
    return (
      target.includes("payment_authorizations_provider_signature_unique") ||
      (target.includes("provider") && target.includes("signature"))
    );
  }
  // Prisma normally includes the violated target. Preserve compatibility with
  // older adapters/tests that return only P2002 while refusing explicit
  // unrelated targets above.
  return true;
}
