/**
 * Orders domain query-key factory (Phase 12 foundation).
 *
 * Keys are typed and serialisable. List keys will grow to include every
 * data-affecting filter, saved view, sort and pagination input as the Orders
 * reads migrate onto the query boundary. Detail keys use the stable business ID.
 */
export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: () => [...orderKeys.lists()] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (orderId: string) => [...orderKeys.details(), orderId.trim()] as const,
};
