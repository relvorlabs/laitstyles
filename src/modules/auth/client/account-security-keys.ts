export const accountSecurityKeys = {
  all: ["account", "security"] as const,
  factors: () => [...accountSecurityKeys.all, "mfa", "factors"] as const,
  sessions: () => [...accountSecurityKeys.all, "sessions"] as const,
};
