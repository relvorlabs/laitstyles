import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAccountSecurityIdentity: vi.fn(),
  getAccountSessionSummary: vi.fn(),
}));

vi.mock("@/modules/auth/server/account-security-http", () => ({
  requireAccountSecurityIdentity: mocks.requireAccountSecurityIdentity,
  throwAccountSecurityError: (error: unknown) => {
    throw error;
  },
}));
vi.mock("@/modules/auth/server/account-sessions", () => ({
  getAccountSessionSummary: mocks.getAccountSessionSummary,
}));

import { GET } from "./route";

const identity = { authUserId: "user-1", email: "ada@example.com", sessionId: "session-1" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAccountSecurityIdentity.mockResolvedValue(identity);
});

describe("GET /api/v1/account/security/sessions", () => {
  it("returns only the truthful current-session summary without caching", async () => {
    const data = {
      current: {
        sessionId: "session-1",
        authenticatedAt: "2026-07-29T10:00:00.000Z",
        assuranceLevel: "aal1",
      },
      otherSessions: { kind: "count-unavailable" },
    };
    mocks.getAccountSessionSummary.mockResolvedValueOnce(data);

    const response = await GET(new Request("http://localhost/api/v1/account/security/sessions"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.getAccountSessionSummary).toHaveBeenCalledWith(identity);
    const payload = await response.json();
    expect(payload).toEqual({ data });
    expect(JSON.stringify(payload)).not.toContain("userAgent");
  });
});
