import type {
  ControlRoomCustomer,
  ControlRoomOrder,
  ControlRoomState,
  OfflineSaleInput,
  OfflineSaleSuccess,
  SalesActionError,
  StockMovement,
} from "@/lib/control-room/types";
import { err, ok, type Result } from "@/lib/control-room/result";
import { isHoldActive } from "@/lib/control-room/sales-selectors";
import {
  applySalesStockMutation,
  type SalesStockMutationKind,
} from "@/lib/control-room/sales-stock";

export type OfflineSaleStateResult = {
  state: ControlRoomState;
  action: OfflineSaleSuccess;
};

export function applyOfflineSale(
  state: ControlRoomState,
  input: OfflineSaleInput,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<OfflineSaleStateResult, SalesActionError> {
  if (!input.lines.length) {
    return err({
      code: "empty-sale",
      message: "Add at least one product before recording the sale.",
      field: "lines",
    });
  }

  const customerResult = resolveSaleCustomer(state, input, idFactory);
  if (!customerResult.ok) return customerResult;

  let products = state.products;
  const movements: StockMovement[] = [];
  const orderLines: ControlRoomOrder["lines"] = [];
  const stockMutation: SalesStockMutationKind =
    input.paymentStatus === "pending" ? "reserve" : "sell-available";
  let total = 0;

  for (const [index, line] of input.lines.entries()) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      return err({
        code: "invalid-quantity",
        message: "Each sale quantity must be a whole number greater than zero.",
        field: `lines.${index}.quantity`,
        productId: line.productId,
        variantId: line.variantId,
        requested: line.quantity,
      });
    }
    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
      return err({
        code: "invalid-price",
        message: "Each final selling price must be zero or greater.",
        field: `lines.${index}.unitPrice`,
        productId: line.productId,
        variantId: line.variantId,
      });
    }

    const stockResult = applySalesStockMutation(products, {
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
      kind: stockMutation,
    });
    if (!stockResult.ok) {
      if (stockResult.error.code === "insufficient-available-stock") {
        return err({
          ...stockResult.error,
          conflictingHoldIds: findConflictingHoldIds(
            state,
            line.productId,
            line.variantId,
            now,
          ),
        });
      }
      return stockResult;
    }

    products = stockResult.value.products;
    total += line.unitPrice * line.quantity;
    orderLines.push({
      id: idFactory("order-line"),
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      stockState: input.paymentStatus === "pending" ? "reserved" : "sold",
    });
    movements.push({
      id: idFactory("movement"),
      productId: line.productId,
      variantId: line.variantId ?? null,
      kind: input.paymentStatus === "pending" ? "reserved" : "sold",
      quantity: line.quantity,
      occurredAt: now,
      actor: "Store owner",
      note:
        input.paymentStatus === "pending"
          ? "Reserved through a pending offline sale."
          : "Sold through the Record Sale workflow.",
    });
  }

  const orderId = createOrderId(idFactory);
  const fulfilmentStatus =
    input.paymentStatus === "pending" ? "pending-payment" : "delivered";
  const order: ControlRoomOrder = {
    id: orderId,
    customerId: customerResult.value.customer.id,
    customerLabel: customerResult.value.customer.name,
    source: "offline-sale",
    channel: input.channel,
    paymentStatus: input.paymentStatus,
    paymentMethod: input.paymentMethod,
    fulfilmentStatus,
    lines: orderLines,
    total,
    placedAt: now,
    deliveryCity: customerResult.value.customer.city,
    deliveryAddress: null,
    courier: null,
    notes: input.notes,
    attention: input.paymentStatus === "pending" ? "payment" : undefined,
    timeline: [
      {
        id: idFactory("order-event"),
        status: fulfilmentStatus,
        occurredAt: now,
        actor: "Store owner",
        note:
          input.paymentStatus === "pending"
            ? "Offline sale recorded with payment still pending."
            : "Offline sale completed and stock marked as sold.",
      },
    ],
    payments: [
      {
        id: idFactory("payment-event"),
        status: input.paymentStatus,
        method: input.paymentMethod,
        amount: input.paymentStatus === "pending" ? 0 : total,
        occurredAt: now,
        note: "Payment state captured through Record Sale.",
      },
    ],
  };
  const message = `Offline sale ${order.id} was recorded for ${customerResult.value.customer.name}.`;

  return ok({
    state: {
      ...state,
      asOf: now,
      products,
      customers: customerResult.value.customers,
      orders: [order, ...state.orders],
      stockMovements: [...movements, ...state.stockMovements],
      salesPulse: updateSalesPulse(
        state.salesPulse,
        state.reportingDate,
        total,
        input.paymentStatus,
      ),
      activities: [
        {
          id: idFactory("activity"),
          kind: "sale",
          title: `Offline sale ${order.id} recorded`,
          detail: `${orderLines.reduce((sum, line) => sum + line.quantity, 0)} unit${orderLines.reduce((sum, line) => sum + line.quantity, 0) === 1 ? "" : "s"} · ${input.channel.replaceAll("-", " ")}`,
          occurredAt: now,
          orderId: order.id,
          customerId: customerResult.value.customer.id,
        },
        ...state.activities,
      ],
    },
    action: {
      order,
      customerId: customerResult.value.customer.id,
      message,
    },
  });
}

function resolveSaleCustomer(
  state: ControlRoomState,
  input: OfflineSaleInput,
  idFactory: (prefix: string) => string,
): Result<
  { customer: ControlRoomCustomer; customers: ControlRoomCustomer[] },
  SalesActionError
> {
  if (input.customer.kind === "existing") {
    const customer = state.customers.find(
      (item) => item.id === input.customer.customerId,
    );
    if (!customer) {
      return err({
        code: "customer-not-found",
        message: "The selected customer could not be found.",
        field: "customer",
      });
    }
    return ok({ customer, customers: state.customers });
  }

  const customer: ControlRoomCustomer = {
    id: idFactory("customer"),
    name: input.customer.name.trim() || "Walk-in customer",
    email: input.customer.email.trim(),
    phone: input.customer.phone.trim(),
    city: input.customer.city.trim() || "Lagos",
  };
  return ok({ customer, customers: [customer, ...state.customers] });
}

function findConflictingHoldIds(
  state: ControlRoomState,
  productId: string,
  variantId: string | undefined,
  now: string,
) {
  return state.holds
    .filter(
      (hold) =>
        isHoldActive(hold, now) &&
        hold.productId === productId &&
        hold.variantId === variantId,
    )
    .map((hold) => hold.id);
}

function updateSalesPulse(
  points: ControlRoomState["salesPulse"],
  reportingDate: string,
  total: number,
  paymentStatus: OfflineSaleInput["paymentStatus"],
) {
  if (paymentStatus === "pending") return points;

  return points.map((point) =>
    point.date === reportingDate
      ? { ...point, offline: point.offline + total }
      : point,
  );
}

function createOrderId(idFactory: (prefix: string) => string) {
  const suffix = idFactory("order").replace(/\D/g, "").slice(-5);
  return `LS-${suffix.padStart(5, "0")}`;
}

function createActionId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
