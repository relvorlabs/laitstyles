import type { CatalogSnapshot } from "./catalog-snapshot";

type SnapshotMeasurement = CatalogSnapshot["product_measurements"][number];

export type ProductMeasurementRow = {
  id: string;
  product_id: string;
  label: string;
  value: string;
  position: number;
};

export type VariantMeasurementRow = {
  id: string;
  variant_id: string;
  label: string;
  value: string;
  position: number;
};

export function prepareMeasurementRows(rows: readonly SnapshotMeasurement[]) {
  const productPosition = new Map<string, number>();
  const variantPosition = new Map<string, number>();
  const productMeasurements: ProductMeasurementRow[] = [];
  const variantMeasurements: VariantMeasurementRow[] = [];

  for (const row of rows) {
    const value = `${row.value} ${row.unit}`;
    if (row.variant_id) {
      const position = variantPosition.get(row.variant_id) ?? 0;
      variantPosition.set(row.variant_id, position + 1);
      variantMeasurements.push({
        id: row.id,
        variant_id: row.variant_id,
        label: row.label,
        value,
        position,
      });
      continue;
    }

    const position = productPosition.get(row.product_id) ?? 0;
    productPosition.set(row.product_id, position + 1);
    productMeasurements.push({
      id: row.id,
      product_id: row.product_id,
      label: row.label,
      value,
      position,
    });
  }

  return { productMeasurements, variantMeasurements };
}
