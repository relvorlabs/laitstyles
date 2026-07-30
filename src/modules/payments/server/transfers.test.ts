import { describe, expect, it } from "vitest";
import { Prisma } from "@/lib/prisma";
import {
  buildPersistedTransferCommand,
  shouldResumePersistedTransferIntent,
} from "@/modules/payments/server/transfers";

const originalReference = "lt_12345678901234567890123456789012";

function persistedIntent() {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    amount: new Prisma.Decimal("250.00"),
    currency: "NGN",
    reason: "Owner withdrawal",
    reference: originalReference,
    status: "pending" as const,
    provider_transfer_code: null,
    provider_status: null,
    last_provider_sync_at: null,
    payout_recipients: {
      id: "22222222-2222-4222-8222-222222222222",
      provider: "paystack" as const,
      recipient_code: "RCP_owner",
      recipient_type: "nuban",
      name: "Operations account",
      account_name: "LAITSTYLES LIMITED",
      bank_name: "Test Bank",
      bank_code: "001",
      account_number_last4: "1234",
      account_number_ciphertext: "encrypted-account-number",
      account_fingerprint: "account-fingerprint",
      currency: "NGN",
      is_active: true,
      deleted_at: null,
      provider_snapshot: {},
      created_by_profile_id: "33333333-3333-4333-8333-333333333333",
      created_at: new Date("2026-07-30T12:00:00.000Z"),
      updated_at: new Date("2026-07-30T12:00:00.000Z"),
    },
  } satisfies Parameters<typeof buildPersistedTransferCommand>[0];
}

describe("persisted payout transfer recovery", () => {
  it("recognizes only an unsubmitted pending intent as resumable", () => {
    const intent = persistedIntent();

    expect(shouldResumePersistedTransferIntent(intent)).toBe(true);
    expect(
      shouldResumePersistedTransferIntent({
        ...intent,
        provider_status: "pending",
      }),
    ).toBe(false);
    expect(
      shouldResumePersistedTransferIntent({
        ...intent,
        status: "processing",
      }),
    ).toBe(false);
  });

  it("reuses the exact stored reference and command values after a crash", () => {
    const command = buildPersistedTransferCommand(persistedIntent());

    expect(command).toEqual({
      amountMinor: 25_000,
      recipientCode: "RCP_owner",
      reference: originalReference,
      reason: "Owner withdrawal",
      currency: "NGN",
    });
  });

  it("rejects a corrupted persisted intent instead of inventing a reason", () => {
    expect(() =>
      buildPersistedTransferCommand({
        ...persistedIntent(),
        reason: null,
      }),
    ).toThrow("must retain its original reason");
  });
});
