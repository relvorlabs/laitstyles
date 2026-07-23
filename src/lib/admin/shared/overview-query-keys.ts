export const overviewKeys = {
  all: ["admin", "overview"] as const,
  overview: () => [...overviewKeys.all, "snapshot"] as const,
};
