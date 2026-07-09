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
  active: "border-[#CBD2BA] bg-[#E7EBDD] text-[#4A5540]",
  success: "border-[#B9D8C0] bg-[#E7F4EA] text-[#356141]",
  warning: "border-[#E3D3A0] bg-[#F8F0D7] text-[#745D17]",
  danger: "border-[#E3B6AE] bg-[#F8E5E1] text-[#8A3F34]",
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
