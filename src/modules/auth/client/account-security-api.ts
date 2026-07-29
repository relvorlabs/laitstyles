import { apiRequest } from "@/lib/http/client";
import type {
  AccountEmailChangeInput,
  AccountPasswordChangeInput,
  MfaChallengeInput,
  MfaEnrollTotpInput,
  MfaVerifyInput,
} from "@/modules/auth/schema";
import type {
  AccountEmailChangeResult,
  AccountPasswordChangeResult,
  AccountSessionSummary,
  MfaChallengeResult,
  MfaEnrollTotpResult,
  MfaFactorList,
  MfaUnenrollResult,
  MfaVerifyResult,
  SignOutOthersResult,
} from "@/modules/auth/types";

const SECURITY_URL = "/api/v1/account/security";

export async function requestAccountEmailChangeRequest(
  input: AccountEmailChangeInput,
): Promise<AccountEmailChangeResult> {
  const response = await apiRequest<AccountEmailChangeResult>(`${SECURITY_URL}/email-change`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function changeAccountPasswordRequest(
  input: AccountPasswordChangeInput,
): Promise<AccountPasswordChangeResult> {
  const response = await apiRequest<AccountPasswordChangeResult>(`${SECURITY_URL}/password`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function listMfaFactorsRequest(signal?: AbortSignal): Promise<MfaFactorList> {
  const response = await apiRequest<MfaFactorList>(`${SECURITY_URL}/mfa/factors`, {
    cache: "no-store",
    signal,
  });
  return response.data;
}

export async function enrollTotpRequest(input: MfaEnrollTotpInput): Promise<MfaEnrollTotpResult> {
  const response = await apiRequest<MfaEnrollTotpResult>(`${SECURITY_URL}/mfa/factors`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function createMfaChallengeRequest(
  input: MfaChallengeInput,
): Promise<MfaChallengeResult> {
  const response = await apiRequest<MfaChallengeResult>(`${SECURITY_URL}/mfa/challenges`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function verifyMfaChallengeRequest(
  input: MfaVerifyInput & { challengeId: string },
): Promise<MfaVerifyResult> {
  const { challengeId, ...body } = input;
  const response = await apiRequest<MfaVerifyResult>(
    `${SECURITY_URL}/mfa/challenges/${encodeURIComponent(challengeId)}/verify`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(body),
    },
  );
  return response.data;
}

export async function removeMfaFactorRequest(factorId: string): Promise<MfaUnenrollResult> {
  const response = await apiRequest<MfaUnenrollResult>(
    `${SECURITY_URL}/mfa/factors/${encodeURIComponent(factorId)}`,
    { method: "DELETE" },
  );
  return response.data;
}

export async function getAccountSessionsRequest(
  signal?: AbortSignal,
): Promise<AccountSessionSummary> {
  const response = await apiRequest<AccountSessionSummary>(`${SECURITY_URL}/sessions`, {
    cache: "no-store",
    signal,
  });
  return response.data;
}

export async function signOutOtherSessionsRequest(): Promise<SignOutOthersResult> {
  const response = await apiRequest<SignOutOthersResult>(`${SECURITY_URL}/sessions/others`, {
    method: "DELETE",
  });
  return response.data;
}

const jsonHeaders = { "Content-Type": "application/json" };
