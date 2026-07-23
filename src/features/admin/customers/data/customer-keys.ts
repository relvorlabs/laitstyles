/**
 * Customers domain query-key factory (Phase 12 foundation).
 *
 * List keys will grow to include segment, attention view, search, sort and
 * pagination inputs as the Customers reads migrate onto the query boundary.
 * Detail keys use the stable business ID.
 */
export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: () => [...customerKeys.lists()] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (customerId: string) => [...customerKeys.details(), customerId.trim()] as const,
};
