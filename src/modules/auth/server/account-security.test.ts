import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  updateUser: vi.fn(),
  signInWithPassword: vi.fn(),
  getAuthRedirectUrl: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getClaims: mocks.getClaims,
      updateUser: mocks.updateUser,
      signInWithPassword: mocks.signInWithPassword,
    },
  })),
}));

vi.mock("@/modules/auth/server/redirects", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth/server/redirects")>();
  return { ...actual, getAuthRedirectUrl: mocks.getAuthRedirectUrl };
});

vi.mock("@/lib/prisma", () => ({
  prisma: { audit_events: { create: mocks.auditCreate } },
}));

import {
  changeAccountPassword,
  getAccountSecurityIdentity,
  requestAccountEmailChange,
} from "@/modules/auth/server/account-security";

const identity = {
  authUserId: "auth-user-a",
  email: "shopper@example.com",
  sessionId: "session-a",
  authenticatedAt: new Date().toISOString(),
  assuranceLevel: "aal1" as const,
};

describe("getAccountSecurityIdentity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves the current authenticated identity from session claims", async () => {
    mocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: "auth-user-a",
          email: "shopper@example.com",
          session_id: "session-a",
          iat: 1700000000,
          aal: "aal1",
        },
      },
    });

    await expect(getAccountSecurityIdentity()).resolves.toEqual({
      authUserId: "auth-user-a",
      email: "shopper@example.com",
      sessionId: "session-a",
      authenticatedAt: new Date(1700000000 * 1000).toISOString(),
      assuranceLevel: "aal1",
    });
  });

  it("reports no identity when the session cannot be verified", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: null } });

    await expect(getAccountSecurityIdentity()).resolves.toBeNull();
  });
});

describe("requestAccountEmailChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthRedirectUrl.mockResolvedValue(
      "https://laitstyle.example/auth/callback?next=%2Faccount%2Fsecurity",
    );
    mocks.updateUser.mockResolvedValue({ data: { user: null }, error: null });
    mocks.auditCreate.mockResolvedValue(undefined);
  });

  it("requests email change through the authenticated server client", async () => {
    await expect(
      requestAccountEmailChange(identity, { email: "new@example.com" }),
    ).resolves.toEqual({ status: "confirmation-sent", email: "new@example.com" });

    expect(mocks.updateUser).toHaveBeenCalledWith({ email: "new@example.com" }, expect.anything());
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actor_profile_id: "auth-user-a",
        action: "account.email_change_requested",
      }),
    });
  });

  it("rejects a request for the account's current email without calling the provider", async () => {
    await expect(
      requestAccountEmailChange(identity, { email: "shopper@example.com" }),
    ).rejects.toMatchObject({ code: "EMAIL_UNCHANGED" });

    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("requires a freshly authenticated session before requesting an email change", async () => {
    await expect(
      requestAccountEmailChange(
        { ...identity, authenticatedAt: new Date(0).toISOString() },
        { email: "new@example.com" },
      ),
    ).rejects.toMatchObject({ code: "REAUTHENTICATION_REQUIRED" });

    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("maps a provider failure to a stable code without writing an audit event", async () => {
    mocks.updateUser.mockResolvedValueOnce({
      data: { user: null },
      error: { code: "email_exists", status: 422 },
    });

    await expect(
      requestAccountEmailChange(identity, { email: "taken@example.com" }),
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });

    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});

describe("changeAccountPassword", () => {
  const validInput = {
    currentPassword: "OldPassword1!",
    password: "NewPassword1!",
    confirmPassword: "NewPassword1!",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    mocks.updateUser.mockResolvedValue({ data: { user: null }, error: null });
    mocks.auditCreate.mockResolvedValue(undefined);
  });

  it("rejects a password equal to the current submitted password", async () => {
    await expect(
      changeAccountPassword(identity, {
        currentPassword: "Same123!",
        password: "Same123!",
        confirmPassword: "Same123!",
      }),
    ).rejects.toMatchObject({ code: "PASSWORD_UNCHANGED" });

    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("re-proves the current password before changing it", async () => {
    await expect(changeAccountPassword(identity, validInput)).resolves.toEqual({
      status: "updated",
    });

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "shopper@example.com",
      password: "OldPassword1!",
    });
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "NewPassword1!" });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actor_profile_id: "auth-user-a",
        action: "account.password_changed",
      }),
    });
  });

  it("rejects an incorrect current password without calling updateUser", async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: { code: "invalid_credentials", status: 400 },
    });

    await expect(changeAccountPassword(identity, validInput)).rejects.toMatchObject({
      code: "INVALID_CURRENT_PASSWORD",
    });

    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
