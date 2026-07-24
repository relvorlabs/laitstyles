import "server-only";

import {
  catalog_media_kind,
  catalog_product_status,
  catalog_publication_state,
  catalog_stock_movement_kind,
  catalog_stock_reservation_state,
  inventory_mode,
  type Prisma,
} from "@prisma/client";
import type { StorefrontProductSeed } from "@/lib/catalog/types";
import { prisma } from "@/lib/prisma";
import { STOREFRONT_CHANNEL } from "@/modules/products/server/storefront/visibility";
import { normalizeVariantMeasurements } from "@/modules/products/server/storefront/variant-measurements";

export async function createPublishedProduct(input: StorefrontProductSeed) {
  const created = await prisma.$transaction(async (tx) => {
    const category = await tx.catalogue_categories.upsert({
      where: { slug: input.category.slug },
      create: {
        name: input.category.name,
        slug: input.category.slug,
      },
      update: {
        name: input.category.name,
      },
    });

    const collection = input.collection
      ? await tx.catalogue_collections.upsert({
          where: { slug: input.collection.slug },
          create: {
            name: input.collection.name,
            slug: input.collection.slug,
          },
          update: {
            name: input.collection.name,
          },
        })
      : null;

    const product = await tx.products.create({
      data: {
        category_id: category.id,
        collection_id: collection?.id ?? null,
        name: input.name,
        slug: input.slug,
        description: input.description,
        material: input.material ?? null,
        style: input.style ?? null,
        fit: input.fit ?? null,
        brand: input.brand ?? null,
        care_instructions: input.careInstructions ?? null,
        flaw_notes: input.flawNotes ?? null,
        packaging_notes: input.packagingNotes ?? null,
        delivery_restrictions: input.deliveryRestrictions ?? null,
        inventory_mode: inventory_mode.variant,
        price: input.price,
        reference_price: input.referencePrice ?? null,
        lifecycle: catalog_product_status.active,
        publication: catalog_publication_state.published,
        published_at: new Date(),
      },
    });

    await tx.product_channels.createMany({
      data: [
        { product_id: product.id, channel: STOREFRONT_CHANNEL },
        { product_id: product.id, channel: "physical_store" },
      ],
    });

    for (const [position, media] of input.media.entries()) {
      const asset = await upsertImageAsset(tx, {
        publicId: `${input.slug}/product/${position + 1}`,
        url: media.url,
        alt: media.alt,
      });
      await tx.product_media.create({
        data: {
          product_id: product.id,
          asset_id: asset.id,
          kind: media.kind,
          position,
        },
      });
    }

    for (const [position, measurement] of input.measurements.entries()) {
      await tx.product_measurements.create({
        data: {
          product_id: product.id,
          label: measurement.label,
          value: measurement.value,
          position,
        },
      });
    }

    for (const [position, variantInput] of input.variants.entries()) {
      const measurements = normalizeVariantMeasurements(variantInput.measurements);
      const variant = await tx.product_variants.create({
        data: {
          product_id: product.id,
          label: variantInput.label,
          sku: variantInput.sku,
          size: variantInput.size ?? null,
          colour: variantInput.colour ?? null,
          price: variantInput.price ?? input.price,
          status: catalog_product_status.active,
          position,
          bust: measurements?.bust ?? null,
          waist: measurements?.waist ?? null,
          hips: measurements?.hips ?? null,
          length: measurements?.length ?? null,
        },
      });

      if (variantInput.image) {
        const asset = await upsertImageAsset(tx, {
          publicId: `${input.slug}/variant/${variantInput.sku}`,
          url: variantInput.image,
          alt: `${input.name} ${variantInput.label}`,
        });
        await tx.product_media.create({
          data: {
            product_id: product.id,
            variant_id: variant.id,
            asset_id: asset.id,
            kind: catalog_media_kind.product_detail,
            position: 0,
          },
        });
      }

      await tx.stock_levels.create({
        data: {
          product_id: product.id,
          variant_id: variant.id,
          total_received: variantInput.stock,
          available: variantInput.stock,
        },
      });

      await tx.stock_movements.create({
        data: {
          product_id: product.id,
          variant_id: variant.id,
          kind: catalog_stock_movement_kind.received,
          quantity: variantInput.stock,
          note: "Initial catalogue stock",
        },
      });
    }

    return product;
  });

  return created;
}

