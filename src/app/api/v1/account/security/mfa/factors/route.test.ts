import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAccountSecurityIdentity: vi.fn(),
  listMfaFactors: vi.fn(),
  enrollTotp: vi.fn(),
}));

vi.mock("@/modules/auth/server/account-security-http", () => ({
  requireAccountSecurityIdentity: mocks.requireAccountSecurityIdentity,
  throwAccountSecurityError: (error: unknown) => {
    throw error;
  },
}));
vi.mock("@/modules/auth/server/mfa", () => ({
  listMfaFactors: mocks.listMfaFactors,
  enrollTotp: mocks.enrollTotp,
}));

import { GET, POST } from "./route";

const identity = { authUserId: "user-1", email: "ada@example.com", sessionId: "session-1" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAccountSecurityIdentity.mockResolvedValue(identity);
});

describe("/api/v1/account/security/mfa/factors", () => {
  it("lists only the provider-backed factors without caching them", async () => {
    const data = {
      factors: [
        {
          id: "factor-1",
          friendlyName: "Phone authenticator",
          factorType: "totp",
          status: "verified",
        },
      ],
    };
    mocks.listMfaFactors.mockResolvedValueOnce(data);

    const response = await GET(new Request("http://localhost/api/v1/account/security/mfa/factors"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ data });
  });

  it("validates and starts a TOTP enrollment as unverified", async () => {
    const data = {
      status: "unverified",
      factorId: "factor-1",
      totp: { qrCode: "data:image/svg+xml,qr", secret: "SECRET", uri: "otpauth://totp/test" },
    };
    mocks.enrollTotp.mockResolvedValueOnce(data);

    const response = await POST(jsonRequest({ friendlyName: "My authenticator" }));

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.enrollTotp).toHaveBeenCalledWith(identity, { friendlyName: "My authenticator" });
    await expect(response.json()).resolves.toEqual({ data });
  });

  it("rejects an invalid authenticator name before provider enrollment", async () => {
    const response = await POST(jsonRequest({ friendlyName: "x".repeat(61) }));

    expect(response.status).toBe(422);
    expect(mocks.enrollTotp).not.toHaveBeenCalled();
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/v1/account/security/mfa/factors", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
