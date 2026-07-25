import "server-only";

import type { Prisma } from "@/lib/prisma";
import {
  cleanProductText,
  slugifyProductName,
} from "@/modules/products/server/rules";
import type {
  ProductEditorValues,
  ProductTaxonomyKind,
} from "@/modules/products/types";

const mediaKindToDb = {
  cover: "product_cover",
  detail: "product_detail",
  defect: "product_defect",
} as const;

const channelToDb = {
  storefront: "storefront",
  "physical-store": "physical_store",
  whatsapp: "whatsapp",
  instagram: "instagram",
} as const;

export async function resolveProductTaxonomyId(
  tx: Prisma.TransactionClient,
  kind: ProductTaxonomyKind,
  value: string,
): Promise<string | null> {
  const name = cleanProductText(value);
  if (!name || name === "Uncategorised") return null;
  const slug = slugifyProductName(name);
  if (kind === "category") {
    return (
      await tx.catalogue_categories.upsert({
        where: { slug },
        update: { name },
        create: { slug, name },
      })
    ).id;
  }
  return (
    await tx.catalogue_collections.upsert({
      where: { slug },
      update: { name },
      create: { slug, name },
    })
  ).id;
}

function assetProviderFor(url: string): string {
  try {
    return new URL(url).hostname === "res.cloudinary.com" ? "cloudinary" : "external";
  } catch {
    return "external";
  }
}

export async function writeProductMedia(
  tx: Prisma.TransactionClient,
  productId: string,
  media: ProductEditorValues["media"],
): Promise<void> {
  await tx.product_media.deleteMany({ where: { product_id: productId } });
  for (const [position, item] of media.entries()) {
    const kind = mediaKindToDb[item.kind];
    const provider = assetProviderFor(item.url);
    const asset = await tx.cloudinary_assets.upsert({
      where: { public_id: `admin/products/${productId}/${position}` },
      update: { provider, kind, secure_url: item.url, alt: cleanProductText(item.alt) },
      create: {
        provider,
        kind,
        public_id: `admin/products/${productId}/${position}`,
        secure_url: item.url,
        alt: cleanProductText(item.alt),
      },
    });
    await tx.product_media.create({
      data: { product_id: productId, asset_id: asset.id, kind, position },
    });
  }
}

export async function writeProductChannels(
  tx: Prisma.TransactionClient,
  productId: string,
  channels: ProductEditorValues["channels"],
): Promise<void> {
  await tx.product_channels.deleteMany({ where: { product_id: productId } });
  if (!channels.length) return;
  await tx.product_channels.createMany({
    data: channels.map((channel) => ({
      product_id: productId,
      channel: channelToDb[channel],
    })),
  });
}

export async function writeProductMeasurements(
  tx: Prisma.TransactionClient,
  productId: string,
  values: ProductEditorValues,
): Promise<void> {
  await tx.product_measurements.deleteMany({ where: { product_id: productId } });
  if (values.inventoryMode !== "unique" || !values.unique.measurements.length) return;
  await tx.product_measurements.createMany({
    data: values.unique.measurements.map((measurement, position) => ({
      product_id: productId,
      label: cleanProductText(measurement.label),
      value: cleanProductText(measurement.value),
      position,
    })),
  });
}

export function productAssetProviderFor(url: string): string {
  return assetProviderFor(url);
}
