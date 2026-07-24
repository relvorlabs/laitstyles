import type { Measurement } from "@/lib/storefront/types";

export type VariantMeasurementRecord = {
  variant_id: string;
  label: string;
  value: string;
  position: number;
};

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
