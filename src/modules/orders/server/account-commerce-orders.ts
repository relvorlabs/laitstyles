import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import type { ConsumerSession } from "@/modules/auth/server/session";
import {
  getAccountOrder,
  getAccountOrders,
  type OrderCancellationInput,
  type OrderCancellationResult,
  requestOrderCancellation,
} from "@/modules/orders/server/account-orders";
import type {
  AccountOrderDetail,
  AccountOrderSummary,
} from "@/modules/orders/storefront/account-order-contract";

const PAYMENT_METHOD_SETUP_ORDER_PREFIX = "LS-METHOD-";

export async function getCommerceAccountOrders(customerId: string): Promise<AccountOrderSummary[]> {
  const orders = await getAccountOrders(customerId);
  return orders.filter((order) => !isPaymentMethodSetupOrder(order.orderNumber));
}

export async function getCommerceAccountOrder(
  customerId: string,
  orderNumber: string,
): Promise<AccountOrderDetail | null> {
  if (isPaymentMethodSetupOrder(orderNumber)) return null;
  return getAccountOrder(customerId, orderNumber);
}

export async function requestCommerceOrderCancellation(
  identity: ConsumerSession,
  orderNumber: string,
  input: OrderCancellationInput = {},
): Promise<OrderCancellationResult> {
  if (isPaymentMethodSetupOrder(orderNumber)) throw commerceOrderNotFoundError();
  return requestOrderCancellation(identity, orderNumber, input);
}

export function isPaymentMethodSetupOrder(orderNumber: string) {
  return orderNumber.toUpperCase().startsWith(PAYMENT_METHOD_SETUP_ORDER_PREFIX);
}

function commerceOrderNotFoundError() {
  return new ApiError({
    code: "ORDER_NOT_FOUND",
    message: "The selected order could not be found.",
    status: 404,
  });
}
