/**
 * API-first import of scripts/seed/catalog-fixture.json.
 *
 * Content-only fixture in, runtime values out: product ids, slugs, SKUs /
 * archive numbers (from a generated internalReference), timestamps and media
 * publicIds are all created at import time. Nothing in the fixture carries an
 * id, SKU or timestamp.
 *
 * Transport is POST /api/v1/admin/products with intent=publish — the same
 * Route Handler → saveProduct → Prisma path as the admin editor — never a
 * direct database seed.
 *
 * Auth: staff Supabase session cookies (requireApiStaff inventory:create).
 *   FIXTURE_API_BASE_URL  default http://localhost:3000
 *   FIXTURE_API_COOKIE    e.g. "sb-...=...; ..." copied from a signed-in
 *                         staff browser session (owner/manager).
 *
 * Usage:
 *   pnpm db:fixture:import:api -- --dry-run --limit 5
 *   pnpm db:fixture:import:api -- --limit 520
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prepareCatalogFixture, type FixtureProduct } from "./catalog-fixture-schema";
import {
  productMutationSchema,
} from "../../src/modules/products/schema";
import { validateProductForPublish } from "../../src/modules/products/editor-schema";

const args = new Set(process.argv.slice(2));
const flagValue = (name: string, fallback: string) => {
  const prefix = `${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return fallback;
};

const DRY_RUN = args.has("--dry-run") || !args.has("--live");
const LIMIT = Number.parseInt(flagValue("--limit", "520"), 10);
const OFFSET = Number.parseInt(flagValue("--offset", "0"), 10);
const DELAY_MS = Number.parseInt(flagValue("--delay-ms", "150"), 10);
const BASE_URL = (process.env.FIXTURE_API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const COOKIE = process.env.FIXTURE_API_COOKIE ?? "";

const fixturePath = join(__dirname, "catalog-fixture.json");
const fixture = prepareCatalogFixture(JSON.parse(readFileSync(fixturePath, "utf8")));

function categoryCode(name: string) {
  return name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
}

function photoIdFromUrl(url: string, fallback: string) {
  const match = url.match(/\/photos\/(\d+)\//);
  return match ? match[1] : fallback;
}

function toApiPayload(product: FixtureProduct, index: number) {
  const ref = `LST-F${String(index + 1).padStart(4, "0")}-${categoryCode(product.category)}`;
  const media = product.images.map((image, position) => ({
    id: `fixture-${index + 1}-media-${position + 1}`,
    publicId: `fixture/pexels-${photoIdFromUrl(image.url, `p${index}`)}-${index + 1}-${position + 1}`,
    url: image.url,
    width: 1200,
    height: 1500,
    format: "jpeg",
    bytes: null as number | null,
    alt: image.alt,
    kind: image.kind,
    position,
    source: "upload" as const,
  }));
  const base = {
    productId: null as string | null,
    name: product.name,
    category: product.category,
    brand: product.brand,
    material: product.material,
    fit: product.fit,
    style: product.style,
    careInstructions: product.care_instructions,
    flawNotes: product.flaw_notes,
    description: product.description,
    collection: product.collection,
    internalReference: ref,
    media,
    sellingPrice: product.selling_price,
    referencePrice: product.reference_price,
    cost: null as number | null,
    lowStockThreshold: product.inventory_mode === "unique" ? 1 : 3,
    channels: product.channels,
    fulfilment: {
      weightKg: 0.9,
      pickupAvailable: true,
      deliveryRestrictions: "",
      packagingNotes: "",
    },
    scheduledAt: "",
  };
  if (product.inventory_mode === "unique") {
    return {
      values: {
        ...base,
        inventoryMode: "unique" as const,
        unique: {
          condition: product.condition,
          size: product.size_label,
          colour: product.colour,
          measurements: product.measurements.map((m, i) => ({
            id: `fixture-${index + 1}-m-${i + 1}`,
            label: m.label,
            value: m.value,
          })),
        },
      },
      intent: "publish" as const,
    };
  }
  if (product.inventory_mode === "stocked") {
    return {
      values: {
        ...base,
        inventoryMode: "stocked" as const,
        stocked: {
          sizeLabel: product.size_label,
          colour: product.colour,
          quantity: product.quantity,
        },
      },
      intent: "publish" as const,
    };
  }
  return {
    values: {
      ...base,
      inventoryMode: "variant" as const,
      variant: {
        optionNames: ["Size"],
        variants: product.variants.map((v, i) => ({
          id: `fixture-${index + 1}-v-${i + 1}`,
          label: v.label,
          sku: `${ref}-V${i + 1}`,
          size: v.size,
          colour: v.colour,
          image: null,
          price: null,
          cost: null,
          quantity: v.quantity,
        })),
      },
    },
    intent: "publish" as const,
  };
}

async function main() {
  const selection = fixture.products.slice(OFFSET, OFFSET + LIMIT);
  console.log(
    `Fixture: ${fixture.products.length} products | selection: offset=${OFFSET} limit=${selection.length} | mode=${DRY_RUN ? "dry-run" : "live"} | base=${BASE_URL}`,
  );

  let ok = 0;
  const failures: Array<{ index: number; name: string; error: string }> = [];

  for (const [i, product] of selection.entries()) {
    const globalIndex = OFFSET + i;
    const payload = toApiPayload(product, globalIndex);
    const parsed = productMutationSchema.safeParse(payload);
    if (!parsed.success) {
      failures.push({
        index: globalIndex,
        name: product.name,
        error: `schema: ${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}`,
      });
      continue;
    }
    const publishIssues = validateProductForPublish(parsed.data.values as never);
    if (publishIssues.length > 0) {
      failures.push({
        index: globalIndex,
        name: product.name,
        error: `publish: ${publishIssues[0]?.path}: ${publishIssues[0]?.message}`,
      });
      continue;
    }

    if (DRY_RUN) {
      ok += 1;
      continue;
    }

    if (!COOKIE) {
      throw new Error("FIXTURE_API_COOKIE is required for --live import (staff session cookie).");
    }
    const response = await fetch(`${BASE_URL}/api/v1/admin/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: COOKIE },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || (body as { ok?: boolean }).ok === false) {
      failures.push({
        index: globalIndex,
        name: product.name,
        error: `HTTP ${response.status}: ${JSON.stringify(body).slice(0, 300)}`,
      });
    } else {
      ok += 1;
      if (ok % 25 === 0) console.log(`  ... ${ok} created`);
    }
    if (DELAY_MS > 0) await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  console.log(`Done: ${ok} ready, ${failures.length} failed.`);
  for (const failure of failures.slice(0, 20)) {
    console.log(`FAIL #${failure.index} ${failure.name}: ${failure.error}`);
  }
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("IMPORT_FAILED:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
