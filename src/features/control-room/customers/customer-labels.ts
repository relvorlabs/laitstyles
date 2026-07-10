import type {
  CustomerAttentionReason,
  CustomerSegment,
  CustomerTimelineKind,
  CustomerType,
} from "@/lib/control-room/customer-types";

export const customerTypeLabels: Record<CustomerType, string> = {
  individual: "Individual",
  stylist: "Stylist",
  reseller: "Reseller",
  "walk-in": "Walk-in",
};

export const customerSegmentLabels: Record<CustomerSegment, string> = {
  new: "New",
  returning: "Returning",
  "high-value": "High value",
  "needs-attention": "Needs attention",
};

export const customerAttentionLabels: Record<CustomerAttentionReason, string> = {
  payment: "Payment follow-up",
  delivery: "Delivery follow-up",
  return: "Open return",
  hold: "Hold at risk",
};

export const customerTimelineLabels: Record<CustomerTimelineKind, string> = {
  order: "Order",
  payment: "Payment",
  delivery: "Delivery",
  hold: "Hold",
  return: "Return",
  review: "Review",
  customer: "Customer note",
};

const customerDateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const customerDateTimeFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function formatCustomerDate(value: string | null | undefined) {
  return value ? customerDateFormatter.format(new Date(value)) : "No purchase yet";
}

export function formatCustomerDateTime(value: string) {
  return customerDateTimeFormatter.format(new Date(value));
}

export function getCustomerInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}