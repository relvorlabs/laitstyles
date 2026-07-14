/**
 * Store Settings domain query-key factory (Phase 12 foundation).
 *
 * Settings is a single store-scoped resource today, so there is one detail key.
 * It is expressed through a factory so section-scoped keys can be added without
 * changing existing cache writes.
 */
export const settingsKeys = {
  all: ["settings"] as const,
  detail: () => [...settingsKeys.all, "detail"] as const,
};
