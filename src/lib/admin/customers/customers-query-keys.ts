export const customersKeys = {
  all: ["admin", "customers"] as const,
  list: () => [...customersKeys.all, "list"] as const,
};
