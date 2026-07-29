export const accountLifecycleKeys = {
  exports: {
    all: ["account", "data-exports"] as const,
    detail: (exportId: string) => ["account", "data-exports", exportId] as const,
  },
  deletion: {
    all: ["account", "deletion-requests"] as const,
  },
};
