import "server-only";

import type { InventoryProduct } from "@/lib/admin/inventory/inventory-types";
import {
  productEditorDraftSchema,
  validateProductForPublish,
  validateProductForSchedule,
} from "@/lib/admin/product-editor/product-editor-schema";
import { validateCommittedStockEdit } from "@/lib/admin/product-editor/product-editor-stock-guard";
import type {
  ProductEditorActionError,
  ProductEditorActionSuccess,
  ProductEditorIntent,
  ProductEditorIssue,
  ProductEditorValues,
} from "@/lib/admin/product-editor/product-editor-types";
import { err, ok, type Result } from "@/lib/errors";
import { Prisma, prisma } from "@/lib/prisma";
import type { StaffSession } from "@/server/auth/session";
import { inventoryProductInclude } from "@/server/commerce/inventory/inventory-mappers";
import { getInventoryProduct } from "@/server/commerce/inventory/inventory-read";
import {
  canStaff,
  clean,
  InventoryRuleViolation,
  isUuid,
  slugify,
} from "@/server/commerce/inventory/inventory-rules";
import {
  assertInventoryModeCanChange,
  resolveTaxonomyId,
  writeChannels,
  writeMeasurements,
  writeProductMedia,
  writeStockAndVariants,
} from "@/server/commerce/inventory/inventory-write-helpers";

export type ProductSaveOutcome = ProductEditorActionSuccess & {
  previousSlug: string | null;
};

function mapZodIssues(
  issues: readonly { path: PropertyKey[]; message: string }[],
): ProductEditorIssue[] {
  return issues.map((issue) => {
    const path = issue.path.join(".");
    const root = String(issue.path[0] ?? "");
    const step =
      root === "inventoryMode"
        ? "type"
        : ["name", "category", "brand", "description", "internalReference"].includes(root)
          ? "identity"
          : root === "media"
            ? "images"
            : ["unique", "stocked", "variant"].includes(root)
              ? "stock"
              : ["sellingPrice", "referencePrice", "cost", "lowStockThreshold"].includes(root)
                ? "pricing"
                : root === "fulfilment"
                  ? "fulfilment"
                  : "review";
    return { path, message: issue.message, step };
  });
}

function isDurableMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateSaveInput(
  values: ProductEditorValues,
  intent: ProductEditorIntent,
  existing: InventoryProduct | null,
): ProductEditorIssue[] {
  const parsed = productEditorDraftSchema.safeParse(values);
  const issues = parsed.success ? [] : mapZodIssues(parsed.error.issues);
  if (intent === "publish") issues.push(...validateProductForPublish(values));
  if (intent === "schedule") issues.push(...validateProductForSchedule(values));

  for (const [index, media] of values.media.entries()) {
    if (
      media.source === "local-preview" ||
      media.url.startsWith("blob:") ||
      !isDurableMediaUrl(media.url)
    ) {
      issues.push({
        path: `media.${index}.url`,
        message: "Choose a durable HTTP or HTTPS image URL before saving.",
        step: "images",
      });
    }
  }

  if (values.productId && !isUuid(values.productId)) {
    issues.push({
      path: "productId",
      message: "The product reference is invalid.",
      step: "review",
    });
  }

  if (values.inventoryMode === "variant") {
    const existingIds = new Set<string>();
    for (const [index, variant] of values.variant.variants.entries()) {
      if (variant.imageUrl.trim() && !isDurableMediaUrl(variant.imageUrl.trim())) {
        issues.push({
          path: `variant.variants.${index}.imageUrl`,
          message: "Choose a durable HTTP or HTTPS variant image URL before saving.",
          step: "images",
        });
      }
      if (!variant.id || !isUuid(variant.id)) continue;
      if (existingIds.has(variant.id)) {
        issues.push({
          path: `variant.variants.${index}.id`,
          message: "The same existing variant cannot appear more than once.",
          step: "stock",
        });
      }
      existingIds.add(variant.id);
    }
  }

  issues.push(...validateCommittedStockEdit(existing ?? undefined, values));
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.path}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function publicationFor(intent: ProductEditorIntent) {
  if (intent === "publish") return "published" as const;
  if (intent === "schedule") return "scheduled" as const;
  return "unpublished" as const;
}

