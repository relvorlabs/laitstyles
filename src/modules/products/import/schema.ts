import { z } from "zod";

const textSchema = z.string();
const optionalTextSchema = textSchema.optional();
const optionalNumberSchema = z.coerce.number().finite().optional();

const measurementSchema = z
  .object({
    label: textSchema,
    value: textSchema,
  })
  .strict();

const variantSchema = z
  .object({
    label: textSchema,
    sku: optionalTextSchema,
    size: optionalTextSchema,
    colour: optionalTextSchema,
    price: optionalNumberSchema,
    cost: optionalNumberSchema,
    stock: z.coerce.number().int().nonnegative(),
  })
  .strict();

const fulfilmentSchema = z
  .object({
    weightKg: z.coerce.number().positive().nullable().optional(),
    pickupAvailable: z.boolean().optional(),
    deliveryRestrictions: optionalTextSchema,
    packagingNotes: optionalTextSchema,
  })
  .strict();

const baseShape = {
  name: textSchema.min(1),
  description: optionalTextSchema,
  category: optionalTextSchema,
  collection: optionalTextSchema,
  brand: optionalTextSchema,
  material: optionalTextSchema,
  fit: optionalTextSchema,
  style: optionalTextSchema,
  careInstructions: optionalTextSchema,
  flawNotes: optionalTextSchema,
  internalReference: optionalTextSchema,
  sellingPrice: optionalNumberSchema,
  referencePrice: optionalNumberSchema,
  cost: optionalNumberSchema,
  lowStockThreshold: z.coerce.number().int().nonnegative().optional(),
  channels: z.array(textSchema).optional(),
  fulfilment: fulfilmentSchema.optional(),
  scheduledAt: optionalTextSchema,
};

export const productImportRowSchema = z.preprocess(
  stripProductImportAssetFields,
  z.discriminatedUnion("mode", [
    z
      .object({
        ...baseShape,
        mode: z.literal("unique"),
        condition: optionalTextSchema,
        size: optionalTextSchema,
        colour: optionalTextSchema,
        measurements: z.array(measurementSchema).default([]),
      })
      .strict(),
    z
      .object({
        ...baseShape,
        mode: z.literal("stocked"),
        sizeLabel: optionalTextSchema,
        colour: optionalTextSchema,
        stock: z.coerce.number().int().nonnegative(),
      })
      .strict(),
    z
      .object({
        ...baseShape,
        mode: z.literal("variant"),
        optionNames: z.array(textSchema).optional(),
        variants: z.array(variantSchema).default([]),
        measurements: z.array(measurementSchema).default([]),
      })
      .strict(),
  ]),
);

export const productImportJsonFileSchema = z.array(productImportRowSchema).max(1_000);

const nestedJsonFields = [
  "variants",
  "measurements",
  "optionNames",
  "channels",
  "fulfilment",
] as const;

export function isProductImportAssetField(key: string) {
  const normalized = key.toLocaleLowerCase("en-NG");
  return (
    normalized.includes("asset") || normalized.includes("image") || normalized.includes("media")
  );
}

function stripProductImportAssetFields(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([key]) => !isProductImportAssetField(key),
    ),
  );
}

function parseNestedJsonCell(value: unknown) {
  if (typeof value !== "string") return value;
  return JSON.parse(value) as unknown;
}

export const productImportCsvRowSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const row = Object.fromEntries(
    Object.entries(stripProductImportAssetFields(value) as Record<string, unknown>).filter(
      ([, cell]) => cell !== "",
    ),
  ) as Record<string, unknown>;
  for (const key of nestedJsonFields) {
    if (typeof row[key] === "string" && row[key].trim()) {
      row[key] = parseNestedJsonCell(row[key]);
    }
  }
  return row;
}, productImportRowSchema);

export type ProductImportSchemaRow = z.infer<typeof productImportRowSchema>;
