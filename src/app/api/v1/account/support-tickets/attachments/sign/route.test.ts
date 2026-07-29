import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  issueUpload: vi.fn(),
}));
vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/support/server/uploads", () => ({
  issueSupportAttachmentUpload: mocks.issueUpload,
}));

import { POST } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireApiConsumer.mockResolvedValue({
    kind: "consumer",
    customerId: "11111111-1111-4111-8111-111111111111",
    authUserId: "22222222-2222-4222-8222-222222222222",
  });
  mocks.issueUpload.mockReturnValue({ publicId: "laitstyles/support/user/upload" });
});

it("issues an account-owned support upload grant", async () => {
  const response = await POST(
    new Request("http://localhost/api/v1/account/support-tickets/attachments/sign", {
      method: "POST",
    }),
  );
  expect(response.status).toBe(200);
  expect(mocks.issueUpload).toHaveBeenCalledWith({
    customerId: "11111111-1111-4111-8111-111111111111",
    authUserId: "22222222-2222-4222-8222-222222222222",
  });
});

it("requires a consumer session before signing", async () => {
  mocks.requireApiConsumer.mockRejectedValueOnce(
    new ApiError({ code: "AUTHENTICATION_REQUIRED", message: "Sign in.", status: 401 }),
  );
  const response = await POST(
    new Request("http://localhost/api/v1/account/support-tickets/attachments/sign", {
      method: "POST",
    }),
  );
  expect(response.status).toBe(401);
  expect(mocks.issueUpload).not.toHaveBeenCalled();
});
