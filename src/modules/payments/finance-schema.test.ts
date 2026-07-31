import { describe, expect, it } from "vitest";
import {
  createRecipientBodySchema,
  finalizeTransferBodySchema,
  initiateTransferBodySchema,
  reconcileFinanceBodySchema,
} from "@/modules/payments/finance-schema";

describe("finance input contracts", () => {
  it("accepts only positive NGN transfer amounts with a deliberate reason", () => {
    expect(
      initiateTransferBodySchema.parse({
        recipientId: "11111111-1111-4111-8111-111111111111",
        amountMinor: 25_000,
        currency: "NGN",
        reason: "Owner withdrawal",
      }),
    ).toMatchObject({ amountMinor: 25_000, currency: "NGN" });
    expect(() =>
      initiateTransferBodySchema.parse({
        recipientId: "11111111-1111-4111-8111-111111111111",
        amountMinor: 0,
        currency: "USD",
        reason: "x",
      }),
    ).toThrow();
  });

  it("strips transfer overrides from OTP finalization", () => {
    expect(
      finalizeTransferBodySchema.parse({
        otp: "123456",
        amountMinor: 99_999,
        recipientId: "22222222-2222-4222-8222-222222222222",
      }),
    ).toEqual({ otp: "123456" });
    expect(() => finalizeTransferBodySchema.parse({ otp: "12345" })).toThrow();
  });

  it("requires account identity and exact NGN recipient currency", () => {
    expect(
      createRecipientBodySchema.parse({
        name: "Operations",
        accountNumber: "0123456789",
        bankCode: "001",
        currency: "NGN",
      }),
    ).toMatchObject({ type: "nuban", currency: "NGN" });
    expect(() =>
      createRecipientBodySchema.parse({
        name: "Operations",
        accountNumber: "plain-account",
        bankCode: "001",
        currency: "NGN",
      }),
    ).toThrow();
  });

  it("requires a target identifier for scoped reconciliation", () => {
    expect(() => reconcileFinanceBodySchema.parse({ scope: "transfers" })).toThrow();
    expect(() => reconcileFinanceBodySchema.parse({ scope: "settlements" })).toThrow();
    expect(reconcileFinanceBodySchema.parse({ scope: "all" })).toEqual({ scope: "all" });
  });
});