export async function createPublishedReview(input: {
  profileId: string;
  productId: string;
  rating: number;
  title: string;
  body: string;
  media?: Array<{ url: string; alt: string }>;
}) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.reviews.create({
      data: {
        profile_id: input.profileId,
        product_id: input.productId,
        rating: input.rating,
        title: input.title,
        body: input.body,
        verified_purchase: true,
        status: catalog_product_status.active,
        published_at: new Date(),
      },
    });

    for (const [position, media] of (input.media ?? []).entries()) {
      const asset = await upsertImageAsset(tx, {
        publicId: `reviews/${review.id}/${position + 1}`,
        url: media.url,
        alt: media.alt,
      });
      await tx.review_media.create({
        data: {
          review_id: review.id,
          asset_id: asset.id,
          position,
        },
      });
    }

    return review;
  });
}

export async function createProductReservation(input: {
  profileId?: string;
  productId: string;
  variantId?: string;
  quantity?: number;
}) {
  const quantity = input.quantity ?? 1;

  return prisma.$transaction(async (tx) => {
    const stock = await tx.stock_levels.findFirst({
      where: {
        product_id: input.productId,
        variant_id: input.variantId ?? null,
      },
      select: {
        id: true,
        available: true,
        reserved: true,
      },
    });
    if (!stock || stock.available < quantity) {
      throw new Error("Not enough stock is available for this reservation.");
    }

    const reservation = await tx.stock_reservations.create({
      data: {
        profile_id: input.profileId ?? null,
        product_id: input.productId,
        variant_id: input.variantId ?? null,
        quantity,
        state: catalog_stock_reservation_state.active,
        expires_at: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await tx.stock_levels.update({
      where: { id: stock.id },
      data: {
        available: stock.available - quantity,
        reserved: stock.reserved + quantity,
      },
    });

    await tx.stock_movements.create({
      data: {
        product_id: input.productId,
        variant_id: input.variantId ?? null,
        kind: catalog_stock_movement_kind.reserved,
        quantity,
        note: `Reservation ${reservation.id}`,
      },
    });

    return reservation;
  });
}

export async function releaseProductReservation(reservationId: string) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.stock_reservations.findUnique({
      where: { id: reservationId },
    });
    if (!reservation || reservation.state !== catalog_stock_reservation_state.active) return null;

    const stock = await tx.stock_levels.findFirst({
      where: {
        product_id: reservation.product_id,
        variant_id: reservation.variant_id,
      },
      select: {
        id: true,
        available: true,
        reserved: true,
      },
    });
    if (!stock) return null;

    await tx.stock_reservations.update({
      where: { id: reservation.id },
      data: { state: catalog_stock_reservation_state.released },
    });

    await tx.stock_levels.update({
      where: { id: stock.id },
      data: {
        available: stock.available + reservation.quantity,
        reserved: Math.max(0, stock.reserved - reservation.quantity),
      },
    });

    await tx.stock_movements.create({
      data: {
        product_id: reservation.product_id,
        variant_id: reservation.variant_id,
        kind: catalog_stock_movement_kind.reservation_released,
        quantity: reservation.quantity,
        note: `Reservation ${reservation.id} released`,
      },
    });

    return reservation;
  });
}

async function upsertImageAsset(
  tx: Prisma.TransactionClient,
  input: { publicId: string; url: string; alt: string },
) {
  return tx.cloudinary_assets.upsert({
    where: { public_id: input.publicId },
    create: {
      public_id: input.publicId,
      kind: catalog_media_kind.product_detail,
      provider: "external",
      secure_url: input.url,
      alt: input.alt,
    },
    update: {
      secure_url: input.url,
      alt: input.alt,
    },
  });
}
