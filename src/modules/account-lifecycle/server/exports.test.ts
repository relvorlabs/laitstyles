import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  addressesFindMany: vi.fn(),
  preferencesFindUnique: vi.fn(),
  notificationsFindMany: vi.fn(),
  savedProductsFindMany: vi.fn(),
  ordersFindMany: vi.fn(),
  returnsFindMany: vi.fn(),
  reviewsFindMany: vi.fn(),
  ticketsFindMany: vi.fn(),
  consentsFindMany: vi.fn(),
  storeArtifact: vi.fn(),
  readArtifact: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    data_export_jobs: {
      findFirst: mocks.findFirst,
      findMany: mocks.findMany,
      create: mocks.create,
      update: mocks.update,
    },
    customer_addresses: { findMany: mocks.addressesFindMany },
    customer_preferences: { findUnique: mocks.preferencesFindUnique },
    notifications: { findMany: mocks.notificationsFindMany },
    customer_saved_products: { findMany: mocks.savedProductsFindMany },
    orders: { findMany: mocks.ordersFindMany },
    returns: { findMany: mocks.returnsFindMany },
    product_reviews: { findMany: mocks.reviewsFindMany },
    support_tickets: { findMany: mocks.ticketsFindMany },
    privacy_consents: { findMany: mocks.consentsFindMany },
  },
}));

vi.mock("@/modules/account-lifecycle/server/artifacts", () => ({
  storeAccountExportArtifact: mocks.storeArtifact,
  readAccountExportArtifact: mocks.readArtifact,
}));

import {
  getAccountExport,
  listAccountExports,
  requestAccountExport,
  streamAccountExport,
} from "@/modules/account-lifecycle/server/exports";

const identity = {
  customerId: "11111111-1111-4111-8111-111111111111",
  authUserId: "22222222-2222-4222-8222-222222222222",
  email: "amara@example.com",
  displayName: "Amara",
  phone: "+2348000000000",
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.addressesFindMany.mockResolvedValue([]);
  mocks.preferencesFindUnique.mockResolvedValue(null);
  mocks.notificationsFindMany.mockResolvedValue([]);
  mocks.savedProductsFindMany.mockResolvedValue([]);
  mocks.ordersFindMany.mockResolvedValue([]);
  mocks.returnsFindMany.mockResolvedValue([]);
  mocks.reviewsFindMany.mockResolvedValue([]);
  mocks.ticketsFindMany.mockResolvedValue([]);
  mocks.consentsFindMany.mockResolvedValue([]);
  mocks.storeArtifact.mockResolvedValue("account-exports/customer-1/export-1.json");
  mocks.readArtifact.mockResolvedValue('{"generatedAt":"2026-07-29T00:00:00.000Z"}');
});

describe("requestAccountExport", () => {
  it("projects customer-visible support conversations without internal staff notes", async () => {
    mocks.create.mockResolvedValue({
      id: "export-1",
      status: "queued",
      requested_at: new Date("2026-07-29T00:00:00.000Z"),
      completed_at: null,
      expires_at: null,
    });
    mocks.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "export-1",
      status: data.status,
      requested_at: new Date("2026-07-29T00:00:00.000Z"),
      completed_at: data.completed_at,
      expires_at: data.expires_at,
    }));

    await requestAccountExport(identity);

    expect(mocks.ticketsFindMany).toHaveBeenCalledWith({
      where: { customer_id: identity.customerId },
      select: expect.objectContaining({
        support_messages: {
          orderBy: { created_at: "asc" },
          select: {
            id: true,
            author_kind: true,
            body: true,
            created_at: true,
            support_attachments: {
              select: {
                id: true,
                file_name: true,
                mime_type: true,
                size_bytes: true,
              },
            },
          },
        },
      }),
    });
  });

  it("generates a ready export that expires 7 days after completion", async () => {
    mocks.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "export-1",
      status: data.status,
      requested_at: data.requested_at,
      completed_at: null,
      expires_at: null,
    }));
    mocks.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "export-1",
      status: data.status,
      requested_at: new Date("2026-07-29T00:00:00.000Z"),
      completed_at: data.completed_at,
      expires_at: data.expires_at,
    }));

    const result = await requestAccountExport(identity);

    expect(result.status).toBe("ready");
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ customer_id: identity.customerId, status: "queued" }),
      }),
    );
    expect(mocks.storeArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ exportId: "export-1", customerId: identity.customerId }),
    );
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "export-1" },
      data: expect.objectContaining({
        status: "ready",
        storage_key: "account-exports/customer-1/export-1.json",
      }),
    });
    const createdAt = new Date(result.completedAt as string);
    const expiresAt = new Date(result.expiresAt as string);
    expect(expiresAt.getTime() - createdAt.getTime()).toBe(7 * 24 * 60 * 60 * 1_000);
  });

  it("excludes provider secrets and internal notes from the export payload", async () => {
    mocks.create.mockResolvedValue({
      id: "export-1",
      status: "queued",
      requested_at: new Date("2026-07-29T00:00:00.000Z"),
      completed_at: null,
      expires_at: null,
    });
    mocks.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "export-1",
      status: data.status,
      requested_at: new Date("2026-07-29T00:00:00.000Z"),
      completed_at: data.completed_at,
      expires_at: data.expires_at,
    }));

    await requestAccountExport(identity);

    const storedPayload = JSON.stringify(mocks.storeArtifact.mock.calls[0][0].payload);
    expect(storedPayload).not.toContain("raw_response");
    expect(storedPayload).not.toContain("authorization_code");
    expect(storedPayload).not.toContain("internal");
    expect(mocks.update.mock.calls[0][0].data.storage_key).not.toContain("generatedAt");
  });
});

