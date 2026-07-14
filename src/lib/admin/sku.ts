import type { InventoryMode } from "@/lib/control-room/inventory-types";

export type GenerateProductSkuInput = {
  mode: InventoryMode;
  name: string;
  brand: string;
  category: string;
  existingReferences?: string[];
};

export function generateProductSku({
  mode,
  name,
  brand,
  category,
  existingReferences = [],
}: GenerateProductSkuInput) {
  const prefix = mode === "unique" ? "UNI" : mode === "stocked" ? "STK" : "VAR";
  const brandCode = codeFrom(brand || "Unlabelled", 3);
  const categoryCode = codeFrom(category || "Product", 3);
  const productCode = codeFrom(name || "New product", 4);
  const base = `LS-${prefix}-${brandCode}-${categoryCode}-${productCode}`;
  return makeUnique(base, existingReferences);
}

export function generateVariantSku(
  baseReference: string,
  label: string,
  size: string,
  colour: string,
  existingReferences: string[] = [],
) {
  const base = normaliseSegment(baseReference) || "LS-VAR-PRODUCT";
  const structuredSegments = [compactCode(colour, 3), compactCode(size, 4)].filter(Boolean);
  const optionCode = structuredSegments.length
    ? structuredSegments.join("-")
    : compactCode(label || "Option", 5) || "OPT";
  return makeUnique(`${base}-${optionCode}`, existingReferences);
}

function makeUnique(candidate: string, references: string[]) {
  const used = new Set(references.map((value) => value.trim().toUpperCase()));
  if (!used.has(candidate)) return candidate;

  let suffix = 2;
  while (used.has(`${candidate}-${suffix}`)) suffix += 1;
  return `${candidate}-${suffix}`;
}

function codeFrom(value: string, maxLength: number) {
  const words = wordsFrom(value);

  if (!words.length) return "NA";
  if (words.length > 1) {
    const initials = words.map((word) => word[0]).join("");
    if (initials.length >= 2) return initials.slice(0, maxLength);
  }

  return words.join("").slice(0, maxLength).padEnd(Math.min(maxLength, 3), "X");
}

function compactCode(value: string, maxLength: number) {
  const words = wordsFrom(value);
  if (!words.length) return "";
  if (words.length > 1) {
    return words
      .map((word) => word[0])
      .join("")
      .slice(0, maxLength);
  }
  return words[0].slice(0, maxLength);
}

function wordsFrom(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function normaliseSegment(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
