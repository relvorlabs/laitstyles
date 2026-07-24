export const MAX_STOREFRONT_CATALOGUE_DETAILS = 300;

export function normalizePublishedProductDetailLimit(limit?: number): number {
  if (limit === undefined || !Number.isFinite(limit)) {
    return MAX_STOREFRONT_CATALOGUE_DETAILS;
  }

  return Math.min(MAX_STOREFRONT_CATALOGUE_DETAILS, Math.max(1, Math.trunc(limit)));
}
