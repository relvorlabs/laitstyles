import {
  ArrowUpRight01Icon,
  DashboardSquare01Icon,
  PackageIcon,
  Store01Icon,
} from "@hugeicons/core-free-icons";
import type { ControlRoomIconData } from "@/features/control-room/shared/control-room-icon";

export type ControlRoomNavigationItem = {
  label: string;
  href: string;
  icon: ControlRoomIconData;
  description: string;
};

export type ControlRoomNavigationGroup = {
  label: string;
  items: ControlRoomNavigationItem[];
};

const overviewItem: ControlRoomNavigationItem = {
  label: "Overview",
  href: "/admin",
  icon: DashboardSquare01Icon,
  description: "Today’s health, priorities and recent changes.",
};

const inventoryItem: ControlRoomNavigationItem = {
  label: "Inventory",
  href: "/admin/inventory",
  icon: PackageIcon,
  description: "Pieces, stocked products and variants.",
};

const ordersItem: ControlRoomNavigationItem = {
  label: "Orders",
  href: "/admin/orders",
  icon: PackageIcon,
  description: "Payment, fulfilment and delivery operations.",
};

const holdsItem: ControlRoomNavigationItem = {
  label: "Holds",
  href: "/admin/holds",
  icon: Store01Icon,
  description: "Reservations, release risk and conversion work.",
};

const returnsItem: ControlRoomNavigationItem = {
  label: "Returns",
  href: "/admin/returns",
  icon: ArrowUpRight01Icon,
  description: "Requests, inspection, refund state and stock disposition.",
};

const customersItem: ControlRoomNavigationItem = {
  label: "Customers",
  href: "/admin/customers",
  icon: Store01Icon,
  description: "Relationships, spend, follow-up and delivery context.",
};

const settingsItem: ControlRoomNavigationItem = {
  label: "Settings",
  href: "/admin/settings",
  icon: Store01Icon,
  description: "Store identity, selling, delivery, payments and team preferences.",
};

export const controlRoomNavigationGroups: ControlRoomNavigationGroup[] = [
  {
    label: "Control room",
    items: [overviewItem],
  },
  {
    label: "Catalogue",
    items: [inventoryItem],
  },
  {
    label: "Sales",
    items: [ordersItem, holdsItem, returnsItem],
  },
  {
    label: "People",
    items: [customersItem],
  },
  {
    label: "Store",
    items: [settingsItem],
  },
];

export const controlRoomNavigation = controlRoomNavigationGroups.flatMap((group) => group.items);

export const controlRoomExternalLinks: ControlRoomNavigationItem[] = [
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

export function getControlRoomPage(pathname: string) {
  return (
    controlRoomNavigation.find((item) =>
      item.href === "/admin"
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? overviewItem
  );
}
