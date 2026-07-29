import "server-only";

import { prisma } from "@/lib/prisma";
import {
  readAccountExportArtifact,
  storeAccountExportArtifact,
} from "@/modules/account-lifecycle/server/artifacts";
import { addDays, EXPORT_EXPIRY_DAYS } from "@/modules/account-lifecycle/server/policy";
import type {
  AccountExportPayload,
  AccountExportSummary,
  CustomerIdentity,
} from "@/modules/account-lifecycle/types";
import { AccountLifecycleError } from "@/modules/account-lifecycle/types";

function mapSummary(row: {
  id: string;
  status: AccountExportSummary["status"];
  requested_at: Date;
  completed_at: Date | null;
  expires_at: Date | null;
}): AccountExportSummary {
  return {
    id: row.id,
    status: row.status,
    requestedAt: row.requested_at.toISOString(),
    completedAt: row.completed_at ? row.completed_at.toISOString() : null,
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
  };
}

/** Builds the deterministic export snapshot: everything a customer owns
 * across this plan's domains plus the storefront records the design calls
 * for (profile, addresses, orders, returns, reviews) read directly from
 * their underlying tables — excluding provider secrets, authorization
 * codes, internal staff notes and any other customer's data. */
export async function buildAccountExportPayload(
  identity: CustomerIdentity,
): Promise<AccountExportPayload> {
  const [
    addresses,
    preferences,
    notifications,
    savedProducts,
    orders,
    returns,
    reviews,
    supportTickets,
    consentHistory,
  ] = await Promise.all([
    prisma.customer_addresses.findMany({ where: { customer_id: identity.customerId } }),
    prisma.customer_preferences.findUnique({ where: { customer_id: identity.customerId } }),
    prisma.notifications.findMany({
      where: { customer_id: identity.customerId },
      orderBy: { created_at: "desc" },
    }),
    prisma.customer_saved_products.findMany({ where: { customer_id: identity.customerId } }),
    prisma.orders.findMany({
      where: { customer_id: identity.customerId },
      select: {
        order_number: true,
        payment_status: true,
        fulfilment_status: true,
        currency: true,
        total: true,
        placed_at: true,
      },
    }),
    prisma.returns.findMany({
      where: { order: { customer_id: identity.customerId } },
      select: { id: true, status: true, reason: true, refund_amount: true, requested_at: true },
    }),
    prisma.product_reviews.findMany({
      where: { order_line: { orders: { customer_id: identity.customerId } } },
      select: { id: true, rating: true, status: true, created_at: true },
    }),
    prisma.support_tickets.findMany({
      where: { customer_id: identity.customerId },
      select: {
        id: true,
        subject: true,
        category: true,
        status: true,
        created_at: true,
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
      },
    }),
    prisma.privacy_consents.findMany({
      where: { customer_id: identity.customerId },
      orderBy: { effective_at: "desc" },
      select: { consent_key: true, granted: true, policy_version: true, effective_at: true },
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    profile: {
      displayName: identity.displayName,
      email: identity.email,
      phone: identity.phone,
    },
    addresses: addresses.map((row) => ({ ...row })),
    preferences: preferences ? { ...preferences } : null,
    notifications: notifications.map((row) => ({ ...row })),
    savedProducts: savedProducts.map((row) => ({ ...row })),
    orders: orders.map((row) => ({ ...row, total: row.total.toString() })),
    returns: returns.map((row) => ({ ...row, refund_amount: row.refund_amount.toString() })),
    reviews: reviews.map((row) => ({ ...row })),
    support: supportTickets.map((row) => ({ ...row })),
    consentHistory: consentHistory.map((row) => ({ ...row })),
  };
}

/** Requests a fresh export. The durable job is created first, then the
 * projection is written to authenticated asset storage and the job advances
 * to `ready`. `storage_key` remains an opaque artifact pointer. */
export async function requestAccountExport(
  identity: CustomerIdentity,
): Promise<AccountExportSummary> {
  const requestedAt = new Date();
  const job = await prisma.data_export_jobs.create({
    data: {
      customer_id: identity.customerId,
      status: "queued",
      requested_at: requestedAt,
    },
  });

  try {
    const payload = await buildAccountExportPayload(identity);
    const storageKey = await storeAccountExportArtifact({
      customerId: identity.customerId,
      exportId: job.id,
      payload,
    });
    const completedAt = new Date();
    const ready = await prisma.data_export_jobs.update({
      where: { id: job.id },
      data: {
        status: "ready",
        storage_key: storageKey,
        completed_at: completedAt,
        expires_at: addDays(completedAt, EXPORT_EXPIRY_DAYS),
      },
    });
    return mapSummary(ready);
  } catch {
    await prisma.data_export_jobs.update({
      where: { id: job.id },
      data: { status: "failed", error: "The export artifact could not be generated." },
    });
    throw new AccountLifecycleError(
      "EXPORT_STORAGE_UNAVAILABLE",
      "The export could not be generated. Try again later.",
    );
  }
}

export async function getAccountExport(
  identity: CustomerIdentity,
  exportId: string,
): Promise<AccountExportSummary | null> {
  const row = await prisma.data_export_jobs.findFirst({
    where: { id: exportId, customer_id: identity.customerId },
  });
  if (!row) return null;

  if (row.status === "ready" && row.expires_at && row.expires_at <= new Date()) {
    const expired = await prisma.data_export_jobs.update({
      where: { id: row.id },
      data: { status: "expired" },
    });
    return mapSummary(expired);
  }

  return mapSummary(row);
}

export async function streamAccountExport(
  identity: CustomerIdentity,
  exportId: string,
  now: Date = new Date(),
): Promise<{ filename: string; contentType: string; body: string }> {
  const row = await prisma.data_export_jobs.findFirst({
    where: { id: exportId, customer_id: identity.customerId },
  });
  if (!row) {
    throw new AccountLifecycleError("EXPORT_NOT_FOUND", "The selected export could not be found.");
  }
  if (row.status !== "ready") {
    throw new AccountLifecycleError(
      "EXPORT_NOT_READY",
      "This export is not ready to download yet.",
    );
  }
  if (row.expires_at && row.expires_at <= now) {
    throw new AccountLifecycleError(
      "EXPORT_EXPIRED",
      "This export has expired. Request a new one.",
    );
  }

  if (!row.storage_key) {
    throw new AccountLifecycleError(
      "EXPORT_NOT_READY",
      "This export is not ready to download yet.",
    );
  }

  return {
    filename: `account-export-${row.id}.json`,
    contentType: "application/json",
    body: await readAccountExportArtifact(row.storage_key, now),
  };
}

export async function listAccountExports(
  identity: CustomerIdentity,
): Promise<AccountExportSummary[]> {
  const rows = await prisma.data_export_jobs.findMany({
    where: { customer_id: identity.customerId },
    orderBy: { requested_at: "desc" },
    take: 25,
  });
  return rows.map(mapSummary);
}
