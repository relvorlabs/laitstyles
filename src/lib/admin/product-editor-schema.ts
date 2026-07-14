import { z } from "zod";
import type {
  ProductEditorIssue,
  ProductEditorStep,
  ProductEditorValues,
} from "@/lib/control-room/product-editor-types";

const measurementSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  value: z.string(),
});

const publishMeasurementSchema = measurementSchema.extend({
  label: z.string().trim().min(1, "Enter the measurement name."),
  value: z.string().trim().min(1, "Enter the measurement value."),
});

const mediaSchema = z.object({
  id: z.string().min(1),
  url: z.string().trim().min(1, "Enter an image URL or choose a file."),
  alt: z.string(),
  kind: z.enum(["cover", "detail", "defect"]),
  position: z.number().int().nonnegative(),
  source: z.enum(["existing", "local-preview", "url"]),
});

const variantSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  sku: z.string(),
  size: z.string(),
  colour: z.string(),
  imageUrl: z.string(),
  price: z.number().nonnegative().nullable(),
  cost: z.number().nonnegative().nullable(),
  quantity: z.number().int().nonnegative(),
});

const baseDraftShape = {
  productId: z.string().nullable(),
  name: z.string(),
  category: z.string(),
  brand: z.string(),
  material: z.string(),
  fit: z.string(),
  style: z.string(),
  careInstructions: z.string(),
  flawNotes: z.string(),
  description: z.string(),
  collection: z.string(),
  internalReference: z.string(),
  media: z.array(mediaSchema),
  sellingPrice: z.number().nonnegative().nullable(),
  referencePrice: z.number().nonnegative().nullable(),
  cost: z.number().nonnegative().nullable(),
  lowStockThreshold: z.number().int().nonnegative(),
  channels: z.array(z.enum(["storefront", "physical-store", "whatsapp", "instagram"])),
  fulfilment: z.object({
    weightKg: z.number().positive().nullable(),
    pickupAvailable: z.boolean(),
    deliveryRestrictions: z.string(),
    packagingNotes: z.string(),
  }),
  scheduledAt: z.string(),
};

export const productEditorDraftSchema = z.discriminatedUnion("inventoryMode", [
  z.object({
    ...baseDraftShape,
    inventoryMode: z.literal("unique"),
    unique: z.object({
      condition: z.enum(["Excellent", "Good", "Fair"]),
      size: z.string(),
      colour: z.string(),
      measurements: z.array(measurementSchema),
    }),
  }),
  z.object({
    ...baseDraftShape,
    inventoryMode: z.literal("stocked"),
    stocked: z.object({
      sizeLabel: z.string(),
      colour: z.string(),
      quantity: z.number().int().nonnegative(),
    }),
  }),
  z.object({
    ...baseDraftShape,
    inventoryMode: z.literal("variant"),
    variant: z.object({
      optionNames: z.array(z.string()),
      variants: z.array(variantSchema),
    }),
  }),
]);

const identitySchema = z.object({
  name: z.string().trim().min(2, "Enter a product name."),
  category: z.string().trim().min(1, "Choose a category."),
  brand: z.string().trim().min(1, "Enter a brand or use Unlabelled."),
  description: z.string().trim().min(20, "Add a description with at least 20 characters."),
  internalReference: z
    .string()
    .trim()
    .min(3, "Enter or generate an internal reference with at least 3 characters."),
});

const imagesSchema = z
  .object({
    media: z
      .array(mediaSchema)
      .min(1, "Add at least one product image.")
      .max(12, "Keep each product within 12 images."),
  })
  .superRefine(({ media }, context) => {
    const coverCount = media.filter((item) => item.kind === "cover").length;
    if (coverCount !== 1) {
      context.addIssue({
        code: "custom",
        path: ["media"],
        message: "Choose exactly one featured cover image.",
      });
    }

    const urls = new Set<string>();
    for (const [index, item] of media.entries()) {
      const url = item.url.trim();
      if (!isValidMediaUrl(url, item.source)) {
        context.addIssue({
          code: "custom",
          path: ["media", index, "url"],
          message: "Use a valid image URL or choose the local file again.",
        });
      }
      const duplicateKey = url.toLocaleLowerCase("en-NG");
      if (urls.has(duplicateKey)) {
        context.addIssue({
          code: "custom",
          path: ["media", index, "url"],
          message: "This image is already included.",
        });
      }
      urls.add(duplicateKey);

      if (!item.alt.trim()) {
        context.addIssue({
          code: "custom",
          path: ["media", index, "alt"],
          message: "Describe this image for accessibility.",
        });
      }
    }
  });

