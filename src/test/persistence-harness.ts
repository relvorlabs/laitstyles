import { spawnSync } from "node:child_process";

import type { StaffSession } from "@/server/auth/session";

export const ACCEPTANCE_PREFIX = "acceptance-p45-";

const DISPOSABLE_DATABASE_NAME = /(?:^|[_-])(acceptance|disposable|e2e|test)(?:$|[_-])/i;
const LOCAL_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const FORBIDDEN_HOST_PARTS = ["prod", "production", "primary"];
const REFUSAL = "Refusing non-disposable database";

const IDS = {
  adminProfile: "a45a0000-0000-4000-8000-000000000001",
  managerProfile: "a45a0000-0000-4000-8000-000000000002",
  consumerProfile: "a45a0000-0000-4000-8000-000000000003",
  suspendedProfile: "a45a0000-0000-4000-8000-000000000004",
  customer: "a45c0000-0000-4000-8000-000000000001",
  uniqueProduct: "a45d0000-0000-4000-8000-000000000001",
  stockedProduct: "a45d0000-0000-4000-8000-000000000002",
  variantProduct: "a45d0000-0000-4000-8000-000000000003",
  variant: "a45e0000-0000-4000-8000-000000000001",
  deliveredOrder: "a45f0000-0000-4000-8000-000000000001",
  activeHold: "a45b0000-0000-4000-8000-000000000001",
} as const;

export type AcceptanceActors = {
  admin: StaffSession;
  manager: StaffSession;
  consumerProfileId: string;
  suspendedProfileId: string;
};

export type AcceptanceSeed = {
  actors: AcceptanceActors;
  customerId: string;
  uniqueProductId: string;
  stockedProductId: string;
  variantProductId: string;
  variantId: string;
  deliveredOrderId: string;
  activeHoldId: string;
};

export type AcceptanceProbe =
  | "products"
  | "inventory"
  | "orders"
  | "holds"
  | "returns"
  | "customers"
  | "settings"
  | "overview";

export function assertDisposableAcceptanceDatabase(): URL {
  if (process.env.LAITSTYLES_ACCEPTANCE_DATABASE !== "1") {
    throw new Error(`${REFUSAL}: acceptance marker is not set`);
  }

  const explicitlyAllowedHosts = new Set(
    (process.env.LAITSTYLES_ACCEPTANCE_DATABASE_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
  const databaseUrl = parseDisposableDatabaseUrl(process.env.DATABASE_URL, explicitlyAllowedHosts);
  if (process.env.DIRECT_URL) {
    parseDisposableDatabaseUrl(process.env.DIRECT_URL, explicitlyAllowedHosts);
  }

  return databaseUrl;
}

function parseDisposableDatabaseUrl(
  rawUrl: string | undefined,
  explicitlyAllowedHosts: ReadonlySet<string>,
): URL {
  let databaseUrl: URL;
  let databaseName: string;
  try {
    databaseUrl = new URL(rawUrl ?? "");
    databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ""));
  } catch {
    throw new Error(`${REFUSAL}: invalid DATABASE_URL`);
  }

  if (databaseUrl.protocol !== "postgresql:" && databaseUrl.protocol !== "postgres:") {
    throw new Error(`${REFUSAL}: invalid DATABASE_URL`);
  }

  const hostname = databaseUrl.hostname.toLowerCase();
  const hostAllowed = LOCAL_HOSTS.has(hostname) || explicitlyAllowedHosts.has(hostname);
  const hostForbidden = FORBIDDEN_HOST_PARTS.some((part) => hostname.includes(part));
  if (!hostAllowed || hostForbidden || !DISPOSABLE_DATABASE_NAME.test(databaseName)) {
    throw new Error(`${REFUSAL}: target is not explicitly disposable`);
  }

  return databaseUrl;
}

export async function resetAcceptanceData(): Promise<void> {
  assertDisposableAcceptanceDatabase();
  const { prisma } = await import("@/lib/prisma");
  const profileIds = [
    IDS.adminProfile,
    IDS.managerProfile,
    IDS.consumerProfile,
    IDS.suspendedProfile,
  ];
  const productIds = [IDS.uniqueProduct, IDS.stockedProduct, IDS.variantProduct];

  await prisma.$transaction(async (tx) => {
    await tx.return_lines.deleteMany({
      where: { return: { order_id: IDS.deliveredOrder } },
    });
    await tx.returns.deleteMany({ where: { order_id: IDS.deliveredOrder } });
    await tx.order_reviews.deleteMany({ where: { order_id: IDS.deliveredOrder } });
    await tx.order_payment_events.deleteMany({ where: { order_id: IDS.deliveredOrder } });
    await tx.payments.deleteMany({ where: { order_id: IDS.deliveredOrder } });
    await tx.deliveries.deleteMany({ where: { order_id: IDS.deliveredOrder } });
    await tx.order_timeline_events.deleteMany({ where: { order_id: IDS.deliveredOrder } });
    await tx.stock_movements.deleteMany({
      where: {
        OR: [{ related_order_id: IDS.deliveredOrder }, { product_id: { in: productIds } }],
      },
    });
    await tx.holds.deleteMany({ where: { product_id: { in: productIds } } });
    await tx.order_lines.deleteMany({ where: { order_id: IDS.deliveredOrder } });
    await tx.orders.deleteMany({ where: { id: IDS.deliveredOrder } });
    await tx.customer_notes.deleteMany({ where: { customer_id: IDS.customer } });
    await tx.customer_saved_products.deleteMany({ where: { customer_id: IDS.customer } });
    await tx.customer_addresses.deleteMany({ where: { customer_id: IDS.customer } });
    await tx.activity_events.deleteMany({
      where: {
        OR: [
          { customer_id: IDS.customer },
          { order_id: IDS.deliveredOrder },
          { product_id: { in: productIds } },
        ],
      },
    });
    await tx.audit_events.deleteMany({ where: { actor_profile_id: { in: profileIds } } });
    await tx.customers.deleteMany({ where: { id: IDS.customer } });
    await tx.stock_levels.deleteMany({ where: { product_id: { in: productIds } } });
    await tx.product_variants.deleteMany({ where: { product_id: { in: productIds } } });
    await tx.products.deleteMany({ where: { id: { in: productIds } } });
    await tx.profiles.deleteMany({ where: { id: { in: profileIds } } });
  });
}

