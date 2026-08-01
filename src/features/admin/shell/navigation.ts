import {
  ArrowUpRight01Icon,
  DashboardSquare01Icon,
  PackageIcon,
  Store01Icon,
} from "@hugeicons/core-free-icons";
import type { AdminIconData } from "@/features/admin/shared/admin-icon";
import type { StaffCapability } from "@/modules/auth/permissions";

export type AdminNavigationItem = {
  label: string;
  href: string;
  icon: AdminIconData;
  description: string;
  requiredCapability?: StaffCapability;
};

export type AdminNavigationGroup = {
  label: string;
  items: AdminNavigationItem[];
};

const overviewItem: AdminNavigationItem = {
  label: "Overview",
  href: "/admin",
  icon: DashboardSquare01Icon,
  description: "Today’s health, priorities and recent changes.",
};

const inventoryItem: AdminNavigationItem = {
  label: "Inventory",
  href: "/admin/inventory",
  icon: PackageIcon,
  description: "Pieces, stocked products and variants.",
};

const ordersItem: AdminNavigationItem = {
  label: "Orders",
  href: "/admin/orders",
  icon: PackageIcon,
  description: "Payment, fulfilment and delivery operations.",
};

const holdsItem: AdminNavigationItem = {
  label: "Holds",
  href: "/admin/holds",
  icon: Store01Icon,
  description: "Reservations, release risk and conversion work.",
};

const returnsItem: AdminNavigationItem = {
  label: "Returns",
  href: "/admin/returns",
  icon: ArrowUpRight01Icon,
  description: "Requests, inspection, refund state and stock disposition.",
};

const promotionsItem: AdminNavigationItem = {
  label: "Promotions",
  href: "/admin/promotions",
  icon: Store01Icon,
  description: "Generate coupon codes, schedule offers and review verified usage.",
  requiredCapability: "settings:read",
};

const paymentsItem: AdminNavigationItem = {
  label: "Payments",
  href: "/admin/payments",
  icon: Store01Icon,
  description: "Captured payments, partial refunds and provider state.",
  requiredCapability: "finance:read",
};

const disputesItem: AdminNavigationItem = {
  label: "Disputes",
  href: "/admin/disputes",
  icon: ArrowUpRight01Icon,
  description: "Chargebacks, evidence deadlines and owner decisions.",
  requiredCapability: "finance:read",
};

const financeItem: AdminNavigationItem = {
  label: "Finance",
  href: "/admin/finance",
  icon: Store01Icon,
  description: "Paystack balance, settlements, recipients and deliberate transfers.",
  requiredCapability: "finance:read",
};

const customersItem: AdminNavigationItem = {
  label: "Customers",
  href: "/admin/customers",
  icon: Store01Icon,
  description: "Relationships, spend, follow-up and delivery context.",
};

const teamItem: AdminNavigationItem = {
  label: "Team",
  href: "/admin/team",
  icon: Store01Icon,
  description: "Invite and review store-manager access.",
  requiredCapability: "team:read",
};

const settingsItem: AdminNavigationItem = {
  label: "Settings",
  href: "/admin/settings",
  icon: Store01Icon,
  description: "Store identity, selling, delivery, payments and team preferences.",
};

export const adminNavigationGroups: AdminNavigationGroup[] = [
  { label: "Admin", items: [overviewItem] },
  { label: "Catalogue", items: [inventoryItem] },
  {
    label: "Sales",
    items: [
      ordersItem,
      holdsItem,
      returnsItem,
      promotionsItem,
      paymentsItem,
      disputesItem,
      financeItem,
    ],
  },
  { label: "People", items: [customersItem, teamItem] },
  { label: "Store", items: [settingsItem] },
];

export const adminNavigation = adminNavigationGroups.flatMap((group) => group.items);

export const adminExternalLinks: AdminNavigationItem[] = [
  {
    label: "Preview storefront",
    href: "/",
    icon: ArrowUpRight01Icon,
    description: "Open the customer-facing Laitstyle storefront.",
  },
  {
    label: "Store status",
    href: "/admin#today",
    icon: Store01Icon,
    description: "Return to today’s store pulse.",
  },
];

export function getAdminPage(pathname: string) {
  return (
    adminNavigation.find((item) =>
      item.href === "/admin"
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? overviewItem
  );
}
