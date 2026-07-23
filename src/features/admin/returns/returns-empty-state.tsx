"use client";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export function ReturnsEmptyState({
  hasReturns,
  onCreate,
  onReset,
}: {
  hasReturns: boolean;
  onCreate: () => void;
  onReset: () => void;
}) {
  return (
    <Empty className="rounded-[18px] border border-dashed border-border bg-card py-14">
      <EmptyHeader>
        <EmptyTitle>
          {hasReturns ? "No returns match this view" : "No return records yet"}
        </EmptyTitle>
        <EmptyDescription>
          {hasReturns
            ? "Reset the search and filters to see the full return queue."
            : "Start a return from an eligible delivered order when a customer sends an item back."}
        </EmptyDescription>
      </EmptyHeader>
      <div className="flex flex-wrap justify-center gap-2">
        {hasReturns ? (
          <Button onClick={onReset} type="button" variant="outline">
            Reset filters
          </Button>
        ) : null}
        <Button onClick={onCreate} type="button">
          Start return
        </Button>
      </div>
    </Empty>
  );
}
