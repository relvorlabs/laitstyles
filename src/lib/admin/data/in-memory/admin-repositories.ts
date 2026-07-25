import type { AdminStore } from "@/features/admin/state/admin-store";
import type { AdminRepositories } from "@/lib/admin/data/repositories";
import { getOverviewSnapshot } from "@/lib/admin/shared/selectors";
import type { AdminState, OrderStatus } from "@/lib/admin/shared/types";

const closedOrderStatuses = new Set<OrderStatus>([
  "delivered",
  "cancelled",
  "refunded",
  "returned",
]);

export function createInMemoryAdminRepositories(store: AdminStore): AdminRepositories {
  const read = <T>(selector: (state: AdminState) => T): Promise<T> =>
    Promise.resolve(cloneValue(selector(store.getSnapshot())));

  return {
    returns: {
      listReturns: () => read((state) => state.returns ?? []),
      getReturn: (returnId) =>
        read((state) => (state.returns ?? []).find((record) => record.id === returnId) ?? null),
    },
    customers: {
      listCustomers: () => read((state) => state.customers),
      getCustomer: (customerId) =>
        read((state) => state.customers.find((customer) => customer.id === customerId) ?? null),
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
            (order) => !closedOrderStatuses.has(order.fulfilmentStatus),
          ),
        })),
    },
  };
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}
