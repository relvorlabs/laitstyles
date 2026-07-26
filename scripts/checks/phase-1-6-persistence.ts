#!/usr/bin/env node
import {
  type AcceptanceProbe,
  assertDisposableAcceptanceDatabase,
  resetAcceptanceData,
  runFreshProcessProbe,
  seedAcceptanceData,
} from "../../src/test/persistence-harness";

const probes = new Set<AcceptanceProbe>([
  "products",
  "inventory",
  "orders",
  "holds",
  "returns",
  "customers",
  "settings",
  "overview",
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

void main();

async function main(): Promise<void> {
  let databaseGuardPassed = false;
  let databaseUsed = false;

  try {
    assertDisposableAcceptanceDatabase();
    databaseGuardPassed = true;

    if (process.argv.includes("--preflight")) {
      process.stdout.write(`${JSON.stringify({ status: "ready" })}\n`);
      return;
    }

    const probeValue = argument("--probe");
    if (!probeValue) {
      databaseUsed = true;
      try {
        const seed = await seedAcceptanceData();
        const freshProcessRead = await runFreshProcessProbe("products", {
          productId: seed.uniqueProductId,
        });
        process.stdout.write(
          `${JSON.stringify({
            status: "passed",
            probe: "products",
            productId: seed.uniqueProductId,
            freshProcessRead,
          })}\n`,
        );
      } finally {
        await resetAcceptanceData();
      }
      return;
    }
    if (!probes.has(probeValue as AcceptanceProbe)) {
      throw new Error("Invalid persistence probe");
    }

    const identifiers = parseIdentifiers(argument("--ids"));
    databaseUsed = true;
    const output = await executeProbe(probeValue as AcceptanceProbe, identifiers);
    process.stdout.write(`${JSON.stringify(output)}\n`);
  } catch (error) {
    process.stderr.write(`${safeError(error)}\n`);
    process.exitCode = 1;
  } finally {
    if (databaseGuardPassed && databaseUsed) {
      const { prisma } = await import("../../src/lib/prisma");
      await prisma.$disconnect();
    }
  }
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseIdentifiers(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid persistence probe identifiers");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid persistence probe identifiers");
  }
  const entries = Object.entries(parsed);
  if (entries.some(([, value]) => typeof value !== "string")) {
    throw new Error("Invalid persistence probe identifiers");
  }
  return Object.fromEntries(entries) as Record<string, string>;
}

async function executeProbe(
  probe: AcceptanceProbe,
  identifiers: Record<string, string>,
): Promise<Record<string, unknown>> {
  switch (probe) {
    case "products": {
      const productId = requiredUuid(identifiers, "productId");
      const { getAdminProduct } = await import("../../src/modules/products/server/queries");
      const product = await getAdminProduct(productId);
      if (!product) throw new Error("Persistence probe record was not found");
      return {
        productId: product.id,
        inventoryMode: product.inventoryMode,
        lifecycle: product.lifecycle,
        publication: product.publication,
      };
    }
    case "inventory": {
      const productId = requiredUuid(identifiers, "productId");
      const { listStockMovements } = await import("../../src/modules/inventory/server/queries");
      const movements = await listStockMovements({ productId, page: 1, pageSize: 100 });
      return {
        productId,
        movementIds: movements.data.map((movement) => movement.id),
        movementCount: movements.meta.total,
      };
    }
    case "orders": {
      const orderId = requiredUuid(identifiers, "orderId");
      const { getAdminOrder } = await import("../../src/modules/orders/server/queries");
      const order = await getAdminOrder(orderId);
      if (!order) throw new Error("Persistence probe record was not found");
      return {
        orderId: order.id,
        paymentStatus: order.paymentStatus,
        fulfilmentStatus: order.fulfilmentStatus,
      };
    }
    case "holds": {
      const holdId = requiredUuid(identifiers, "holdId");
      const { getAdminHold } = await import("../../src/modules/holds/server/queries");
      const hold = await getAdminHold(holdId);
      if (!hold) throw new Error("Persistence probe record was not found");
      return { holdId: hold.id, status: hold.status, stage: hold.stage };
    }
    case "returns": {
      const returnId = requiredUuid(identifiers, "returnId");
      const { getAdminReturn } = await import("../../src/modules/returns/server/queries");
      const returnRecord = await getAdminReturn(returnId);
      if (!returnRecord) throw new Error("Persistence probe record was not found");
      return { returnId: returnRecord.id, status: returnRecord.status };
    }
    case "customers": {
      const customerId = requiredUuid(identifiers, "customerId");
      const { getAdminCustomer } = await import("../../src/modules/customers/server/queries");
      const customer = await getAdminCustomer(customerId);
      if (!customer) throw new Error("Persistence probe record was not found");
      return { customerId: customer.customer.id };
    }
    case "settings": {
      const { getStoreSettings } = await import("../../src/modules/settings/server/queries");
      const settings = await getStoreSettings();
      return {
        updatedAt: settings.updatedAt,
        deliveryZoneCount: settings.delivery.zones.length,
        pickupLocationCount: settings.delivery.pickupLocations.length,
      };
    }
    case "overview": {
      const { getOverviewData } = await import("../../src/modules/overview/server/queries");
      const overview = await getOverviewData();
      return {
        reportingDate: overview.reportingDate,
        ordersToday: overview.snapshot.ordersToday,
        activeHolds: overview.snapshot.activeHolds,
      };
    }
  }
}

function requiredUuid(identifiers: Record<string, string>, key: string): string {
  const value = identifiers[key];
  if (!value || !uuidPattern.test(value)) {
    throw new Error("Invalid persistence probe identifiers");
  }
  return value;
}

function safeError(error: unknown): string {
  if (!(error instanceof Error)) return "Persistence acceptance failed";
  const allowed = [
    "Refusing non-disposable database",
    "Invalid persistence probe",
    "Invalid persistence probe identifiers",
    "Persistence probe record was not found",
    "Persistence acceptance is blocked",
  ];
  return allowed.some((message) => error.message.startsWith(message))
    ? error.message
    : "Persistence acceptance failed";
}
