import "server-only";

import type { Prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { createPaginationMeta } from "@/lib/http/pagination";
import { adminHoldInclude, mapAdminHoldRow } from "@/modules/holds/server/mappers";
import type {
  AdminHoldListResult,
  ControlRoomHold,
  HoldListInput,
  HoldSavedView,
  HoldSavedViewCounts,
  HoldWorkspaceSummary,
} from "@/modules/holds/types";

export async function listAdminHolds(input: HoldListInput): Promise<AdminHoldListResult> {
  const now = new Date();
  const where = buildHoldWhere(input, now);
  const [rows, total, counts, summary] = await Promise.all([
    prisma.holds.findMany({
      where,
      include: adminHoldInclude,
      orderBy: buildHoldSort(input.sort),
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.holds.count({ where }),
    getHoldSavedViewCounts(now),
    getHoldWorkspaceSummary(now),
  ]);

  return {
    data: rows.map((row) => mapAdminHoldRow(row, now)),
    meta: {
      ...createPaginationMeta({ page: input.page, pageSize: input.pageSize, total }),
      counts,
      summary,
    },
  };
}

export async function getAdminHold(holdId: string): Promise<ControlRoomHold | null> {
  const now = new Date();
  const row = await prisma.holds.findUnique({
    where: { id: holdId },
    include: adminHoldInclude,
  });
  return row ? mapAdminHoldRow(row, now) : null;
}

function buildHoldWhere(input: HoldListInput, now: Date): Prisma.holdsWhereInput {
  const clauses: Prisma.holdsWhereInput[] = [];
  const view = savedViewWhere(input.view, now);
  if (view) clauses.push(view);

  if (input.source === "storefront") clauses.push({ source: "storefront" });
  if (input.source === "assisted") clauses.push({ NOT: { source: "storefront" } });
  if (input.stage !== "all") clauses.push({ stage: input.stage });

  if (input.search) {
    const contains = { contains: input.search, mode: "insensitive" as const };
    clauses.push({
      OR: [
        ...(isUuid(input.search) ? [{ id: input.search }] : []),
        { source: contains },
        { note: contains },
        { customers: { is: { name: contains } } },
        { customers: { is: { email: contains } } },
        { customers: { is: { phone: contains } } },
        { products: { is: { name: contains } } },
        { products: { is: { sku: contains } } },
        { products: { is: { archive_number: contains } } },
        { product_variants: { is: { label: contains } } },
        { product_variants: { is: { sku: contains } } },
      ],
    });
  }

  return clauses.length ? { AND: clauses } : {};
}

function savedViewWhere(view: HoldSavedView, now: Date): Prisma.holdsWhereInput | null {
  const expiringAt = new Date(now.getTime() + 5 * 60 * 1_000);
  switch (view) {
    case "all":
      return null;
    case "active":
      return { status: "active", expires_at: { gt: now } };
    case "expiring":
      return { status: "active", expires_at: { gt: now, lte: expiringAt } };
    case "payment-risk":
      return { status: "active", expires_at: { gt: now }, payment_progress: "failed" };
    case "expired":
      return {
        OR: [{ status: "expired" }, { status: "active", expires_at: { lte: now } }],
      };
  }
}

function buildHoldSort(sort: HoldListInput["sort"]): Prisma.holdsOrderByWithRelationInput[] {
  switch (sort) {
    case "expiry-asc":
      return [{ expires_at: "asc" }, { id: "asc" }];
    case "expiry-desc":
      return [{ expires_at: "desc" }, { id: "asc" }];
    case "started-desc":
      return [{ started_at: "desc" }, { id: "asc" }];
    case "quantity-desc":
      return [{ quantity: "desc" }, { expires_at: "asc" }];
  }
}

async function getHoldSavedViewCounts(now: Date): Promise<HoldSavedViewCounts> {
  const expiringAt = new Date(now.getTime() + 5 * 60 * 1_000);
  const [all, active, expiring, paymentRisk, expired] = await prisma.$transaction([
    prisma.holds.count(),
    prisma.holds.count({ where: { status: "active", expires_at: { gt: now } } }),
    prisma.holds.count({
      where: { status: "active", expires_at: { gt: now, lte: expiringAt } },
    }),
    prisma.holds.count({
      where: { status: "active", expires_at: { gt: now }, payment_progress: "failed" },
    }),
    prisma.holds.count({
      where: { OR: [{ status: "expired" }, { status: "active", expires_at: { lte: now } }] },
    }),
  ]);
  return { all, active, expiring, "payment-risk": paymentRisk, expired };
}

async function getHoldWorkspaceSummary(now: Date): Promise<HoldWorkspaceSummary> {
  const expiringAt = new Date(now.getTime() + 5 * 60 * 1_000);
  const [totalHolds, activeHolds, expiringHolds, paymentRisk, expiredHolds, reserved] =
    await prisma.$transaction([
      prisma.holds.count(),
      prisma.holds.count({ where: { status: "active", expires_at: { gt: now } } }),
      prisma.holds.count({
        where: { status: "active", expires_at: { gt: now, lte: expiringAt } },
      }),
      prisma.holds.count({
        where: { status: "active", expires_at: { gt: now }, payment_progress: "failed" },
      }),
      prisma.holds.count({
        where: { OR: [{ status: "expired" }, { status: "active", expires_at: { lte: now } }] },
      }),
      prisma.holds.aggregate({
        where: { status: "active", expires_at: { gt: now } },
        _sum: { quantity: true },
      }),
    ]);

  return {
    totalHolds,
    activeHolds,
    expiringHolds,
    paymentRisk,
    expiredHolds,
    reservedUnits: reserved._sum.quantity ?? 0,
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