export async function saveInventoryProduct(
  actor: StaffSession,
  values: ProductEditorValues,
  intent: ProductEditorIntent,
): Promise<Result<ProductSaveOutcome, ProductEditorActionError>> {
  const capability = values.productId ? "inventory:update" : "inventory:create";
  if (!canStaff(actor, capability)) {
    return err({
      code: "validation-failed",
      message: "You don't have permission to save products.",
    });
  }

  const existing = values.productId ? await getInventoryProduct(values.productId) : null;
  if (values.productId && !existing) {
    return err({ code: "product-not-found", message: "This product could not be found." });
  }

  const issues = validateSaveInput(values, intent, existing);
  if (issues.length) {
    return err({
      code: "validation-failed",
      message: "Review the highlighted product fields and try again.",
      issues,
    });
  }

  const previousSlug = existing?.slug ?? null;
  const slug = slugify(values.name || `draft-${values.inventoryMode}`);
  const publication = publicationFor(intent);
  const lifecycle =
    intent === "draft"
      ? existing?.lifecycle === "intake"
        ? ("intake" as const)
        : ("draft" as const)
      : ("active" as const);

  try {
    const productId = await prisma.$transaction(
      async (tx) => {
        const currentRow = values.productId
          ? await tx.products.findUnique({
              where: { id: values.productId },
              include: inventoryProductInclude,
            })
          : null;
        if (values.productId && !currentRow) {
          throw new InventoryRuleViolation({
            code: "product-not-found",
            message: "This product could not be found.",
          });
        }

        await assertInventoryModeCanChange(
          tx,
          values.productId ?? "",
          currentRow,
          values.inventoryMode,
        );

        const categoryId = await resolveTaxonomyId(tx, "category", values.category);
        const collectionId = await resolveTaxonomyId(tx, "collection", values.collection);
        const productData = {
          category_id: categoryId,
          collection_id: collectionId,
          slug,
          name: clean(values.name) || `Untitled ${values.inventoryMode} product`,
          description: clean(values.description) || "Draft product awaiting complete details.",
          inventory_mode: values.inventoryMode,
          brand: clean(values.brand) || "Unlabelled",
          price: (values.sellingPrice ?? 0).toFixed(2),
          reference_price: values.referencePrice?.toFixed(2) ?? null,
          cost: values.cost?.toFixed(2) ?? null,
          lifecycle,
          publication,
          low_stock_threshold: values.inventoryMode === "unique" ? 1 : values.lowStockThreshold,
          archive_number:
            values.inventoryMode === "unique" ? clean(values.internalReference) || null : null,
          sku: values.inventoryMode === "stocked" ? clean(values.internalReference) || null : null,
          condition:
            values.inventoryMode === "unique" ? clean(values.unique.condition) || null : null,
          size_label:
            values.inventoryMode === "unique"
              ? clean(values.unique.size) || null
              : values.inventoryMode === "stocked"
                ? clean(values.stocked.sizeLabel) || null
                : null,
          colour:
            values.inventoryMode === "unique"
              ? clean(values.unique.colour) || null
              : values.inventoryMode === "stocked"
                ? clean(values.stocked.colour) || null
                : null,
          material: clean(values.material) || null,
          fit: clean(values.fit) || null,
          style: clean(values.style) || null,
          care_instructions: clean(values.careInstructions) || null,
          flaw_notes: clean(values.flawNotes) || null,
          weight_grams:
            values.fulfilment.weightKg === null
              ? null
              : Math.round(values.fulfilment.weightKg * 1000),
          pickup_available: values.fulfilment.pickupAvailable,
          delivery_restrictions: clean(values.fulfilment.deliveryRestrictions),
          packaging_notes: clean(values.fulfilment.packagingNotes),
          scheduled_at: intent === "schedule" ? new Date(values.scheduledAt) : null,
          published_at: intent === "publish" ? new Date() : null,
        };

        const product = currentRow
          ? await tx.products.update({ where: { id: currentRow.id }, data: productData })
          : await tx.products.create({ data: productData });

        await writeProductMedia(tx, product.id, values.media);
        await writeChannels(tx, product.id, values.channels);
        await writeMeasurements(tx, product.id, values);
        await writeStockAndVariants(tx, actor, product.id, values, currentRow);
        await tx.audit_events.create({
          data: {
            actor_profile_id: actor.authUserId,
            action: currentRow ? "inventory:update" : "inventory:create",
            target_table: "products",
            target_id: product.id,
            metadata: { intent, previous_slug: previousSlug, next_slug: slug },
          },
        });
        return product.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const saved = await getInventoryProduct(productId);
    if (!saved) throw new Error("The saved product could not be reloaded.");
    const message =
      intent === "draft"
        ? `${saved.name} saved as a draft.`
        : intent === "schedule"
          ? `${saved.name} scheduled for publication.`
          : `${saved.name} published.`;
    return ok({ product: saved, intent, message, previousSlug });
  } catch (error) {
    if (error instanceof InventoryRuleViolation) return err(error.actionError);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return err({
          code: "duplicate-reference",
          message: "The product slug, archive number or SKU is already used.",
        });
      }
      if (error.code === "P2003") {
        return err({
          code: "validation-failed",
          message:
            "A referenced variant or product record has operational history and cannot be removed.",
        });
      }
    }
    throw error;
  }
}
