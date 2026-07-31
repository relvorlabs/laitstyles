import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decryptPayoutAccountNumber,
  encryptPayoutAccountNumber,
  fingerprintPayoutAccount,
  maskPayoutAccountNumber,
  normalizeAccountNumber,
  PayoutAccountSecretError,
} from "@/modules/payments/server/payout-secrets";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("payout account secrets", () => {
  it("encrypts account numbers with authenticated encryption and never stores plaintext", () => {
    vi.stubEnv("PAYOUT_ACCOUNT_SECRET", "owner-finance-secret-that-is-long-enough-123456");
    const encrypted = encryptPayoutAccountNumber("0123456789");

    expect(encrypted).not.toContain("0123456789");
    expect(decryptPayoutAccountNumber(encrypted)).toBe("0123456789");
    expect(maskPayoutAccountNumber("0123456789")).toBe("****6789");
  });

  it("creates deterministic keyed fingerprints scoped to bank and currency", () => {
    vi.stubEnv("PAYOUT_ACCOUNT_SECRET", "owner-finance-secret-that-is-long-enough-123456");
    const first = fingerprintPayoutAccount({
      accountNumber: "0123456789",
      bankCode: "001",
      currency: "NGN",
    });
    const replay = fingerprintPayoutAccount({
      accountNumber: "0123456789",
      bankCode: "001",
      currency: "ngn",
    });
    const differentBank = fingerprintPayoutAccount({
      accountNumber: "0123456789",
      bankCode: "002",
      currency: "NGN",
    });

    expect(replay).toBe(first);
    expect(differentBank).not.toBe(first);
    expect(first).not.toContain("0123456789");
  });

  it("rejects invalid account numbers and missing encryption configuration", () => {
    expect(() => normalizeAccountNumber("1234")).toThrow(TypeError);
    expect(() => encryptPayoutAccountNumber("0123456789")).toThrow(PayoutAccountSecretError);
  });
});
