import { apiRequest } from "@/lib/http/client";
import type {
  AccountDeletionRequestSummary,
  AccountExportSummary,
  RequestAccountDeletionInput,
} from "@/modules/account-lifecycle/types";

const DATA_EXPORTS_URL = "/api/v1/account/data-exports";
const DELETION_REQUESTS_URL = "/api/v1/account/deletion-requests";

export async function requestAccountExportRequest(): Promise<AccountExportSummary> {
  const response = await apiRequest<AccountExportSummary>(DATA_EXPORTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  return response.data;
}

export async function listAccountExportsRequest(
  signal?: AbortSignal,
): Promise<AccountExportSummary[]> {
  const response = await apiRequest<AccountExportSummary[]>(DATA_EXPORTS_URL, {
    cache: "no-store",
    signal,
  });
  return response.data;
}

export async function getAccountExportRequest(
  exportId: string,
  signal?: AbortSignal,
): Promise<AccountExportSummary> {
  const response = await apiRequest<AccountExportSummary>(
    `${DATA_EXPORTS_URL}/${encodeURIComponent(exportId)}`,
    { cache: "no-store", signal },
  );
  return response.data;
}

export function accountExportDownloadUrl(exportId: string): string {
  return `${DATA_EXPORTS_URL}/${encodeURIComponent(exportId)}/download`;
}

export async function getAccountDeletionRequestRequest(
  signal?: AbortSignal,
): Promise<AccountDeletionRequestSummary | null> {
  const response = await apiRequest<AccountDeletionRequestSummary | null>(DELETION_REQUESTS_URL, {
    cache: "no-store",
    signal,
  });
  return response.data;
}

export async function requestAccountDeletionRequest(
  input: RequestAccountDeletionInput,
): Promise<AccountDeletionRequestSummary> {
  const response = await apiRequest<AccountDeletionRequestSummary>(DELETION_REQUESTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function cancelAccountDeletionRequest(): Promise<void> {
  await apiRequest(DELETION_REQUESTS_URL, { method: "DELETE" });
}
