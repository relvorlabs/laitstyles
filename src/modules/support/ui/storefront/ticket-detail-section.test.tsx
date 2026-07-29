// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AccountUiProvider } from "@/modules/storefront-shell/ui/account-context";
import { supportTicketKeys } from "@/modules/support/client/keys";

vi.setConfig({ testTimeout: 20_000 });

const mocks = vi.hoisted(() => ({
  getTicket: vi.fn(),
  reply: vi.fn(),
  uploadAttachment: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("@/modules/support/client/api", () => ({
  getSupportTicketRequest: mocks.getTicket,
  replyToTicketRequest: mocks.reply,
  uploadSupportAttachmentRequest: mocks.uploadAttachment,
}));

import { TicketDetailSection } from "./ticket-detail-section";

const ticketId = "33333333-3333-4333-8333-333333333333";
const ticket = {
  id: ticketId,
  subject: "Order issue",
  category: "order",
  status: "open",
  lastMessageAt: "2026-07-29T00:00:00.000Z",
  createdAt: "2026-07-29T00:00:00.000Z",
  messages: [
    {
      id: "message-1",
      authorKind: "customer",
      body: "Please help.",
      createdAt: "2026-07-29T00:00:00.000Z",
      attachments: [],
    },
  ],
} as const;
function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(supportTicketKeys.detail(ticketId), ticket);
  return render(
    <QueryClientProvider client={client}>
      <AccountUiProvider
        value={{
          currentRoute: "ticket-detail",
          navigate: vi.fn(),
          openModal: vi.fn(),
          closeModal: vi.fn(),
          toast: mocks.toast,
        }}
      >
        <TicketDetailSection ticketId={ticketId} />
      </AccountUiProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getTicket.mockResolvedValue(ticket);
  mocks.reply.mockResolvedValue({ id: "message-2" });
  mocks.uploadAttachment.mockResolvedValue({
    assetId: "asset-1",
    fileName: "receipt.png",
    mimeType: "image/png",
    sizeBytes: 1024,
  });
});

it("associates a registered attachment with a persisted reply", async () => {
  const user = userEvent.setup();
  renderSection();
  await user.upload(
    screen.getByLabelText("Attach files"),
    new File(["receipt"], "receipt.png", { type: "image/png" }),
  );
  await screen.findByText("receipt.png");
  await user.type(screen.getByLabelText("Reply"), "See receipt.");
  await user.click(screen.getByRole("button", { name: "Send reply" }));
  await waitFor(() =>
    expect(mocks.reply.mock.calls[0]?.[0]).toEqual({
      ticketId,
      body: "See receipt.",
      attachments: [{ assetId: "asset-1", fileName: "receipt.png" }],
    }),
  );
});
afterEach(cleanup);

it("persists a reply before clearing the form and showing success", async () => {
  const user = userEvent.setup();
  renderSection();
  const field = screen.getByLabelText("Reply") as HTMLTextAreaElement;
  await user.type(field, "The issue remains.");
  await user.click(screen.getByRole("button", { name: "Send reply" }));
  await waitFor(() =>
    expect(mocks.reply.mock.calls[0]?.[0]).toEqual({
      ticketId,
      body: "The issue remains.",
      attachments: [],
    }),
  );
  expect(field.value).toBe("");
  expect(mocks.toast).toHaveBeenCalledWith("Reply sent");
});
