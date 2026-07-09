import {
  ArrowUpRight01Icon,
  DashboardSquare01Icon,
  Store01Icon,
} from "@hugeicons/core-free-icons";
import type { ControlRoomIconData } from "@/features/control-room/shared/control-room-icon";

export type ControlRoomNavigationItem = {
  label: string;
  href: string;
  icon: ControlRoomIconData;
  description: string;
};

export const controlRoomNavigation: ControlRoomNavigationItem[] = [
  {
    label: "Overview",
    href: "/admin",
    icon: DashboardSquare01Icon,
    description: "Today’s health, priorities and recent changes.",
  },
];

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
