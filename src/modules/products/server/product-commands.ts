import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { Prisma, prisma } from "@/lib/prisma";
import type { StaffSession } from "@/modules/auth/server/session";
import { validateCommittedStockEdit } from "@/modules/inventory/server/committed-stock-guard";
import {
  assertProductInventoryModeCanChange,
  InventoryRuleViolation,
  writeProductStockAndVariants,
} from "@/modules/inventory/server/stock-write";
import {
  productEditorDraftSchema,
  validateProductForPublish,
  validateProductForSchedule,
} from "@/modules/products/editor-schema";
import { adminProductInclude } from "@/modules/products/server/mappers";
import { getAdminProduct } from "@/modules/products/server/queries";
import {
  canManageProduct,
  cleanProductText,
  isProductId,
  ProductRuleViolation,
  slugifyProductName,
} from "@/modules/products/server/rules";
import {
  resolveProductTaxonomyId,
  writeProductChannels,
  writeProductMeasurements,
  writeProductMedia,
} from "@/modules/products/server/write-helpers";
import type {
  AdminProduct,
  ProductEditorIntent,
  ProductEditorIssue,
  ProductEditorValues,
  ProductMutationError,
  ProductSaveOutcome,
} from "@/modules/products/types";

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

function validateSaveInput(
  values: ProductEditorValues,
  intent: ProductEditorIntent,
  existing: AdminProduct | null,
): ProductEditorIssue[] {
  const parsed = productEditorDraftSchema.safeParse(values);
  const issues = parsed.success ? [] : mapZodIssues(parsed.error.issues);
  if (intent === "publish") issues.push(...validateProductForPublish(values));
  if (intent === "schedule") issues.push(...validateProductForSchedule(values));

  if (values.productId && !isProductId(values.productId)) {
    issues.push({
      path: "productId",
      message: "The product reference is invalid.",
      step: "review",
    });
  }

  if (values.inventoryMode === "variant") {
    const existingIds = new Set<string>();
    for (const [index, variant] of values.variant.variants.entries()) {
      if (!variant.id || !isProductId(variant.id)) continue;
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

export async function saveProduct(
  actor: StaffSession,
  values: ProductEditorValues,
  intent: ProductEditorIntent,
): Promise<Result<ProductSaveOutcome, ProductMutationError>> {
  const capability = values.productId ? "inventory:update" : "inventory:create";
  if (!canManageProduct(actor, capability)) {
    return err({
      code: "validation-failed",
      message: "You don't have permission to save products.",
    });
  }

  const existing = values.productId ? await getAdminProduct(values.productId) : null;
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
  const slug = slugifyProductName(values.name || `draft-${values.inventoryMode}`);
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
              include: adminProductInclude,
            })
          : null;
        if (values.productId && !currentRow) {
          throw new ProductRuleViolation({
            code: "product-not-found",
            message: "This product could not be found.",
          });
        }

        await assertProductInventoryModeCanChange(
          tx,
          values.productId ?? "",
          currentRow,
          values.inventoryMode,
        );

        const categoryId = await resolveProductTaxonomyId(tx, "category", values.category);
        const collectionId = await resolveProductTaxonomyId(tx, "collection", values.collection);
        const productData = {
          category_id: categoryId,
          collection_id: collectionId,
          slug,
          name: cleanProductText(values.name) || `Untitled ${values.inventoryMode} product`,
          description:
            cleanProductText(values.description) || "Draft product awaiting complete details.",
          inventory_mode: values.inventoryMode,
          brand: cleanProductText(values.brand) || "Unlabelled",
          price: (values.sellingPrice ?? 0).toFixed(2),
          reference_price: values.referencePrice?.toFixed(2) ?? null,
          cost: values.cost?.toFixed(2) ?? null,
          lifecycle,
          publication,
          low_stock_threshold: values.inventoryMode === "unique" ? 1 : values.lowStockThreshold,
          archive_number:
            values.inventoryMode === "unique"
              ? cleanProductText(values.internalReference) || null
              : null,
          sku:
            values.inventoryMode === "stocked"
              ? cleanProductText(values.internalReference) || null
              : null,
          condition:
            values.inventoryMode === "unique"
              ? cleanProductText(values.unique.condition) || null
              : null,
          size_label:
            values.inventoryMode === "unique"
              ? cleanProductText(values.unique.size) || null
              : values.inventoryMode === "stocked"
                ? cleanProductText(values.stocked.sizeLabel) || null
                : null,
          colour:
            values.inventoryMode === "unique"
              ? cleanProductText(values.unique.colour) || null
              : values.inventoryMode === "stocked"
                ? cleanProductText(values.stocked.colour) || null
                : null,
          material: cleanProductText(values.material) || null,
          fit: cleanProductText(values.fit) || null,
          style: cleanProductText(values.style) || null,
          care_instructions: cleanProductText(values.careInstructions) || null,
          flaw_notes: cleanProductText(values.flawNotes) || null,
          weight_grams:
            values.fulfilment.weightKg === null
              ? null
              : Math.round(values.fulfilment.weightKg * 1000),
          pickup_available: values.fulfilment.pickupAvailable,
          delivery_restrictions: cleanProductText(values.fulfilment.deliveryRestrictions),
          packaging_notes: cleanProductText(values.fulfilment.packagingNotes),
          scheduled_at: intent === "schedule" ? new Date(values.scheduledAt) : null,
          published_at: intent === "publish" ? new Date() : null,
        };

        const product = currentRow
          ? await tx.products.update({ where: { id: currentRow.id }, data: productData })
          : await tx.products.create({ data: productData });

        await writeProductMedia(tx, product.id, values.media);
        await writeProductChannels(tx, product.id, values.channels);
        await writeProductMeasurements(tx, product.id, values);
        await writeProductStockAndVariants(tx, actor, product.id, values, currentRow);
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

    const saved = await getAdminProduct(productId);
    if (!saved) throw new Error("The saved product could not be reloaded.");
    const message =
      intent === "draft"
        ? `${saved.name} saved as a draft.`
        : intent === "schedule"
          ? `${saved.name} scheduled for publication.`
          : `${saved.name} published.`;
    return ok({ product: saved, intent, message, previousSlug });
  } catch (error) {
    if (error instanceof ProductRuleViolation || error instanceof InventoryRuleViolation) {
      return err(error.actionError);
    }
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