const uniqueStockSchema = z.object({
  inventoryMode: z.literal("unique"),
  unique: z.object({
    condition: z.enum(["Excellent", "Good", "Fair"]),
    size: z.string().trim().min(1, "Enter the piece size."),
    colour: z.string().trim().min(1, "Enter the piece colour."),
    measurements: z
      .array(publishMeasurementSchema)
      .min(1, "Add at least one measurement before publishing."),
  }),
});

const stockedStockSchema = z.object({
  inventoryMode: z.literal("stocked"),
  stocked: z.object({
    sizeLabel: z.string().trim().min(1, "Enter the product size or fit."),
    colour: z.string().trim().min(1, "Enter the product colour."),
    quantity: z.number().int().min(1, "Received quantity must be at least one."),
  }),
});

const variantStockSchema = z
  .object({
    inventoryMode: z.literal("variant"),
    variant: z.object({
      optionNames: z.array(z.string().trim().min(1)).min(1, "Add at least one option name."),
      variants: z
        .array(
          variantSchema.extend({
            label: z.string().trim().min(1, "Enter a variant label."),
            sku: z.string().trim().min(3, "Enter or generate a variant SKU."),
          }),
        )
        .min(1, "Add at least one variant."),
    }),
  })
  .superRefine(({ variant }, context) => {
    const skus = new Set<string>();
    let received = 0;

    for (const [index, item] of variant.variants.entries()) {
      const sku = item.sku.trim().toUpperCase();
      if (skus.has(sku)) {
        context.addIssue({
          code: "custom",
          path: ["variant", "variants", index, "sku"],
          message: "Each variant SKU must be unique.",
        });
      }
      skus.add(sku);
      received += item.quantity;
    }

    if (received < 1) {
      context.addIssue({
        code: "custom",
        path: ["variant", "variants"],
        message: "At least one variant must have received stock.",
      });
    }
  });

const stockSchema = z.discriminatedUnion("inventoryMode", [
  uniqueStockSchema,
  stockedStockSchema,
  variantStockSchema,
]);

const pricingSchema = z
  .object({
    sellingPrice: z.number().positive("Enter a selling price above zero."),
    referencePrice: z.number().positive().nullable(),
    cost: z.number().nonnegative("Unit cost cannot be negative.").nullable(),
    lowStockThreshold: z.number().int().nonnegative(),
  })
  .superRefine(({ sellingPrice, referencePrice }, context) => {
    if (referencePrice !== null && referencePrice <= sellingPrice) {
      context.addIssue({
        code: "custom",
        path: ["referencePrice"],
        message: "Compare-at price must be higher than the selling price.",
      });
    }
  });

const fulfilmentSchema = z.object({
  fulfilment: z.object({
    weightKg: z.number().positive().nullable(),
    pickupAvailable: z.boolean(),
    deliveryRestrictions: z.string(),
    packagingNotes: z.string(),
  }),
});

const stepSchemas = {
  type: z.object({
    inventoryMode: z.enum(["unique", "stocked", "variant"]),
  }),
  identity: identitySchema,
  images: imagesSchema,
  stock: stockSchema,
  pricing: pricingSchema,
  fulfilment: fulfilmentSchema,
  review: productEditorDraftSchema,
} satisfies Record<ProductEditorStep, z.ZodType>;

export function validateProductEditorStep(
  values: ProductEditorValues,
  step: ProductEditorStep,
): ProductEditorIssue[] {
  const result = stepSchemas[step].safeParse(values);
  if (result.success) return [];

  return result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    step,
  }));
}

export function validateProductForPublish(values: ProductEditorValues): ProductEditorIssue[] {
  const steps: ProductEditorStep[] = ["identity", "images", "stock", "pricing", "fulfilment"];

  return steps.flatMap((step) => validateProductEditorStep(values, step));
}

export function validateProductForSchedule(values: ProductEditorValues): ProductEditorIssue[] {
  const issues = validateProductForPublish(values);
  const scheduledAt = Date.parse(values.scheduledAt);

  if (!values.scheduledAt || Number.isNaN(scheduledAt)) {
    issues.push({
      path: "scheduledAt",
      message: "Choose a valid publication date and time.",
      step: "review",
    });
  }

  return issues;
}

function isValidMediaUrl(value: string, source: ProductEditorValues["media"][number]["source"]) {
  if (source === "local-preview") return value.startsWith("blob:");
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
