// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AccountUiProvider } from "@/features/storefront/account/account-context";
import { supportTicketKeys } from "@/modules/support/client/keys";

vi.setConfig({ testTimeout: 20_000 });

const mocks = vi.hoisted(() => ({ createTicket: vi.fn(), toast: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/modules/support/client/api", () => ({
  listSupportTicketsRequest: vi.fn(),
  createSupportTicketRequest: mocks.createTicket,
}));

import { SupportSection } from "./support-section";

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(supportTicketKeys.list({ page: 1, pageSize: 25 }), {
    data: [],
    meta: { page: 1, pageSize: 25, total: 0, pageCount: 0 },
  });
  return render(
    <QueryClientProvider client={client}>
      <AccountUiProvider
        value={{
          currentRoute: "support",
          navigate: vi.fn(),
          openModal: vi.fn(),
          closeModal: vi.fn(),
          toast: mocks.toast,
        }}
      >
        <SupportSection />
      </AccountUiProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createTicket.mockResolvedValue({ id: "ticket-1" });
});
afterEach(cleanup);

it("creates a persisted ticket before showing success and navigating", async () => {
  const user = userEvent.setup();
  renderSection();
  await user.click(screen.getByRole("button", { name: "Start request" }));
  await user.type(screen.getByLabelText("Subject"), "Order issue");
  await user.type(screen.getByLabelText("Message"), "My order has not arrived.");
  await user.click(screen.getByRole("button", { name: "Submit request" }));
  await waitFor(() => expect(mocks.createTicket).toHaveBeenCalled());
  expect(mocks.toast).toHaveBeenCalledWith("Support request created");
  expect(mocks.push).toHaveBeenCalledWith("/account/support/detail?ticketId=ticket-1");
});
