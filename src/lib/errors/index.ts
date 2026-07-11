// Typed Result values for expected/business failures (invalid quantity,
// insufficient stock, invalid status transition, hold conflict, …). Unexpected
// failures use route error boundaries, not Result. See docs/storefront-v2/06 §6.

export type Result<T, E = StorefrontError> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Discriminated union of expected storefront failures, surfaced in plain
 *  business language beside the relevant field/action. */
export type StorefrontError =
  | { kind: "not_found"; message: string }
  | { kind: "unauthorized"; message: string }
  | { kind: "forbidden"; message: string }
  | { kind: "validation"; message: string; fields?: Record<string, string> }
  | { kind: "hold_conflict"; message: string }
  | { kind: "insufficient_stock"; message: string; available: number }
  | { kind: "invalid_transition"; message: string }
  | { kind: "payment_error"; message: string }
  | { kind: "rate_limited"; message: string };

export function notFound(message = "Not found"): StorefrontError {
  return { kind: "not_found", message };
}

export function unauthorized(message = "Sign in to continue"): StorefrontError {
  return { kind: "unauthorized", message };
}

export function forbidden(message = "You don't have access to this"): StorefrontError {
  return { kind: "forbidden", message };
}
