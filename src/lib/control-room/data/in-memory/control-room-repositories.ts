import type { ControlRoomStore } from "@/features/control-room/state/control-room-store";
import type { ControlRoomRepositories } from "@/lib/control-room/data/repositories";
import { getOverviewSnapshot } from "@/lib/control-room/selectors";
import type { ControlRoomState, OrderStatus } from "@/lib/control-room/types";

const closedOrderStatuses = new Set<OrderStatus>([
  "delivered",
  "cancelled",
  "refunded",
  "returned",
]);

export function createInMemoryControlRoomRepositories(
  store: ControlRoomStore,
): ControlRoomRepositories {
  const read = <T>(selector: (state: ControlRoomState) => T): Promise<T> =>
    Promise.resolve(cloneValue(selector(store.getSnapshot())));

  return {
    inventory: {
      listProducts: () => read((state) => state.products),
      getProduct: (productId) =>
        read(
          (state) =>
            state.products.find((product) => product.id === productId) ?? null,
        ),
      listTaxonomy: () => read((state) => state.catalogueTaxonomy ?? []),
      listStockMovements: (productId) =>
        read((state) =>
          productId
            ? state.stockMovements.filter(
                (movement) => movement.productId === productId,
              )
            : state.stockMovements,
        ),
    },
    orders: {
      listOrders: () => read((state) => state.orders),
      getOrder: (orderId) =>
        read(
          (state) => state.orders.find((order) => order.id === orderId) ?? null,
        ),
    },
    holds: {
      listHolds: () => read((state) => state.holds),
      getHold: (holdId) =>
        read((state) => state.holds.find((hold) => hold.id === holdId) ?? null),
    },
    returns: {
      listReturns: () => read((state) => state.returns ?? []),
      getReturn: (returnId) =>
        read(
          (state) =>
            (state.returns ?? []).find((record) => record.id === returnId) ??
            null,
        ),
    },
    customers: {
      listCustomers: () => read((state) => state.customers),
      getCustomer: (customerId) =>
        read(
          (state) =>
            state.customers.find((customer) => customer.id === customerId) ??
            null,
        ),
    },
    settings: {
      getSettings: () => read((state) => state.settings ?? null),
    },
    overview: {
      getOverview: () =>
        read((state) => ({
          snapshot: getOverviewSnapshot(state),
          reportingDate: state.reportingDate,
          asOf: state.asOf,
          salesPulse: state.salesPulse,
          openOrders: state.orders.filter(
            (order) => !closedOrderStatuses.has(order.status),
          ),
        })),
    },
  };
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}
