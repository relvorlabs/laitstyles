import { afterEach, describe, expect, it, vi } from "vitest";
import {
  changeAccountPasswordRequest,
  createMfaChallengeRequest,
  enrollTotpRequest,
  getAccountSessionsRequest,
  listMfaFactorsRequest,
  removeMfaFactorRequest,
  requestAccountEmailChangeRequest,
  signOutOtherSessionsRequest,
  verifyMfaChallengeRequest,
} from "@/modules/auth/client/account-security-api";
import {
  useEnrollTotp,
  useRemoveMfaFactor,
  useSignOutOtherSessions,
  useVerifyMfaChallenge,
} from "@/modules/auth/client/account-security-hooks";
import { accountSecurityKeys } from "@/modules/auth/client/account-security-keys";

const hookHarness = vi.hoisted(() => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@tanstack/react-query", () => ({
  queryOptions: (options: unknown) => options,
  useMutation: (options: unknown) => options,
  useQuery: (options: unknown) => options,
  useQueryClient: () => hookHarness.queryClient,
}));

const fetchMock = vi.fn();

afterEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("account security browser API", () => {
  it("uses the exact versioned credential routes and methods", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ data: { status: "confirmation-sent", email: "new@example.com" } }, 202),
      )
      .mockResolvedValueOnce(jsonResponse({ data: { status: "updated" } }));

    await requestAccountEmailChangeRequest({ email: "new@example.com" });
    await changeAccountPasswordRequest({
      currentPassword: "OldPassword1!",
      password: "NewPassword1!",
      confirmPassword: "NewPassword1!",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/account/security/email-change",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/account/security/password",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("uses private no-store reads and passes cancellation", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { factors: [] } })).mockResolvedValueOnce(
      jsonResponse({
        data: {
          current: { sessionId: "session-1", authenticatedAt: null, assuranceLevel: "aal1" },
          otherSessions: { kind: "count-unavailable" },
        },
      }),
    );
    const controller = new AbortController();

    await listMfaFactorsRequest(controller.signal);
    await getAccountSessionsRequest(controller.signal);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/account/security/mfa/factors",
      expect.objectContaining({ cache: "no-store", signal: controller.signal }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/account/security/sessions",
      expect.objectContaining({ cache: "no-store", signal: controller.signal }),
    );
  });

  it("encodes dynamic MFA identifiers and preserves each transport", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ data: { status: "unverified", factorId: "factor/1", totp: {} } }, 201),
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: { challengeId: "challenge/1", expiresAt: "later" } }, 201),
      )
      .mockResolvedValueOnce(jsonResponse({ data: { status: "verified", factorId: "factor/1" } }))
      .mockResolvedValueOnce(jsonResponse({ data: { status: "removed", factorId: "factor/1" } }))
      .mockResolvedValueOnce(jsonResponse({ data: { status: "signed-out" } }));

    await enrollTotpRequest({ friendlyName: "Phone" });
    await createMfaChallengeRequest({ factorId: "factor/1" });
    await verifyMfaChallengeRequest({
      challengeId: "challenge/1",
      factorId: "factor/1",
      code: "123456",
    });
    await removeMfaFactorRequest("factor/1");
    await signOutOtherSessionsRequest();

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
      ["/api/v1/account/security/mfa/factors", "POST"],
      ["/api/v1/account/security/mfa/challenges", "POST"],
      ["/api/v1/account/security/mfa/challenges/challenge%2F1/verify", "POST"],
      ["/api/v1/account/security/mfa/factors/factor%2F1", "DELETE"],
      ["/api/v1/account/security/sessions/others", "DELETE"],
    ]);
  });
});

describe("account security query invalidation", () => {
  it.each([
    { hook: useEnrollTotp, keys: [accountSecurityKeys.factors()] },
    {
      hook: useVerifyMfaChallenge,
      keys: [accountSecurityKeys.factors(), accountSecurityKeys.sessions()],
    },
    {
      hook: useRemoveMfaFactor,
      keys: [accountSecurityKeys.factors(), accountSecurityKeys.sessions()],
    },
    { hook: useSignOutOtherSessions, keys: [accountSecurityKeys.sessions()] },
  ])("invalidates only the affected security resources", ({ hook, keys }) => {
    const mutation = hook() as unknown as { onSuccess: () => void };

    mutation.onSuccess();

    expect(hookHarness.queryClient.invalidateQueries).toHaveBeenCalledTimes(keys.length);
    for (const queryKey of keys) {
      expect(hookHarness.queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey });
    }
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-request-id": "request-1" },
  });
}
