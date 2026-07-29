// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AccountUiProvider } from "@/modules/storefront-shell/ui/account-context";
import { supportTicketKeys } from "@/modules/support/client/keys";

vi.setConfig({ testTimeout: 20_000 });

const mocks = vi.hoisted(() => ({
  createTicket: vi.fn(),
  listTickets: vi.fn(),
  uploadAttachment: vi.fn(),
  toast: vi.fn(),
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/modules/support/client/api", () => ({
  listSupportTicketsRequest: mocks.listTickets,
  createSupportTicketRequest: mocks.createTicket,
  uploadSupportAttachmentRequest: mocks.uploadAttachment,
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
  mocks.listTickets.mockResolvedValue({
    data: [],
    meta: { page: 1, pageSize: 25, total: 0, pageCount: 0 },
  });
  mocks.uploadAttachment.mockResolvedValue({
    assetId: "asset-1",
    fileName: "receipt.png",
    mimeType: "image/png",
    sizeBytes: 1024,
  });
});

it("uploads and associates a completed attachment before ticket creation", async () => {
  const user = userEvent.setup();
  renderSection();
  await user.click(screen.getByRole("button", { name: "Start request" }));
  await user.upload(
    screen.getByLabelText("Attach files"),
    new File(["receipt"], "receipt.png", { type: "image/png" }),
  );
  await screen.findByText("receipt.png");
  await user.type(screen.getByLabelText("Subject"), "Payment receipt");
  await user.type(screen.getByLabelText("Message"), "Please review.");
  await user.click(screen.getByRole("button", { name: "Submit request" }));
  await waitFor(() =>
    expect(mocks.createTicket.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        attachments: [{ assetId: "asset-1", fileName: "receipt.png" }],
      }),
    ),
  );
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
