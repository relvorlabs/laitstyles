import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getClaims: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims: mocks.getClaims } })),
}));

import { requireRecentFinancialAuthentication } from "@/modules/payments/server/recent-auth";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-30T20:00:00.000Z"));
  mocks.getClaims.mockResolvedValue({
    data: {
      claims: {
        sub: "11111111-1111-4111-8111-111111111111",
        iat: Math.floor(Date.now() / 1_000) - 60,
      },
    },
    error: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("requireRecentFinancialAuthentication", () => {
  it("accepts a current authenticated claim", async () => {
    await expect(requireRecentFinancialAuthentication()).resolves.toBeUndefined();
  });

  it("requires a stable challenge when the session is too old", async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: {
        claims: {
          sub: "11111111-1111-4111-8111-111111111111",
          iat: Math.floor(Date.now() / 1_000) - 16 * 60,
        },
      },
      error: null,
    });

    await expect(requireRecentFinancialAuthentication()).rejects.toMatchObject({
      code: "MFA_CHALLENGE_REQUIRED",
      status: 403,
    });
  });

  it("rejects malformed and future-issued claims", async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: "user", iat: Math.floor(Date.now() / 1_000) + 30 } },
      error: null,
    });
    await expect(requireRecentFinancialAuthentication()).rejects.toMatchObject({
      code: "MFA_CHALLENGE_REQUIRED",
    });
  });
});
