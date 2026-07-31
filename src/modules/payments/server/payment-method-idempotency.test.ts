import { describe, expect, it } from "vitest";
import {
  isAuthorizationSignatureConflict,
  isPrismaUniqueConstraintError,
} from "@/modules/payments/server/payment-method-idempotency";

describe("payment method Prisma conflicts", () => {
  it("recognizes the provider-signature unique target", () => {
    expect(
      isAuthorizationSignatureConflict({
        code: "P2002",
        meta: { target: ["provider", "signature"] },
      }),
    ).toBe(true);
    expect(
      isAuthorizationSignatureConflict({
        code: "P2002",
        meta: { target: "payment_authorizations_provider_signature_unique" },
      }),
    ).toBe(true);
  });

  it("does not misclassify an unrelated default-method unique target", () => {
    expect(
      isAuthorizationSignatureConflict({
        code: "P2002",
        meta: { target: ["customer_id"] },
      }),
    ).toBe(false);
  });

  it("preserves the metadata-less P2002 compatibility fallback", () => {
    expect(isPrismaUniqueConstraintError({ code: "P2002" })).toBe(true);
    expect(isAuthorizationSignatureConflict({ code: "P2002" })).toBe(true);
  });
});
