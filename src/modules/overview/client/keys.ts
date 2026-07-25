export const overviewKeys = {
  all: ["admin", "overview"] as const,
  detail: () => [...overviewKeys.all, "detail"] as const,
};
