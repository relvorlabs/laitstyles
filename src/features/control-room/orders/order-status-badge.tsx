import { Badge } from "@/components/ui/badge";
import {
  getOrderStatusTone,
  getPaymentTone,
  orderStatusLabels,
  paymentStatusLabels,
} from "@/features/control-room/orders/order-labels";
import type { OrderStatus, PaymentStatus } from "@/lib/control-room/types";
import { cn } from "@/lib/utils";

const toneClasses = {
  active: "border-brand-sage/40 bg-accent text-accent-foreground",
  success: "border-success/35 bg-success/12 text-foreground",
  warning: "border-warning/40 bg-warning/18 text-warning-foreground",
  danger: "border-destructive/35 bg-destructive/12 text-destructive",
  closed: "border-border bg-secondary text-muted-foreground",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const tone = getOrderStatusTone(status);
  return (
    <Badge className={cn("capitalize", toneClasses[tone])} variant="outline">
      {orderStatusLabels[status]}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const tone = getPaymentTone(status);
  return (
    <Badge className={cn("capitalize", toneClasses[tone])} variant="outline">
      {paymentStatusLabels[status]}
    </Badge>
  );
}
