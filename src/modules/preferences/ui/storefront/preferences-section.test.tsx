// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AccountUiProvider } from "@/features/storefront/account/account-context";
import { notificationKeys } from "@/modules/notifications/client/keys";
import { preferencesKeys } from "@/modules/preferences/client/keys";

vi.setConfig({ testTimeout: 20_000 });

const mocks = vi.hoisted(() => ({
  updatePreferences: vi.fn(),
  updateNotification: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("@/modules/preferences/client/api", () => ({
  getCustomerPreferencesRequest: vi.fn(),
  updateCustomerPreferencesRequest: mocks.updatePreferences,
}));
vi.mock("@/modules/notifications/client/api", () => ({
  listNotificationPreferencesRequest: vi.fn(),
  updateNotificationPreferenceRequest: mocks.updateNotification,
}));

import { PreferencesSection } from "./preferences-section";

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(preferencesKeys.all, {
    contactChannel: "whatsapp",
    sizingUnit: "imperial",
    marketingOptIn: false,
    personalizationEnabled: true,
    updatedAt: null,
  });
  client.setQueryData(notificationKeys.preferences(), [
    { category: "order_updates", emailEnabled: true, smsEnabled: false, pushEnabled: true },
    { category: "security", emailEnabled: true, smsEnabled: false, pushEnabled: true },
    { category: "promotions", emailEnabled: false, smsEnabled: false, pushEnabled: true },
    { category: "support", emailEnabled: true, smsEnabled: false, pushEnabled: true },
  ]);
  return render(
    <QueryClientProvider client={client}>
      <AccountUiProvider
        value={{
          currentRoute: "preferences",
          navigate: vi.fn(),
          openModal: vi.fn(),
          closeModal: vi.fn(),
          toast: mocks.toast,
        }}
      >
        <PreferencesSection />
      </AccountUiProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updatePreferences.mockResolvedValue({});
  mocks.updateNotification.mockImplementation(async (input) => input);
});
afterEach(cleanup);

it("renders server-backed defaults", () => {
  renderSection();
  expect((screen.getByLabelText("Preferred contact channel") as HTMLSelectElement).value).toBe(
    "whatsapp",
  );
  expect((screen.getByLabelText("Sizing units") as HTMLSelectElement).value).toBe("imperial");
  expect(
    (screen.getByRole("checkbox", { name: /New-drop notes/ }) as HTMLInputElement).checked,
  ).toBe(false);
});

it("does not show success until every server mutation resolves", async () => {
  let resolveUpdate: (() => void) | undefined;
  mocks.updatePreferences.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      }),
  );
  const user = userEvent.setup();
  renderSection();
  await user.click(screen.getByRole("button", { name: "Save preferences" }));
  expect(await screen.findByRole("button", { name: "Saving preferences..." })).toBeTruthy();
  expect(mocks.toast).not.toHaveBeenCalled();
  resolveUpdate?.();
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith("Preferences saved"));
});
