// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { accountLifecycleKeys } from "@/modules/account-lifecycle/client/keys";
import { privacyKeys } from "@/modules/privacy/client/keys";
import { AccountUiProvider } from "@/modules/storefront-shell/ui/account-context";
import { storefrontUiStore } from "@/stores/storefront-ui.store";

vi.setConfig({ testTimeout: 20_000 });

const mocks = vi.hoisted(() => ({
  requestExport: vi.fn(),
  requestDeletion: vi.fn(),
  cancelDeletion: vi.fn(),
  updatePrivacy: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("@/modules/account-lifecycle/client/api", () => ({
  listAccountExportsRequest: vi.fn(),
  getAccountDeletionRequestRequest: vi.fn(),
  requestAccountExportRequest: mocks.requestExport,
  requestAccountDeletionRequest: mocks.requestDeletion,
  cancelAccountDeletionRequest: mocks.cancelDeletion,
  accountExportDownloadUrl: (id: string) => `/api/v1/account/data-exports/${id}/download`,
}));
vi.mock("@/modules/privacy/client/api", () => ({
  getPrivacyPreferencesRequest: vi.fn(),
  updatePrivacyPreferencesRequest: mocks.updatePrivacy,
}));

import { PrivacySection } from "./privacy-section";

function renderSection(deletion: unknown = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(privacyKeys.all, {
    consents: {
      analytics: false,
      personalization: true,
      marketing_email: false,
      marketing_sms: false,
    },
    policyVersion: "2026-07-28.1",
    updatedAt: null,
  });
  client.setQueryData(accountLifecycleKeys.exports.all, [
    {
      id: "ready-export",
      status: "ready",
      requestedAt: "2026-07-29T00:00:00.000Z",
      completedAt: "2026-07-29T00:01:00.000Z",
      expiresAt: "2026-08-05T00:01:00.000Z",
    },
    {
      id: "expired-export",
      status: "expired",
      requestedAt: "2026-07-01T00:00:00.000Z",
      completedAt: "2026-07-01T00:01:00.000Z",
      expiresAt: "2026-07-08T00:01:00.000Z",
    },
  ]);
  client.setQueryData(accountLifecycleKeys.deletion.all, deletion);
  return render(
    <QueryClientProvider client={client}>
      <AccountUiProvider
        value={{
          currentRoute: "privacy",
          navigate: vi.fn(),
          openModal: vi.fn(),
          closeModal: vi.fn(),
          toast: mocks.toast,
        }}
      >
        <PrivacySection />
      </AccountUiProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  storefrontUiStore.getState().reset();
  mocks.requestExport.mockResolvedValue({ id: "export-new" });
  mocks.requestDeletion.mockResolvedValue({ id: "delete-1", status: "scheduled" });
  mocks.cancelDeletion.mockResolvedValue(undefined);
  mocks.updatePrivacy.mockResolvedValue(undefined);
});
afterEach(cleanup);

it("shows ready and expired export states and requests a new export through the server", async () => {
  const user = userEvent.setup();
  renderSection();
  expect(screen.getByRole("link", { name: "Download" }).getAttribute("href")).toContain(
    "ready-export",
  );
  expect(screen.getByText("Expired")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Request export" }));
  await waitFor(() => expect(mocks.requestExport).toHaveBeenCalledTimes(1));
  expect(mocks.toast).toHaveBeenCalledWith("Account export requested");
});

it("requires explicit confirmation before scheduling deletion", async () => {
  const user = userEvent.setup();
  renderSection();
  const button = screen.getByRole("button", {
    name: "Request account deletion",
  }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  await user.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
  await user.click(button);
  await waitFor(() => expect(mocks.requestDeletion).toHaveBeenCalledTimes(1));
});
