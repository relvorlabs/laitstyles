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
