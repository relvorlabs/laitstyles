import { CustomersWorkspace } from "@/features/control-room/customers/customers-workspace";
import {
  customerSavedViews,
  customerSortOptions,
  defaultCustomerQuery,
} from "@/features/control-room/customers/customer-selectors";
import type {
  CustomerSavedView,
  CustomerSortKey,
  CustomerTypeFilter,
} from "@/features/control-room/customers/customer-types";
import { activeControlRoomSeed } from "@/lib/control-room/seed";

type CustomersPageProps = {
  searchParams: Promise<{
    view?: string | string[];
    q?: string | string[];
    type?: string | string[];
    sort?: string | string[];
    customer?: string | string[];
  }>;
};

const viewValues = new Set<CustomerSavedView>(
  customerSavedViews.map((view) => view.value),
);
const typeValues = new Set<CustomerTypeFilter>([
  "all",
  "individual",
  "stylist",
  "reseller",
  "walk-in",
]);
const sortValues = new Set<CustomerSortKey>(
  customerSortOptions.map((option) => option.value),
);

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  const params = await searchParams;
  const requestedCustomer = first(params.customer);
  const initialOpenCustomerId = activeControlRoomSeed.customers.some(
    (customer) => customer.id === requestedCustomer,
  )
    ? requestedCustomer ?? null
    : null;

  return (
    <CustomersWorkspace
      initialOpenCustomerId={initialOpenCustomerId}
      initialQuery={{
        ...defaultCustomerQuery,
        view: pick(first(params.view), viewValues, "all"),
        search: first(params.q) ?? "",
        type: pick(first(params.type), typeValues, "all"),
        sort: pick(first(params.sort), sortValues, "spend-desc"),
      }}
    />
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pick<TValue extends string>(
  value: string | undefined,
  allowed: Set<TValue>,
  fallback: TValue,
): TValue {
  return value && allowed.has(value as TValue) ? (value as TValue) : fallback;
}