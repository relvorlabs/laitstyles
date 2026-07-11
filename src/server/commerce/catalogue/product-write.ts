import "server-only";

import { err, forbidden, ok, type Result, type StorefrontError } from "@/lib/errors";
import { Prisma, prisma } from "@/lib/prisma";

// Minimal admin -> DB write path (docs/storefront-v2/06 Phase 1, D2). The admin
// UI/route calls this to create + publish a product the storefront then reads —
// closing the "one product truth" loop. Enforces the inventory:create capability
// in-transaction and writes an audit event (ADR-05 §4.1 #6, #9). This service is
// the authorization boundary; callers pass a server-resolved actor, never a
// client-supplied storeId/profileId.

export interface ProductWriteActor {
  storeId: string;
  profileId: string;
}

export interface CreatePublishedProductInput {
  slug: string;
  name: string;
  description: string;
  brand?: string | null;
  mode: "unique" | "stocked" | "variant";
  priceKobo: number;
  referencePriceKobo?: number | null;
  condition?: string | null;
  sizeLabel?: string | null;
  colour?: string | null;
  archiveNumber?: string | null;
  categoryId?: string | null;
  cover: {
    publicId: string;
    secureUrl: string;
    alt: string;
    width?: number | null;
    height?: number | null;
  };
  /** unique/stocked only (unique defaults to 1). */
  stock?: number;
  variants?: {
    label: string;
    size?: string | null;
    colour?: string | null;
    priceKobo?: number | null;
    stock: number;
  }[];
}

const koboToDecimalString = (kobo: number): string => (kobo / 100).toFixed(2);

async function hasCapability(
  storeId: string,
  profileId: string,
  capability: string,
): Promise<boolean> {
  const membership = await prisma.store_memberships.findFirst({
    where: { store_id: storeId, profile_id: profileId, status: "active" },
    select: { role: true },
  });
  if (!membership) return false;
  const grant = await prisma.role_capabilities.findFirst({
    where: { role: membership.role, capability },
    select: { role: true },
  });
  return grant !== null;
}

export async function createPublishedProduct(
  actor: ProductWriteActor,
  input: CreatePublishedProductInput,
): Promise<Result<{ id: string; slug: string }, StorefrontError>> {
  // Fail-closed authorization — re-checked inside the transaction below too.
  if (!(await hasCapability(actor.storeId, actor.profileId, "inventory:create"))) {
    return err(forbidden("You don't have permission to create products."));
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.products.create({
        data: {
          store_id: actor.storeId,
          slug: input.slug,
          name: input.name,
          description: input.description,
          brand: input.brand ?? null,
          inventory_mode: input.mode,
          price: koboToDecimalString(input.priceKobo),
          reference_price:
            input.referencePriceKobo != null ? koboToDecimalString(input.referencePriceKobo) : null,
          lifecycle: "active",
          publication: "published",
          condition: input.condition ?? null,
          size_label: input.sizeLabel ?? null,
          colour: input.colour ?? null,
          archive_number: input.archiveNumber ?? null,
          category_id: input.categoryId ?? null,
        },
      });

      const asset = await tx.cloudinary_assets.upsert({
        where: { store_id_public_id: { store_id: actor.storeId, public_id: input.cover.publicId } },
        update: {},
        create: {
          store_id: actor.storeId,
          kind: "product_cover",
          public_id: input.cover.publicId,
          secure_url: input.cover.secureUrl,
          alt: input.cover.alt,
          width: input.cover.width ?? null,
          height: input.cover.height ?? null,
        },
      });

      await tx.product_media.create({
        data: {
          store_id: actor.storeId,
          product_id: product.id,
          asset_id: asset.id,
          kind: "product_cover",
          position: 0,
        },
      });
      await tx.product_channels.create({
        data: { product_id: product.id, channel: "storefront" },
      });

      if (input.mode === "variant" && input.variants?.length) {
        for (const [index, variant] of input.variants.entries()) {
          const createdVariant = await tx.product_variants.create({
            data: {
              product_id: product.id,
              label: variant.label,
              size: variant.size ?? null,
              colour: variant.colour ?? null,
              price: variant.priceKobo != null ? koboToDecimalString(variant.priceKobo) : null,
              position: index,
            },
          });
          await tx.stock_levels.create({
            data: {
              store_id: actor.storeId,
              product_id: product.id,
              variant_id: createdVariant.id,
              total_received: variant.stock,
              available: variant.stock,
            },
          });
        }
      } else {
        const stock = input.stock ?? (input.mode === "unique" ? 1 : 0);
        await tx.stock_levels.create({
          data: {
            store_id: actor.storeId,
            product_id: product.id,
            total_received: stock,
            available: stock,
          },
        });
      }

      // Sensitive mutation — audited (ADR-05 §4.1 #9).
      await tx.audit_events.create({
        data: {
          store_id: actor.storeId,
          actor_profile_id: actor.profileId,
          action: "inventory:create",
          target_table: "products",
          target_id: product.id,
        },
      });

      return product;
    });

    return ok({ id: created.id, slug: created.slug });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return err({
        kind: "validation",
        message: "A product with this slug already exists.",
        fields: { slug: "Already in use" },
      });
    }
    throw error;
  }
}
