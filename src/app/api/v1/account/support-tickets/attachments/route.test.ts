import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  completeUpload: vi.fn(),
}));
vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/support/server/uploads", () => ({
  completeSupportAttachmentUpload: mocks.completeUpload,
}));

import { POST } from "./route";

const body = {
  publicId: "laitstyles/support/user/upload",
  fileName: "receipt.png",
  ownershipToken: "123.signature",
  resourceType: "image",
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireApiConsumer.mockResolvedValue({
    kind: "consumer",
    customerId: "11111111-1111-4111-8111-111111111111",
    authUserId: "22222222-2222-4222-8222-222222222222",
  });
  mocks.completeUpload.mockResolvedValue({
    assetId: "33333333-3333-4333-8333-333333333333",
    fileName: body.fileName,
    mimeType: "image/png",
    sizeBytes: 1024,
  });
});

it("registers only a completed customer-owned upload", async () => {
  const response = await POST(
    new Request("http://localhost/api/v1/account/support-tickets/attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  expect(response.status).toBe(200);
  expect(mocks.completeUpload).toHaveBeenCalledWith(
    {
      customerId: "11111111-1111-4111-8111-111111111111",
      authUserId: "22222222-2222-4222-8222-222222222222",
    },
    body,
  );
});

it("rejects malformed completion input before registration", async () => {
  const response = await POST(
    new Request("http://localhost/api/v1/account/support-tickets/attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, publicId: "" }),
    }),
  );
  expect(response.status).toBe(422);
  expect(mocks.completeUpload).not.toHaveBeenCalled();
});
