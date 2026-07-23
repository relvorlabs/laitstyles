export const holdsKeys = {
  all: ["admin", "holds"] as const,
  list: () => [...holdsKeys.all, "list"] as const,
};
