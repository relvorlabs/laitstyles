"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/card";
import { CustomerControls } from "@/features/control-room/customers/customer-controls";
import { CustomerDetailSheet } from "@/features/control-room/customers/customer-detail-sheet";
import { CustomerSavedViews } from "@/features/control-room/customers/customer-saved-views";
import {
  defaultCustomerQuery,
  getCustomerSavedViewCounts,
  getCustomerWorkspaceSummary,
  queryCustomers,
} from "@/features/control-room/customers/customer-selectors";
import type {
  CustomerActionFeedback,
  CustomerQuery,
} from "@/features/control-room/customers/customer-types";
import { CustomersEmptyState } from "@/features/control-room/customers/customers-empty-state";
import { CustomersHeader } from "@/features/control-room/customers/customers-header";
import { CustomersMobileList } from "@/features/control-room/customers/customers-mobile-list";
import { CustomersSummaryStrip } from "@/features/control-room/customers/customers-summary-strip";
import { CustomersTable } from "@/features/control-room/customers/customers-table";
import { buildCustomersHref } from "@/features/control-room/customers/customers-url";
import { useControlRoom } from "@/features/control-room/state/control-room-provider";
import { getCustomerRelationshipProfiles } from "@/lib/control-room/customer-selectors";

export function CustomersWorkspace({
  initialQuery,
  initialOpenCustomerId,
}: {
  initialQuery: CustomerQuery;
  initialOpenCustomerId: string | null;
}) {
  const pathname = usePathname();
  const { state, addCustomerNote } = useControlRoom();
  const [query, setQuery] = useState(initialQuery);
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(
    initialOpenCustomerId,
  );
  const [feedback, setFeedback] = useState<CustomerActionFeedback | null>(null);

  const allProfiles = useMemo(
    () => getCustomerRelationshipProfiles(state),
    [state],
  );
  const profiles = useMemo(
    () => queryCustomers(state, query, allProfiles),
    [allProfiles, query, state],
  );
  const counts = useMemo(
    () => getCustomerSavedViewCounts(allProfiles),
    [allProfiles],
  );
  const summary = useMemo(
    () => getCustomerWorkspaceSummary(state, allProfiles),
    [allProfiles, state],
  );
  const openProfile =
    allProfiles.find((profile) => profile.customer.id === openCustomerId) ?? null;

  function replaceUrl(
    nextQuery = query,
    nextCustomerId = openCustomerId,
  ) {
    window.history.replaceState(
      null,
      "",
      buildCustomersHref(pathname, {
        query: nextQuery,
        customerId: nextCustomerId,
      }),
    );
  }

  function patchQuery(patch: Partial<CustomerQuery>) {
    const nextQuery = { ...query, ...patch };
    setQuery(nextQuery);
    setFeedback(null);
    replaceUrl(nextQuery);
  }

  function resetQuery() {
    setQuery(defaultCustomerQuery);
    setFeedback(null);
    replaceUrl(defaultCustomerQuery);
  }

  function openCustomer(customerId: string) {
    setOpenCustomerId(customerId);
    setFeedback(null);
    replaceUrl(query, customerId);
  }

  function closeCustomer() {
    setOpenCustomerId(null);
    setFeedback(null);
    replaceUrl(query, null);
  }

  function saveCustomerNote(customerId: string, body: string) {
    const result = addCustomerNote({ customerId, body });
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
          resultCount={profiles.length}
        />
      </Card>

      {profiles.length ? (
        <>
          <CustomersMobileList onOpen={openCustomer} profiles={profiles} />
          <CustomersTable onOpen={openCustomer} profiles={profiles} />
        </>
      ) : (
        <CustomersEmptyState
          hasCustomers={state.customers.length > 0}
          onReset={resetQuery}
        />
      )}

      <CustomerDetailSheet
        feedback={feedback}
        onAddNote={saveCustomerNote}
        onOpenChange={(open) => {
          if (!open) closeCustomer();
        }}
        profile={openProfile}
        state={state}
      />
    </div>
  );
}