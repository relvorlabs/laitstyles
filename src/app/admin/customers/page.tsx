import {
  customerSavedViews,
  customerSortOptions,
  defaultCustomerQuery,
} from "@/features/admin/customers/customer-selectors";
import type {
  CustomerSavedView,
  CustomerSortKey,
  CustomerTypeFilter,
} from "@/features/admin/customers/customer-types";
import { CustomersWorkspace } from "@/features/admin/customers/customers-workspace";

const viewValues = new Set<CustomerSavedView>(customerSavedViews.map((view) => view.value));
const typeValues = new Set<CustomerTypeFilter>([
  "all",
  "individual",
  "stylist",
  "reseller",
  "walk-in",
]);
const sortValues = new Set<CustomerSortKey>(customerSortOptions.map((option) => option.value));
const pageSizeValues = new Set([10, 25, 50, 100]);

type CustomersPageProps = {
  searchParams: Promise<{
    view?: string | string[];
    q?: string | string[];
    type?: string | string[];
    sort?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
    customer?: string | string[];
  }>;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  return (
    <CustomersWorkspace
      initialQuery={{
        ...defaultCustomerQuery,
        view: pick(first(params.view), viewValues, "all"),
        search: first(params.q) ?? "",
        type: pick(first(params.type), typeValues, "all"),
        sort: pick(first(params.sort), sortValues, "spend-desc"),
        page: positiveInteger(first(params.page), 1),
        pageSize: pickNumber(first(params.pageSize), pageSizeValues, 25),
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

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function pickNumber(value: string | undefined, allowed: Set<number>, fallback: number) {
  const parsed = Number(value);
  return allowed.has(parsed) ? parsed : fallback;
}
