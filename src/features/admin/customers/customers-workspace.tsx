"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { CustomerControls } from "@/features/admin/customers/customer-controls";
import { CustomerDetailSheet } from "@/features/admin/customers/customer-detail-sheet";
import { CustomerSavedViews } from "@/features/admin/customers/customer-saved-views";
import {
  customerSavedViews,
  customerSortOptions,
  defaultCustomerQuery,
} from "@/features/admin/customers/customer-selectors";
import type {
  CustomerActionFeedback,
  CustomerQuery,
  CustomerSavedView,
  CustomerSortKey,
  CustomerTypeFilter,
} from "@/features/admin/customers/customer-types";
import { CustomersEmptyState } from "@/features/admin/customers/customers-empty-state";
import { CustomersHeader } from "@/features/admin/customers/customers-header";
import { CustomersMobileList } from "@/features/admin/customers/customers-mobile-list";
import { CustomersSummaryStrip } from "@/features/admin/customers/customers-summary-strip";
import { CustomersTable } from "@/features/admin/customers/customers-table";
import { buildCustomersHref } from "@/features/admin/customers/customers-url";
import { AdminPagination } from "@/features/admin/shared/admin-pagination";
import {
  adminCustomerQueryOptions,
  adminCustomersQueryOptions,
  useAddCustomerNote,
} from "@/modules/customers/client/hooks";
import type { CustomerSavedViewCounts, CustomerWorkspaceSummary } from "@/modules/customers/types";

const emptyCounts: CustomerSavedViewCounts = {
  all: 0,
  "needs-attention": 0,
  returning: 0,
  "high-value": 0,
  new: 0,
};
const emptySummary: CustomerWorkspaceSummary = {
  totalCustomers: 0,
  relationshipValue: 0,
  needsAttention: 0,
  returningCustomers: 0,
  activeHolds: 0,
};
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

type SearchParamsReader = { get(name: string): string | null };

export function CustomersWorkspace({ initialQuery }: { initialQuery: CustomerQuery }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const addNoteMutation = useAddCustomerNote();
  const [feedback, setFeedback] = useState<CustomerActionFeedback | null>(null);

  const query = useMemo(
    () => readQueryFromUrl(searchParams, initialQuery),
    [initialQuery, searchParams],
  );
  const openCustomerId = searchParams.get("customer")?.trim() || null;
  const customersQuery = useQuery(adminCustomersQueryOptions(query));
  const detailQuery = useQuery(adminCustomerQueryOptions(openCustomerId ?? ""));
  const profiles = customersQuery.data?.data ?? [];
  const meta = customersQuery.data?.meta;
  const counts = meta?.counts ?? emptyCounts;
  const summary = meta?.summary ?? emptySummary;
  const openProfile = detailQuery.data ?? null;

  function replaceUrl(nextQuery = query, nextCustomerId = openCustomerId) {
    router.replace(buildCustomersHref(pathname, { query: nextQuery, customerId: nextCustomerId }), {
      scroll: false,
    });
  }

  function patchQuery(patch: Partial<CustomerQuery>) {
    const affectsResultSet = Object.keys(patch).some((key) => key !== "page");
    const nextQuery = {
      ...query,
      ...patch,
      ...(affectsResultSet ? { page: 1 } : {}),
    };
    setFeedback(null);
    replaceUrl(nextQuery);
  }

  function resetQuery() {
    setFeedback(null);
    replaceUrl(defaultCustomerQuery);
  }

  function openCustomer(customerId: string) {
    setFeedback(null);
    replaceUrl(query, customerId);
  }

  function closeCustomer() {
    setFeedback(null);
    replaceUrl(query, null);
  }

  async function saveCustomerNote(customerId: string, body: string) {
    const result = await addNoteMutation.mutateAsync({ customerId, body });
    if (!result.ok) {
      setFeedback({
        tone: "error",
        title: "Note could not be saved",
        message: result.error.message,
      });
      return result.error.message;
    }

    setFeedback({
      tone: "success",
      title: "Internal note saved",
      message: result.value.message,
    });
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <CustomersHeader />
      <CustomersSummaryStrip summary={summary} />

      <Card className="gap-0 overflow-hidden py-0">
        <CustomerSavedViews
          counts={counts}
          onChange={(view) => patchQuery({ view })}
          value={query.view}
        />
        <CustomerControls
          onQueryChange={patchQuery}
          onReset={resetQuery}
          query={query}
          resultCount={meta?.total ?? profiles.length}
        />
      </Card>

      {feedback ? (
        <Alert aria-live="polite" variant={feedback.tone === "error" ? "destructive" : "default"}>
          <AlertTitle>{feedback.title}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}

      {customersQuery.isError ? (
        <Alert aria-live="polite" variant="destructive">
          <AlertTitle>Customers could not be loaded</AlertTitle>
          <AlertDescription>
            {customersQuery.error instanceof Error
              ? customersQuery.error.message
              : "Refresh and try loading the persisted customer relationships again."}
          </AlertDescription>
        </Alert>
      ) : null}

      {profiles.length ? (
        <>
          <CustomersMobileList onOpen={openCustomer} profiles={profiles} />
          <CustomersTable onOpen={openCustomer} profiles={profiles} />
          {meta ? (
            <AdminPagination
              noun="Customers"
              onPageChange={(page) => patchQuery({ page })}
              onPageSizeChange={(pageSize) => patchQuery({ pageSize })}
              page={meta.page}
              pageCount={meta.pageCount}
              pageSize={meta.pageSize}
              totalItems={meta.total}
            />
          ) : null}
        </>
      ) : customersQuery.isPending ? (
        <p className="rounded-[18px] border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
          Loading customers…
        </p>
      ) : (
        <CustomersEmptyState hasCustomers={summary.totalCustomers > 0} onReset={resetQuery} />
      )}

      <CustomerDetailSheet
        feedback={feedback}
        onAddNote={saveCustomerNote}
        onOpenChange={(open) => {
          if (!open) closeCustomer();
        }}
        profile={openProfile}
      />
    </div>
  );
}

function readQueryFromUrl(
  searchParams: SearchParamsReader,
  fallback: CustomerQuery,
): CustomerQuery {
  return {
    view: pick(searchParams.get("view"), viewValues, fallback.view),
    search: searchParams.get("q") ?? fallback.search,
    type: pick(searchParams.get("type"), typeValues, fallback.type),
    sort: pick(searchParams.get("sort"), sortValues, fallback.sort),
    page: positiveInteger(searchParams.get("page"), fallback.page),
    pageSize: pickNumber(searchParams.get("pageSize"), pageSizeValues, fallback.pageSize),
  };
}

function pick<TValue extends string>(
  value: string | null,
  allowed: Set<TValue>,
  fallback: TValue,
): TValue {
  return value && allowed.has(value as TValue) ? (value as TValue) : fallback;
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function pickNumber(value: string | null, allowed: Set<number>, fallback: number) {
  const parsed = Number(value);
  return allowed.has(parsed) ? parsed : fallback;
}
