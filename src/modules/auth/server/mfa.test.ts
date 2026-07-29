import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listFactors: vi.fn(),
  enroll: vi.fn(),
  challenge: vi.fn(),
  verify: vi.fn(),
  unenroll: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      mfa: {
        listFactors: mocks.listFactors,
        enroll: mocks.enroll,
        challenge: mocks.challenge,
        verify: mocks.verify,
        unenroll: mocks.unenroll,
        getAuthenticatorAssuranceLevel: mocks.getAuthenticatorAssuranceLevel,
      },
    },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { audit_events: { create: mocks.auditCreate } },
}));

import {
  createMfaChallenge,
  enrollTotp,
  listMfaFactors,
  unenrollFactor,
  verifyMfaChallenge,
} from "@/modules/auth/server/mfa";

const identity = {
  authUserId: "auth-user-a",
  email: "shopper@example.com",
  sessionId: "session-a",
  authenticatedAt: new Date().toISOString(),
  assuranceLevel: "aal1" as const,
};

const verifiedFactor = {
  id: "factor-1",
  friendly_name: "Authenticator app",
  factor_type: "totp",
  status: "verified" as const,
};

const pendingFactor = {
  id: "factor-2",
  type: "totp",
  totp: {
    qr_code: "data:image/svg+xml;utf-8,<svg/>",
    secret: "SECRET123",
    uri: "otpauth://totp/laitstyle?secret=SECRET123",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auditCreate.mockResolvedValue(undefined);
  mocks.listFactors.mockResolvedValue({
    data: { all: [verifiedFactor], totp: [verifiedFactor] },
    error: null,
  });
});

describe("listMfaFactors", () => {
  it("maps provider factors to the account-security read model", async () => {
    await expect(listMfaFactors(identity)).resolves.toEqual({
      factors: [
        {
          id: "factor-1",
          friendlyName: "Authenticator app",
          factorType: "totp",
          status: "verified",
        },
      ],
    });
  });
});

describe("enrollTotp", () => {
  it("does not report a factor verified before challenge verification", async () => {
    mocks.enroll.mockResolvedValue({ data: pendingFactor, error: null });

    await expect(enrollTotp(identity)).resolves.toMatchObject({ status: "unverified" });
    expect(mocks.enroll).toHaveBeenCalledWith({
      factorType: "totp",
      friendlyName: "Authenticator app",
    });
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("maps an enrollment provider failure to a stable code", async () => {
    mocks.enroll.mockResolvedValue({
      data: null,
      error: { code: "mfa_enroll_failed", status: 500 },
    });

    await expect(enrollTotp(identity)).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});

describe("createMfaChallenge", () => {
  it("creates a challenge for the selected factor", async () => {
    mocks.challenge.mockResolvedValue({
      data: { id: "challenge-1", type: "totp", expires_at: 1700000000 },
      error: null,
    });

    await expect(createMfaChallenge(identity, { factorId: "factor-1" })).resolves.toEqual({
      challengeId: "challenge-1",
      expiresAt: new Date(1700000000 * 1000).toISOString(),
    });
    expect(mocks.challenge).toHaveBeenCalledWith({ factorId: "factor-1" });
  });
});

describe("verifyMfaChallenge", () => {
  it("verifies the code and audits the verified factor", async () => {
    mocks.verify.mockResolvedValue({ data: {}, error: null });

    await expect(
      verifyMfaChallenge(identity, "challenge-1", { factorId: "factor-1", code: "123456" }),
    ).resolves.toEqual({ status: "verified", factorId: "factor-1" });

    expect(mocks.verify).toHaveBeenCalledWith({
      factorId: "factor-1",
      challengeId: "challenge-1",
      code: "123456",
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "account.mfa.factor_verified" }),
    });
  });

  it("maps an invalid or expired code to a stable code", async () => {
    mocks.verify.mockResolvedValue({
      data: null,
      error: { code: "invalid_totp_code", status: 422 },
    });

    await expect(
      verifyMfaChallenge(identity, "challenge-1", { factorId: "factor-1", code: "000000" }),
    ).rejects.toMatchObject({ code: "MFA_CHALLENGE_EXPIRED_OR_INVALID" });
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});

describe("unenrollFactor", () => {
  it("requires AAL2 before removing the last verified factor", async () => {
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
      error: null,
    });

    await expect(unenrollFactor(identity, "factor-1")).rejects.toMatchObject({
      code: "MFA_CHALLENGE_REQUIRED",
    });

    expect(mocks.unenroll).not.toHaveBeenCalled();
  });

  it("removes the last verified factor once the caller is at AAL2", async () => {
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal2", nextLevel: "aal2" },
      error: null,
    });
    mocks.unenroll.mockResolvedValue({ data: {}, error: null });

    await expect(unenrollFactor(identity, "factor-1")).resolves.toEqual({
      status: "removed",
      factorId: "factor-1",
    });
    expect(mocks.unenroll).toHaveBeenCalledWith({ factorId: "factor-1" });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "account.mfa.factor_removed" }),
    });
  });

  it("removes a non-last verified factor without requiring an AAL2 check", async () => {
    mocks.listFactors.mockResolvedValue({
      data: { all: [verifiedFactor, { ...verifiedFactor, id: "factor-3" }] },
      error: null,
    });
    mocks.unenroll.mockResolvedValue({ data: {}, error: null });

    await expect(unenrollFactor(identity, "factor-1")).resolves.toEqual({
      status: "removed",
      factorId: "factor-1",
    });
    expect(mocks.getAuthenticatorAssuranceLevel).not.toHaveBeenCalled();
  });

  it("rejects an unknown factor id", async () => {
    await expect(unenrollFactor(identity, "does-not-exist")).rejects.toMatchObject({
      code: "MFA_FACTOR_NOT_FOUND",
    });
    expect(mocks.unenroll).not.toHaveBeenCalled();
  });
});
