/**
 * Holds domain query-key factory (Phase 12 foundation).
 *
 * List keys will grow to include risk view, saved view, sort and pagination
 * inputs as the Holds reads migrate onto the query boundary. Detail keys use the
 * stable business ID.
 */
export const holdKeys = {
  all: ["holds"] as const,
  lists: () => [...holdKeys.all, "list"] as const,
  list: () => [...holdKeys.lists()] as const,
  details: () => [...holdKeys.all, "detail"] as const,
  detail: (holdId: string) => [...holdKeys.details(), holdId.trim()] as const,
};
