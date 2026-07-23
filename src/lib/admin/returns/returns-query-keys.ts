export const returnsKeys = {
  all: ["admin", "returns"] as const,
  list: () => [...returnsKeys.all, "list"] as const,
};
