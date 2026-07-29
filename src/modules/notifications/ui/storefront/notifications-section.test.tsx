// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { notificationKeys } from "@/modules/notifications/client/keys";

vi.setConfig({ testTimeout: 20_000 });

const mocks = vi.hoisted(() => ({ markAll: vi.fn(), markRead: vi.fn() }));
vi.mock("@/modules/notifications/client/api", () => ({
  listNotificationsRequest: vi.fn(),
  markAllNotificationsReadRequest: mocks.markAll,
  markNotificationReadRequest: mocks.markRead,
}));

import { NotificationsSection } from "./notifications-section";

const input = { page: 1, pageSize: 25, unreadOnly: false };
function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(notificationKeys.list(input), {
    data: [
      {
        id: "notification-1",
        category: "support",
        title: "Support replied",
        body: "We have an update.",
        data: {},
        readAt: null,
        createdAt: "2026-07-29T00:00:00.000Z",
      },
    ],
    meta: { page: 1, pageSize: 25, total: 1, pageCount: 1, unreadCount: 1 },
  });
  return render(
    <QueryClientProvider client={client}>
      <NotificationsSection />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.markAll.mockResolvedValue(undefined);
  mocks.markRead.mockResolvedValue(undefined);
});
afterEach(cleanup);

it("renders stored notifications and marks all read through the server mutation", async () => {
  const user = userEvent.setup();
  renderSection();
  expect(screen.getByText("Support replied")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Mark all read" }));
  await waitFor(() => expect(mocks.markAll).toHaveBeenCalledTimes(1));
});
