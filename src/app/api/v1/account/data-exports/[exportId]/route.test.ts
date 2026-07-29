import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireApiConsumer: vi.fn(), getAccountExport: vi.fn() }));
vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/account-lifecycle/server/exports", () => ({
  getAccountExport: mocks.getAccountExport,
}));

import { GET } from "./route";

const consumer = { kind: "consumer" as const, customerId: "customer-1" };
const exportId = "33333333-3333-4333-8333-333333333333";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(consumer);
  mocks.getAccountExport.mockResolvedValue(null);
});

it("does not expose an export owned by another customer", async () => {
  const response = await GET(
    new Request(`http://localhost/api/v1/account/data-exports/${exportId}`),
    { params: Promise.resolve({ exportId }) },
  );
  expect(response.status).toBe(404);
  await expect(response.json()).resolves.toMatchObject({ error: { code: "EXPORT_NOT_FOUND" } });
  expect(mocks.getAccountExport).toHaveBeenCalledWith(consumer, exportId);
});
