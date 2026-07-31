import "server-only";

import type { Prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import type { ConsumerSession } from "@/modules/auth/server/session";
import type {
  OwnedCartIntent,
  OwnedCartLine,
  OwnedCartSnapshot,
  OwnedCartWriteInput,
} from "@/modules/cart/types";

type CartRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  updated_at: Date;
};

type CanonicalCartLine = {
  productId: string;
  variantId: string | null;
  quantity: number;
};

export async function listOwnedCart(identity: ConsumerSession): Promise<OwnedCartSnapshot> {
  return readOwnedCart(prisma, identity.customerId);
}

export async function replaceOwnedCart(
  identity: ConsumerSession,
  input: OwnedCartWriteInput,
): Promise<OwnedCartSnapshot> {
  return writeOwnedCart(identity, input.lines, "replace");
}

export async function mergeOwnedCart(
  identity: ConsumerSession,
  input: OwnedCartWriteInput,
): Promise<OwnedCartSnapshot> {
  return writeOwnedCart(identity, input.lines, "merge");
}

export async function clearOwnedCart(identity: ConsumerSession): Promise<OwnedCartSnapshot> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`
        DELETE FROM public.customer_cart_lines
        WHERE customer_id = ${identity.customerId}::uuid
      `;
      return emptySnapshot();
    },
    { isolationLevel: "Serializable" },
  );
}

async function writeOwnedCart(
  identity: ConsumerSession,
  incoming: readonly OwnedCartIntent[],
  mode: "replace" | "merge",
): Promise<OwnedCartSnapshot> {
  return prisma.$transaction(
    async (tx) => {
      const current = mode === "merge" ? await readOwnedCart(tx, identity.customerId) : emptySnapshot();
      const desired =
        mode === "merge"
          ? mergeCartIntents(
              current.lines.map((line) => ({
                productId: line.productId,
                variantId: line.variantId,
                quantity: line.quantity,
              })),
              incoming,
            )
          : mergeCartIntents([], incoming);
      const canonical = await canonicalizeCartLines(tx, desired);

      await tx.$executeRaw`
        DELETE FROM public.customer_cart_lines
        WHERE customer_id = ${identity.customerId}::uuid
      `;

      for (const line of canonical) {
        await tx.$executeRaw`
          INSERT INTO public.customer_cart_lines (
            id,
            customer_id,
            product_id,
            variant_id,
            quantity,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            ${identity.customerId}::uuid,
            ${line.productId}::uuid,
            ${line.variantId}::uuid,
            ${line.quantity},
            now(),
            now()
          )
        `;
      }

      return readOwnedCart(tx, identity.customerId);
    },
    { isolationLevel: "Serializable" },
  );
}

async function readOwnedCart(
  client: Pick<Prisma.TransactionClient, "$queryRaw">,
  customerId: string,
): Promise<OwnedCartSnapshot> {
  const rows = await client.$queryRaw<CartRow[]>`
    SELECT id, product_id, variant_id, quantity, updated_at
    FROM public.customer_cart_lines
    WHERE customer_id = ${customerId}::uuid
    ORDER BY created_at ASC, id ASC
  `;
  const lines = rows.map(mapCartRow);
  return {
    lines,
    revision: lines.reduce<string | null>(
      (latest, line) => (!latest || line.updatedAt > latest ? line.updatedAt : latest),
      null,
    ),
  };
}

async function canonicalizeCartLines(
  tx: Prisma.TransactionClient,
  requested: readonly OwnedCartIntent[],
): Promise<CanonicalCartLine[]> {
  if (requested.length === 0) return [];

  const products = await tx.products.findMany({
    where: { id: { in: requested.map((line) => line.productId) } },
    select: {
      id: true,
      inventory_mode: true,
      lifecycle: true,
      publication: true,
      product_variants: { select: { id: true } },
      stock_levels: { select: { variant_id: true, available: true } },
    },
  });
  const productById = new Map(products.map((product) => [product.id, product]));
  const canonical: CanonicalCartLine[] = [];

  for (const line of requested) {
    const product = productById.get(line.productId);
    if (!product || product.lifecycle !== "active" || product.publication !== "published") continue;

    const variantId = line.variantId ?? null;
    if (product.inventory_mode === "variant") {
      if (!variantId || !product.product_variants.some((variant) => variant.id === variantId)) continue;
    } else if (variantId) {
      continue;
    }

    const stock = product.stock_levels.find((entry) => entry.variant_id === variantId);
    const maximum = product.inventory_mode === "unique" ? Math.min(1, stock?.available ?? 0) : (stock?.available ?? 0);
    const quantity = Math.min(maximum, Math.max(1, Math.floor(line.quantity)));
    if (quantity < 1) continue;

    canonical.push({ productId: product.id, variantId, quantity });
  }

  return canonical;
}

export function mergeCartIntents(
  current: readonly OwnedCartIntent[],
  incoming: readonly OwnedCartIntent[],
): OwnedCartIntent[] {
  const bySelection = new Map<string, OwnedCartIntent>();
  for (const candidate of [...current, ...incoming]) {
    const productId = candidate.productId.trim();
    const variantId = candidate.variantId?.trim() || null;
    if (!productId) continue;
    const key = `${productId}:${variantId ?? "default"}`;
    const quantity = Math.max(1, Math.floor(candidate.quantity));
    const existing = bySelection.get(key);
    bySelection.set(key, {
      productId,
      variantId,
      quantity: Math.max(existing?.quantity ?? 0, quantity),
    });
  }
  return [...bySelection.values()];
}

function mapCartRow(row: CartRow): OwnedCartLine {
  return {
    id: row.id,
    productId: row.product_id,
    variantId: row.variant_id,
    quantity: row.quantity,
    updatedAt: row.updated_at.toISOString(),
  };
}

function emptySnapshot(): OwnedCartSnapshot {
  return { lines: [], revision: null };
}
