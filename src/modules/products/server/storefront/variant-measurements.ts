import type { Measurement } from "@/modules/products/storefront-types";

type MeasurementInput = {
  bust?: number;
  waist?: number;
  hips?: number;
  length?: number;
};

export type NormalizedVariantMeasurements = {
  bust?: number;
  waist?: number;
  hips?: number;
  length?: number;
};

export type VariantMeasurementRecord = {
  variant_id: string;
  label: string;
  value: string;
  position: number;
};

export function normalizeVariantMeasurements(
  measurements: MeasurementInput | null | undefined,
): NormalizedVariantMeasurements | undefined {
  if (!measurements) return undefined;

  const normalized = Object.fromEntries(
    Object.entries({
      bust: measurements.bust,
      waist: measurements.waist,
      hips: measurements.hips,
      length: measurements.length,
    }).filter((entry): entry is [string, number] => typeof entry[1] === "number"),
  ) as NormalizedVariantMeasurements;

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function groupVariantMeasurements(
  rows: readonly VariantMeasurementRecord[],
): Record<string, Measurement[]> {
  const grouped: Record<string, Measurement[]> = {};
  for (const row of rows) {
    const measurements = grouped[row.variant_id] ?? [];
    measurements.push({
      label: row.label,
      value: row.value,
      position: row.position,
    });
    grouped[row.variant_id] = measurements;
  }
  return grouped;
}
