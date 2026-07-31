export const accountCustomerKeys = {
  all: ["account", "customer"] as const,
  profile: () => [...accountCustomerKeys.all, "profile"] as const,
  addresses: () => [...accountCustomerKeys.all, "addresses"] as const,
  savedProducts: () => [...accountCustomerKeys.all, "saved-products"] as const,
  recentProducts: () => [...accountCustomerKeys.all, "recent-products"] as const,
};
