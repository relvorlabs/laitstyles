// Shared contracts for the operations module: durable idempotency, the
// provider-webhook inbox and the transactional outbox. These are the
// server-authoritative primitives every later financial command (checkout,
// refund, payout, webhook handler) is built on top of — see
// `src/modules/operations/server/idempotency.ts`,
// `src/modules/operations/server/provider-events.ts` and
// `src/modules/operations/server/outbox.ts`.

/**
 * Outcome of a `claimIdempotency` call.
 *
 * - `claimed`: this call created (or reclaimed, after a prior failure) the
 *   record. The caller must run the business command exactly once and then
 *   call `completeIdempotency`.
 * - `in_progress`: another request with the same scope/key/actor/input is
 *   currently being processed. The caller must not run the business command
 *   again; it should report the operation as still pending.
 * - `completed`: the operation already ran to completion. `response` carries
 *   the original response snapshot and must be returned as-is.
 */
export type IdempotencyClaimState = "claimed" | "in_progress" | "completed";

export type IdempotencyClaim = {
  id: string;
  state: IdempotencyClaimState;
  response?: unknown;
};

export type PaymentProvider = "paystack" | "manual";

export type ProviderEventInput = {
  provider: PaymentProvider;
  /** The provider's own dedupe key for this event. */
  eventId: string;
  eventType: string;
  /** Provider-issued signature/verification token for the payload. */
  signature: string;
  /** Already-validated event payload. */
  payload: unknown;
};

/**
 * - `new`: first receipt of this provider/event id pair; safe to dispatch.
 * - `duplicate`: a redelivery of an event already received with the same
 *   signature; must not be dispatched again.
 * - `conflict`: the same provider/event id was received before with a
 *   different signature — a suspicious mismatch that must not be dispatched.
 */
export type ProviderEventReceiptStatus = "new" | "duplicate" | "conflict";

export type ProviderEventReceipt = {
  status: ProviderEventReceiptStatus;
  id: string;
};

export type OutboxMessageInput = {
  topic: string;
  payload: unknown;
  /** Defaults to now; set to defer delivery. */
  availableAt?: Date;
};

export type OutboxMessageReceipt = {
  id: string;
};
