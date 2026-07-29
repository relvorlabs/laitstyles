import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  listAccountExports: vi.fn(),
  requestAccountExport: vi.fn(),
}));
vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/account-lifecycle/server/exports", () => ({
  listAccountExports: mocks.listAccountExports,
  requestAccountExport: mocks.requestAccountExport,
}));

import { GET, POST } from "./route";

const consumer = { kind: "consumer" as const, customerId: "customer-1" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(consumer);
  mocks.listAccountExports.mockResolvedValue([]);
  mocks.requestAccountExport.mockResolvedValue({ id: "export-1", status: "ready" });
});

it("lists only the authenticated customer's exports", async () => {
  const response = await GET(new Request("http://localhost/api/v1/account/data-exports"));
  expect(response.status).toBe(200);
  expect(mocks.listAccountExports).toHaveBeenCalledWith(consumer);
});

it("creates an export request for the authenticated customer", async () => {
  const response = await POST(
    new Request("http://localhost/api/v1/account/data-exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }),
  );
  expect(response.status).toBe(201);
  expect(mocks.requestAccountExport).toHaveBeenCalledWith(consumer);
});
