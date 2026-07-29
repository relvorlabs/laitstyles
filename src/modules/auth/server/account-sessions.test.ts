import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
  signOut: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getClaims: mocks.getClaims,
      signOut: mocks.signOut,
      mfa: { getAuthenticatorAssuranceLevel: mocks.getAuthenticatorAssuranceLevel },
    },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { audit_events: { create: mocks.auditCreate } },
}));

import {
  getAccountSessionSummary,
  signOutOtherSessions,
} from "@/modules/auth/server/account-sessions";

const identity = {
  authUserId: "auth-user-a",
  email: "shopper@example.com",
  sessionId: "session-a",
  authenticatedAt: new Date(1700000000 * 1000).toISOString(),
  assuranceLevel: "aal1" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "auth-user-a", iat: 1700000000 } } });
  mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({
    data: { currentLevel: "aal1", nextLevel: "aal1" },
    error: null,
  });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.auditCreate.mockResolvedValue(undefined);
});

describe("getAccountSessionSummary", () => {
  it("never fabricates device rows when the provider cannot list sessions", async () => {
    await expect(getAccountSessionSummary(identity)).resolves.toEqual({
      current: expect.objectContaining({ sessionId: identity.sessionId }),
      otherSessions: { kind: "count-unavailable" },
    });
  });

  it("reports the current session's authentication time and assurance level", async () => {
    await expect(getAccountSessionSummary(identity)).resolves.toEqual({
      current: {
        sessionId: "session-a",
        authenticatedAt: new Date(1700000000 * 1000).toISOString(),
        assuranceLevel: "aal1",
      },
      otherSessions: { kind: "count-unavailable" },
    });
    expect(mocks.getClaims).not.toHaveBeenCalled();
    expect(mocks.getAuthenticatorAssuranceLevel).not.toHaveBeenCalled();
  });
});

describe("signOutOtherSessions", () => {
  it("signs out other sessions without ending the current session", async () => {
    await expect(signOutOtherSessions(identity)).resolves.toEqual({ status: "signed-out" });

    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "others" });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "account.sessions.others_signed_out" }),
    });
  });

  it("maps a provider failure to a stable code without writing an audit event", async () => {
    mocks.signOut.mockResolvedValueOnce({ error: { code: "provider_error", status: 500 } });

    await expect(signOutOtherSessions(identity)).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
    });
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
