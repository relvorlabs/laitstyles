import type { AccountRoute } from "@/modules/storefront-shell/ui/account-context";

export type { AccountRoute } from "@/modules/storefront-shell/ui/account-context";

export type AccountNavItem = {
  route: AccountRoute;
  label: string;
  count?: string;
  dot?: boolean;
};

export const accountNavItems: AccountNavItem[] = [
  { route: "overview", label: "Overview" },
  { route: "profile", label: "Profile" },
  { route: "orders", label: "Orders" },
  { route: "returns", label: "Returns", count: "01" },
  { route: "addresses", label: "Addresses" },
  { route: "payments", label: "Payment methods" },
  { route: "saved", label: "Saved items", count: "05" },
  { route: "notifications", label: "Notifications", dot: true },
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
  "return-detail": "Return #RT-0038",
  addresses: "Addresses",
  payments: "Payment methods",
  saved: "Saved items",
  notifications: "Notifications",
  preferences: "Preferences",
  security: "Security",
  privacy: "Privacy",
  support: "Support",
  "ticket-detail": "Ticket #SP-0119",
};

export const routePaths: Record<AccountRoute, string> = {
  overview: "/account",
  profile: "/account/profile",
  orders: "/account/orders",
  "order-detail": "/account/orders/detail",
  returns: "/account/returns",
  "return-detail": "/account/returns/detail",
  addresses: "/account/addresses",
  payments: "/account/payments",
  saved: "/account/saved",
  notifications: "/account/notifications",
  preferences: "/account/preferences",
  security: "/account/security",
  privacy: "/account/privacy",
  support: "/account/support",
  "ticket-detail": "/account/support/detail",
};

const pathToRoute = new Map<string, AccountRoute>(
  (Object.entries(routePaths) as [AccountRoute, string][]).map(([route, path]) => [path, route]),
);

export function routeFromPathname(pathname: string): AccountRoute {
  if (pathname.startsWith("/account/orders/")) return "order-detail";
  return pathToRoute.get(pathname) ?? "overview";
}
