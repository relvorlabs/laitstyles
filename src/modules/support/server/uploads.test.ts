import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: vi.fn(),
  sign: vi.fn((params: Record<string, unknown>) => JSON.stringify(params)),
  resource: vi.fn(),
  assetFindUnique: vi.fn(),
  assetUpsert: vi.fn(),
}));
vi.mock("cloudinary", () => ({
  v2: {
    config: mocks.config,
    utils: { api_sign_request: mocks.sign },
    api: { resource: mocks.resource },
  },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    cloudinary_assets: {
      findUnique: mocks.assetFindUnique,
      upsert: mocks.assetUpsert,
    },
  },
}));

import {
  completeSupportAttachmentUpload,
  issueSupportAttachmentUpload,
} from "@/modules/support/server/uploads";

const identity = {
  customerId: "11111111-1111-4111-8111-111111111111",
  authUserId: "22222222-2222-4222-8222-222222222222",
};
const now = new Date("2026-07-29T12:00:00.000Z");

beforeEach(() => {
  vi.resetAllMocks();
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "demo";
  process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY = "key";
  process.env.CLOUDINARY_API_SECRET = "secret";
  mocks.sign.mockImplementation((params: Record<string, unknown>) => JSON.stringify(params));
  mocks.assetFindUnique.mockResolvedValue(null);
  mocks.assetUpsert.mockResolvedValue({ id: "33333333-3333-4333-8333-333333333333" });
});

function completedResource(publicId: string) {
  return {
    public_id: publicId,
    secure_url: "https://res.cloudinary.com/demo/image/upload/receipt.png",
    resource_type: "image",
    format: "png",
    version: 1,
    width: 100,
    height: 100,
    bytes: 2048,
    context: { custom: { account_owner: identity.authUserId } },
  };
}

describe("support attachment upload lifecycle", () => {
  it("issues an account-scoped signed upload and ownership token", () => {
    const grant = issueSupportAttachmentUpload(identity, now);
    expect(grant.publicId).toMatch(
      new RegExp(`^laitstyles/support/${identity.authUserId}/[0-9a-f-]+$`),
    );
    expect(grant.params.folder).toBe(`laitstyles/support/${identity.authUserId}`);
    expect(grant.params.context).toBe(`account_owner=${identity.authUserId}`);
    expect(grant.ownershipToken).toMatch(/^1785326400\./);
  });

  it("rejects a public ID outside the customer's folder", async () => {
    await expect(
      completeSupportAttachmentUpload(
        identity,
        {
          publicId: "laitstyles/support/someone-else/upload",
          fileName: "receipt.png",
          ownershipToken: "1785326400.invalid",
          resourceType: "image",
        },
        now,
      ),
    ).rejects.toMatchObject({ code: "SUPPORT_ATTACHMENT_NOT_OWNED" });
  });

  it("rejects an existing asset registered for another kind", async () => {
    const grant = issueSupportAttachmentUpload(identity, now);
    mocks.assetFindUnique.mockResolvedValue({
      id: "asset-1",
      kind: "product_cover",
      created_by_profile_id: identity.authUserId,
      format: "png",
      bytes: 2048,
    });
    await expect(
      completeSupportAttachmentUpload(
        identity,
        {
          publicId: grant.publicId,
          fileName: "receipt.png",
          ownershipToken: grant.ownershipToken,
          resourceType: "image",
        },
        now,
      ),
    ).rejects.toMatchObject({ code: "SUPPORT_ATTACHMENT_NOT_OWNED" });
  });

  it("rejects an upload that has not completed at the provider", async () => {
    const grant = issueSupportAttachmentUpload(identity, now);
    mocks.resource.mockRejectedValue(new Error("not found"));
    await expect(
      completeSupportAttachmentUpload(
        identity,
        {
          publicId: grant.publicId,
          fileName: "receipt.png",
          ownershipToken: grant.ownershipToken,
          resourceType: "image",
        },
        now,
      ),
    ).rejects.toMatchObject({ code: "SUPPORT_ATTACHMENT_INCOMPLETE" });
  });

  it("registers a completed upload as a customer-owned support attachment", async () => {
    const grant = issueSupportAttachmentUpload(identity, now);
    mocks.resource.mockResolvedValue(completedResource(grant.publicId));
    const result = await completeSupportAttachmentUpload(
      identity,
      {
        publicId: grant.publicId,
        fileName: "receipt.png",
        ownershipToken: grant.ownershipToken,
        resourceType: "image",
      },
      now,
    );
    expect(mocks.assetUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          kind: "support_attachment",
          created_by_profile_id: identity.authUserId,
          public_id: grant.publicId,
        }),
      }),
    );
    expect(result).toEqual({
      assetId: "33333333-3333-4333-8333-333333333333",
      fileName: "receipt.png",
      mimeType: "image/png",
      sizeBytes: 2048,
    });
  });
});
