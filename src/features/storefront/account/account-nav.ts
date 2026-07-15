// Navigation model for the account workspace, ported 1:1 from
// docs/storefront-v2/card-lab/account-workspace.html (desktop sidebar + mobile sheet
// share this list; the routeTitles map drives the breadcrumb, mobile title and
// document.title exactly as the prototype's `routeTitles` object did).

export type AccountRoute =
  | "overview"
  | "profile"
  | "orders"
  | "order-detail"
  | "returns"
  | "return-detail"
  | "addresses"
  | "payments"
  | "saved"
  | "notifications"
  | "preferences"
  | "security"
  | "privacy"
  | "support"
  | "ticket-detail";

export type AccountNavItem = {
  route: AccountRoute;
  label: string;
  /** Zero-padded count shown at the end of the row, e.g. "03". */
  count?: string;
  /** Oxblood unread dot (Notifications). */
  dot?: boolean;
};

// The eleven primary nav rows exactly as listed in the prototype sidebar/menu.
export const accountNavItems: AccountNavItem[] = [
  { route: "overview", label: "Overview" },
  { route: "profile", label: "Profile" },
  { route: "orders", label: "Orders", count: "03" },
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
  "order-detail": "Order #LS-1048",
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

// URL for each route under the app-router `/account` tree. Detail routes have
// no dynamic id in the prototype (the seed data is a single hardcoded order,
// return and ticket), so they're static segments rather than `[id]` routes.
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

/** Resolve the current section from `usePathname()`, defaulting to overview. */
export function routeFromPathname(pathname: string): AccountRoute {
  return pathToRoute.get(pathname) ?? "overview";
}
