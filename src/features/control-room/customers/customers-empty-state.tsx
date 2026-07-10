"use client";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export function CustomersEmptyState({
  hasCustomers,
  onReset,
}: {
  hasCustomers: boolean;
  onReset: () => void;
}) {
  return (
    <Empty className="min-h-[320px] border border-border bg-card">
      <EmptyHeader>
        <EmptyTitle className="font-serif text-[28px] font-medium">
          {hasCustomers ? "No customers match this view" : "No customer relationships yet"}
        </EmptyTitle>
        <EmptyDescription>
          {hasCustomers
            ? "Reset the search and filters to return to the full relationship ledger."
            : "Customers will appear here when an order, hold or recorded sale is attached to them."}
        </EmptyDescription>
      </EmptyHeader>
      {hasCustomers ? (
        <EmptyContent>
          <Button onClick={onReset} type="button" variant="outline">
            Reset customer filters
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}