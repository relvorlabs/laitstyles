/**
 * Returns domain query-key factory (Phase 12 foundation).
 *
 * List keys will grow to include disposition/refund view, sort and pagination
 * inputs as the Returns reads migrate onto the query boundary. Detail keys use
 * the stable business ID.
 */
export const returnKeys = {
  all: ["returns"] as const,
  lists: () => [...returnKeys.all, "list"] as const,
  list: () => [...returnKeys.lists()] as const,
  details: () => [...returnKeys.all, "detail"] as const,
  detail: (returnId: string) => [...returnKeys.details(), returnId.trim()] as const,
};
