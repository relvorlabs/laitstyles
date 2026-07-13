import type { HoldWorkspaceRisk } from "@/features/control-room/holds/hold-types";
import type {
  HoldSource,
  HoldStage,
  HoldStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/control-room/types";

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
};

export const holdRiskLabels: Record<HoldWorkspaceRisk, string> = {
  stable: "Stable",
  expiring: "Expiring",
  "payment-risk": "Payment risk",
  expired: "Expired",
  released: "Released",
  converted: "Converted",
};

export const conversionPaymentLabels: Record<
  Extract<PaymentStatus, "pending" | "paid" | "deposit">,
  string
> = {
  pending: "Payment pending",
  paid: "Paid in full",
  deposit: "Deposit received",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  "bank-transfer": "Bank transfer",
  card: "Card",
  pos: "POS",
  "pay-on-delivery": "Pay on delivery",
  other: "Other",
};

export function formatHoldDate(value: string) {
  return holdDateFormatter.format(new Date(value));
}
