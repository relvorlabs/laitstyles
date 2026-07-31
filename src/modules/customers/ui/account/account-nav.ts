import type { AccountRoute } from "@/modules/storefront-shell/ui/account-context";

export type { AccountRoute } from "@/modules/storefront-shell/ui/account-context";

export type AccountNavItem = {
  route: AccountRoute;
  label: string;
};

export const accountNavItems: AccountNavItem[] = [
  { route: "overview", label: "Overview" },
  { route: "profile", label: "Profile" },
  { route: "orders", label: "Orders" },
  { route: "returns", label: "Returns" },
  { route: "addresses", label: "Addresses" },
  { route: "payments", label: "Payment methods" },
  { route: "saved", label: "Saved items" },
  { route: "notifications", label: "Notifications" },
  { route: "preferences", label: "Preferences" },
  { route: "security", label: "Security" },
  { route: "privacy", label: "Privacy" },
  { route: "support", label: "Support" },
];

export const routeTitles: Record<AccountRoute, string> = {
  overview: "Overview",
  profile: "Profile",
  orders: "Orders",
  "order-detail": "Order details",
  returns: "Returns",
  "return-detail": "Return details",
  addresses: "Addresses",
  payments: "Payment methods",
  saved: "Saved items",
  notifications: "Notifications",
  preferences: "Preferences",
  security: "Security",
  privacy: "Privacy",
  support: "Support",
  "ticket-detail": "Support ticket",
};

export const routePaths: Record<AccountRoute, string> = {
  overview: "/account",
  profile: "/account/profile",
  orders: "/account/orders",
  "order-detail": "/account/orders",
  returns: "/account/returns",
  "return-detail": "/account/returns",
  addresses: "/account/addresses",
  payments: "/account/payments",
  saved: "/account/saved",
  notifications: "/account/notifications",
  preferences: "/account/preferences",
  security: "/account/security",
  privacy: "/account/privacy",
  support: "/account/support",
  "ticket-detail": "/account/support",
};

const pathToRoute = new Map<string, AccountRoute>(
  (Object.entries(routePaths) as [AccountRoute, string][]).map(([route, path]) => [path, route]),
);

export function routeFromPathname(pathname: string): AccountRoute {
  if (pathname.startsWith("/account/orders/")) return "order-detail";
  if (pathname.startsWith("/account/returns/")) return "return-detail";
  if (pathname.startsWith("/account/support/")) return "ticket-detail";
  return pathToRoute.get(pathname) ?? "overview";
}
