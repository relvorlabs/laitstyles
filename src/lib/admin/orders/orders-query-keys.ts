export const ordersKeys = {
  all: ["admin", "orders"] as const,
  list: () => [...ordersKeys.all, "list"] as const,
};