describe("getAccountExport", () => {
  it("lazily flips a stale ready export to expired", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "export-1",
      customer_id: identity.customerId,
      status: "ready",
      requested_at: new Date("2026-07-01T00:00:00.000Z"),
      completed_at: new Date("2026-07-01T00:00:00.000Z"),
      expires_at: new Date("2026-07-08T00:00:00.000Z"),
    });
    mocks.update.mockResolvedValue({
      id: "export-1",
      status: "expired",
      requested_at: new Date("2026-07-01T00:00:00.000Z"),
      completed_at: new Date("2026-07-01T00:00:00.000Z"),
      expires_at: new Date("2026-07-08T00:00:00.000Z"),
    });

    const result = await getAccountExport(identity, "export-1");

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "export-1" },
      data: { status: "expired" },
    });
    expect(result?.status).toBe("expired");
  });

  it("returns null for an export owned by another customer", async () => {
    mocks.findFirst.mockResolvedValue(null);

    await expect(getAccountExport(identity, "export-1")).resolves.toBeNull();
  });
});

describe("listAccountExports", () => {
  it("lists only the authenticated customer's newest jobs", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "export-1",
        status: "ready",
        requested_at: new Date("2026-07-29T00:00:00.000Z"),
        completed_at: new Date("2026-07-29T00:01:00.000Z"),
        expires_at: new Date("2026-08-05T00:01:00.000Z"),
      },
    ]);

    const result = await listAccountExports(identity);

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { customer_id: identity.customerId },
      orderBy: { requested_at: "desc" },
      take: 25,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("export-1");
  });
});

describe("streamAccountExport", () => {
  const now = new Date("2026-07-29T00:00:00.000Z");

  it("refuses an expired export download", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "export-1",
      customer_id: identity.customerId,
      status: "ready",
      storage_key: "{}",
      expires_at: new Date("2026-07-01T00:00:00.000Z"),
    });

    await expect(streamAccountExport(identity, "export-1", now)).rejects.toMatchObject({
      code: "EXPORT_EXPIRED",
    });
  });

  it("refuses a download for an export that is not ready yet", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "export-1",
      customer_id: identity.customerId,
      status: "queued",
      storage_key: null,
      expires_at: null,
    });

    await expect(streamAccountExport(identity, "export-1", now)).rejects.toMatchObject({
      code: "EXPORT_NOT_READY",
    });
  });

  it("streams a ready, unexpired export", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "export-1",
      customer_id: identity.customerId,
      status: "ready",
      storage_key: "account-exports/customer-1/export-1.json",
      expires_at: new Date("2026-08-05T00:00:00.000Z"),
    });

    const result = await streamAccountExport(identity, "export-1", now);

    expect(result.contentType).toBe("application/json");
    expect(result.filename).toBe("account-export-export-1.json");
    expect(result.body).toContain("generatedAt");
    expect(mocks.readArtifact).toHaveBeenCalledWith(
      "account-exports/customer-1/export-1.json",
      now,
    );
  });

  it("refuses a download for an export owned by another customer", async () => {
    mocks.findFirst.mockResolvedValue(null);

    await expect(streamAccountExport(identity, "export-1", now)).rejects.toMatchObject({
      code: "EXPORT_NOT_FOUND",
    });
  });
});
