export const settingsKeys = {
  all: ["admin", "settings"] as const,
  detail: () => [...settingsKeys.all, "detail"] as const,
};
