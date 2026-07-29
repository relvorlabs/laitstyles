import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findMany: vi.fn(),
  createMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

import { updatePrivacyPreferences } from "@/modules/privacy/server/commands";

const identity = { customerId: "11111111-1111-4111-8111-111111111111" };

function createTx() {
  return {
    privacy_consents: {
      findMany: mocks.findMany,
      createMany: mocks.createMany,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findMany.mockResolvedValue([]);
  mocks.createMany.mockResolvedValue({ count: 0 });
  mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback(createTx()),
  );
});

describe("updatePrivacyPreferences", () => {
  it("appends consent history only when the value changes", async () => {
    mocks.findMany.mockResolvedValue([
      {
        consent_key: "analytics",
        granted: true,
        effective_at: new Date("2026-06-01T00:00:00.000Z"),
      },
      {
        consent_key: "personalization",
        granted: true,
        effective_at: new Date("2026-06-01T00:00:00.000Z"),
      },
    ]);

    await updatePrivacyPreferences(identity, { analytics: false, personalization: true });

    expect(mocks.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          customer_id: identity.customerId,
          consent_key: "analytics",
          granted: false,
        }),
      ]),
    });
    const [{ data }] = mocks.createMany.mock.calls[0];
    expect(data).toHaveLength(1);
    expect(data.some((row: { consent_key: string }) => row.consent_key === "personalization")).toBe(
      false,
    );
  });

  it("writes nothing when every supplied value already matches the current state", async () => {
    mocks.findMany.mockResolvedValue([
      {
        consent_key: "marketing_email",
        granted: false,
        effective_at: new Date("2026-06-01T00:00:00.000Z"),
      },
    ]);

    await updatePrivacyPreferences(identity, { marketing_email: false });

    expect(mocks.createMany).not.toHaveBeenCalled();
  });

  it("treats an unset key as its deterministic default before diffing", async () => {
    mocks.findMany.mockResolvedValue([]);

    await updatePrivacyPreferences(identity, { marketing_sms: false });

    expect(mocks.createMany).not.toHaveBeenCalled();
  });
});