export async function seedAcceptanceData(): Promise<AcceptanceSeed> {
  assertDisposableAcceptanceDatabase();
  const { prisma } = await import("@/lib/prisma");

  await resetAcceptanceData();
  await prisma.$transaction(async (tx) => {
    await tx.profiles.createMany({
      data: [
        {
          id: IDS.adminProfile,
          role: "admin",
          status: "active",
          display_name: `${ACCEPTANCE_PREFIX}admin`,
        },
        {
          id: IDS.managerProfile,
          role: "manager",
          status: "active",
          display_name: `${ACCEPTANCE_PREFIX}manager`,
        },
        {
          id: IDS.consumerProfile,
          role: "consumer",
          status: "active",
          display_name: `${ACCEPTANCE_PREFIX}consumer`,
        },
        {
          id: IDS.suspendedProfile,
          role: "manager",
          status: "suspended",
          display_name: `${ACCEPTANCE_PREFIX}suspended`,
        },
      ],
    });
    await tx.customers.create({
      data: {
        id: IDS.customer,
        profile_id: IDS.consumerProfile,
        name: `${ACCEPTANCE_PREFIX}customer`,
      },
    });
    await tx.products.createMany({
      data: [
        seedProduct(IDS.uniqueProduct, "unique", "unique"),
        seedProduct(IDS.stockedProduct, "stocked", "stocked"),
        seedProduct(IDS.variantProduct, "variant", "variant"),
      ],
    });
    await tx.product_variants.create({
      data: {
        id: IDS.variant,
        product_id: IDS.variantProduct,
        label: "Acceptance variant",
        sku: "ACCEPTANCE-P45-VARIANT",
        size: "M",
      },
    });
    await tx.stock_levels.createMany({
      data: [
        {
          product_id: IDS.uniqueProduct,
          total_received: 1,
          available: 1,
        },
        {
          product_id: IDS.stockedProduct,
          total_received: 5,
          available: 5,
        },
        {
          product_id: IDS.variantProduct,
          variant_id: IDS.variant,
          total_received: 3,
          available: 3,
        },
      ],
    });
    await tx.orders.create({
      data: {
        id: IDS.deliveredOrder,
        order_number: "ACCEPTANCE-P45-DELIVERED",
        customer_id: IDS.customer,
        source: "acceptance",
        payment_status: "paid",
        fulfilment_status: "delivered",
        total: "1000.00",
      },
    });
    await tx.holds.create({
      data: {
        id: IDS.activeHold,
        customer_id: IDS.customer,
        product_id: IDS.stockedProduct,
        quantity: 1,
        source: ACCEPTANCE_PREFIX,
        expires_at: new Date("2099-01-01T00:00:00.000Z"),
      },
    });
  });

  return {
    actors: {
      admin: staffSession(IDS.adminProfile, "admin"),
      manager: staffSession(IDS.managerProfile, "manager"),
      consumerProfileId: IDS.consumerProfile,
      suspendedProfileId: IDS.suspendedProfile,
    },
    customerId: IDS.customer,
    uniqueProductId: IDS.uniqueProduct,
    stockedProductId: IDS.stockedProduct,
    variantProductId: IDS.variantProduct,
    variantId: IDS.variant,
    deliveredOrderId: IDS.deliveredOrder,
    activeHoldId: IDS.activeHold,
  };
}

export async function disconnectAcceptanceDatabase(): Promise<void> {
  assertDisposableAcceptanceDatabase();
  const { prisma } = await import("@/lib/prisma");
  await prisma.$disconnect();
}

export async function runFreshProcessProbe(
  probe: AcceptanceProbe,
  identifiers: Record<string, string>,
): Promise<Record<string, unknown>> {
  assertDisposableAcceptanceDatabase();
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "tsx",
      "scripts/checks/phase-1-6-persistence.ts",
      "--probe",
      probe,
      "--ids",
      JSON.stringify(identifiers),
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  );

  if (result.error || result.status !== 0) {
    throw new Error("Fresh-process persistence probe failed");
  }

  try {
    const parsed: unknown = JSON.parse(result.stdout.trim());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("Fresh-process persistence probe returned invalid output");
  }
}

function seedProduct(id: string, mode: "unique" | "stocked" | "variant", suffix: string) {
  return {
    id,
    slug: `${ACCEPTANCE_PREFIX}${suffix}`,
    name: `${ACCEPTANCE_PREFIX}${suffix}`,
    inventory_mode: mode,
    price: "1000.00",
    lifecycle: "active" as const,
    publication: "published" as const,
  };
}

function staffSession(authUserId: string, role: "admin" | "manager"): StaffSession {
  return {
    kind: "staff",
    authUserId,
    email: null,
    displayName: `${ACCEPTANCE_PREFIX}${role}`,
    role,
  };
}
