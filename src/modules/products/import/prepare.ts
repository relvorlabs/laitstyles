import { err, ok, type Result } from "@/lib/errors";
import { parseProductImportText } from "@/modules/products/import/csv";
import {
  isBoundedProductImportRelationalSnapshot,
  mapProductImport,
  type ProductImportMappingResult,
} from "@/modules/products/import/mapper";
import {
  PRODUCT_IMPORT_MAX_ROWS,
  type ProductImportChild,
  type ProductImportFileInput,
  type ProductImportFileIssue,
} from "@/modules/products/import/types";

export function prepareProductImport(
  input: ProductImportFileInput,
): Result<ProductImportMappingResult, ProductImportFileIssue> {
  const parsed = parseProductImportText(input);
  if (parsed.ok) return ok(mapProductImport(parsed.value.rows, parsed.value.ignoredAssetCount));
  if (!input.fileName.toLocaleLowerCase("en-NG").endsWith(".json")) return parsed;

  try {
    const snapshot: unknown = JSON.parse(input.text);
    if (
      snapshot &&
      typeof snapshot === "object" &&
      !Array.isArray(snapshot) &&
      Array.isArray((snapshot as { products?: unknown }).products) &&
      (snapshot as { products: unknown[] }).products.length > PRODUCT_IMPORT_MAX_ROWS
    ) {
      return err({
        code: "too-many-products",
        message: "Import files may contain at most 1,000 products.",
      });
    }
    if (isBoundedProductImportRelationalSnapshot(snapshot, input.size)) {
      return ok(mapProductImport(snapshot));
    }
  } catch {
    return parsed;
  }

  return err(parsed.error);
}

export function filterDuplicateProductImportChildren(
  existing: ProductImportChild[],
  incoming: ProductImportChild[],
): { accepted: ProductImportChild[]; skippedCount: number } {
  const references = new Set(existing.map(referenceKey).filter((value) => value.length > 0));
  const importIds = new Set(existing.map((child) => child.importId));
  const accepted: ProductImportChild[] = [];
  let skippedCount = 0;

  for (const child of incoming) {
    const reference = referenceKey(child);
    if (reference && references.has(reference)) {
      skippedCount += 1;
      continue;
    }
    if (reference) references.add(reference);

    const importId = uniqueImportId(child.importId, importIds);
    importIds.add(importId);
    accepted.push(importId === child.importId ? child : { ...child, importId });
  }

  return { accepted, skippedCount };
}

function referenceKey(child: ProductImportChild) {
  return child.values.internalReference.trim().toLocaleLowerCase("en-NG");
}

function uniqueImportId(candidate: string, used: Set<string>) {
  if (!used.has(candidate)) return candidate;
  let suffix = 2;
  while (used.has(`${candidate}-${suffix}`)) suffix += 1;
  return `${candidate}-${suffix}`;
}
