import { beforeEach, describe, expect, it, vi } from "vitest";

const staff = {
  kind: "staff" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  role: "admin" as const,
};

const mocks = vi.hoisted(() => ({
  requireApiStaff: vi.fn(),
  signCloudinaryUploadParams: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiStaff: mocks.requireApiStaff }));
vi.mock("@/lib/assets/server/cloudinary-signature", () => ({
  signCloudinaryUploadParams: mocks.signCloudinaryUploadParams,
}));

import { POST } from "./route";

function validRequest() {
  return new Request("http://localhost/api/v1/admin/assets/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      paramsToSign: { timestamp: 123, folder: "laitstyles/products" },
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiStaff.mockResolvedValue(staff);
  mocks.signCloudinaryUploadParams.mockReturnValue("signed-value");
});

describe("POST /api/v1/admin/assets/sign", () => {
  it("returns the top-level signature required by next-cloudinary", async () => {
    const response = await POST(validRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-request-id")).toBeTruthy();
    await expect(response.json()).resolves.toEqual({ signature: "signed-value" });
  });

  it("keeps the safe API error envelope when signing is unavailable", async () => {
    mocks.signCloudinaryUploadParams.mockImplementation(() => {
      throw new Error("missing secret");
    });

    const response = await POST(validRequest());

    expect(response.status).toBe(503);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "ASSET_PROVIDER_UNCONFIGURED" },
    });
  });
});
