import type { HoldWorkspaceRisk } from "@/features/admin/holds/hold-types";
import type { HoldSource, HoldStage, HoldStatus } from "@/modules/holds/types";

const holdDateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const holdStageLabels: Record<HoldStage, string> = {
  product: "Product",
  cart: "Cart",
  checkout: "Checkout",
  payment: "Payment",
};

export const holdSourceLabels: Record<HoldSource, string> = {
  storefront: "Storefront",
  admin: "Admin",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  "physical-store": "Physical store",
};

export const holdStatusLabels: Record<HoldStatus, string> = {
  active: "Active",
  released: "Released",
  converted: "Converted",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const holdRiskLabels: Record<HoldWorkspaceRisk, string> = {
  stable: "Stable",
  expiring: "Expiring",
  "payment-risk": "Payment risk",
  expired: "Expired",
  released: "Released",
  converted: "Converted",
};

export function formatHoldDate(value: string) {
  return holdDateFormatter.format(new Date(value));
}
