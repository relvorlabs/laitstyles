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
    (grouped[row.variant_id] ??= []).push({
      label: row.label,
      value: row.value,
      position: row.position,
    });
  }
  return grouped;
}
