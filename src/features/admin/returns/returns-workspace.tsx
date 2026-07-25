"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { CreateReturnDialog } from "@/features/admin/returns/create-return-dialog";
import { ReturnControls } from "@/features/admin/returns/return-controls";
import { ReturnDetailSheet } from "@/features/admin/returns/return-detail-sheet";
import { ReturnSavedViews } from "@/features/admin/returns/return-saved-views";
import {
  defaultReturnQuery,
  returnSavedViews,
  returnSortOptions,
  returnStatuses,
} from "@/features/admin/returns/return-selectors";
import type {
  ReturnActionFeedback,
  ReturnQuery,
  ReturnSavedView,
  ReturnSortKey,
  ReturnStatus,
} from "@/features/admin/returns/return-types";
import { ReturnsEmptyState } from "@/features/admin/returns/returns-empty-state";
import { ReturnsHeader } from "@/features/admin/returns/returns-header";
import { ReturnsMobileList } from "@/features/admin/returns/returns-mobile-list";
import { ReturnsSummaryStrip } from "@/features/admin/returns/returns-summary-strip";
import { ReturnsTable } from "@/features/admin/returns/returns-table";
import { buildReturnsHref } from "@/features/admin/returns/returns-url";
import { AdminPagination } from "@/features/admin/shared/admin-pagination";
import {
  adminReturnQueryOptions,
  adminReturnsQueryOptions,
  eligibleReturnOrdersQueryOptions,
  useCreateReturn,
  useTransitionReturn,
} from "@/modules/returns/client/hooks";
import type {
  CreateReturnInput,
  ReturnSavedViewCounts,
  ReturnWorkspaceSummary,
} from "@/modules/returns/types";

const emptyCounts: ReturnSavedViewCounts = {
  all: 0,
  open: 0,
  "awaiting-item": 0,
  inspection: 0,
  refund: 0,
  resolved: 0,
};
const emptySummary: ReturnWorkspaceSummary = {
  totalReturns: 0,
  openReturns: 0,
  awaitingItem: 0,
  inspecting: 0,
  refundValue: 0,
};
const viewValues = new Set<ReturnSavedView>(returnSavedViews.map((view) => view.value));
const statusValues = new Set<ReturnStatus>(returnStatuses);
const sortValues = new Set<ReturnSortKey>(returnSortOptions.map((option) => option.value));
const pageSizeValues = new Set([10, 25, 50, 100]);

type SearchParamsReader = { get(name: string): string | null };

export function ReturnsWorkspace({ initialQuery }: { initialQuery: ReturnQuery }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const createReturnMutation = useCreateReturn();
  const transitionReturnMutation = useTransitionReturn();
  const [createOpen, setCreateOpen] = useState(false);
  const [feedback, setFeedback] = useState<ReturnActionFeedback | null>(null);

  const query = useMemo(
    () => readQueryFromUrl(searchParams, initialQuery),
    [initialQuery, searchParams],
  );
  const openReturnId = searchParams.get("return")?.trim() || null;
  const returnsQuery = useQuery(adminReturnsQueryOptions(query));
  const detailQuery = useQuery(adminReturnQueryOptions(openReturnId ?? ""));
  const eligibleOrdersQuery = useQuery(eligibleReturnOrdersQueryOptions(createOpen));
  const returns = returnsQuery.data?.data ?? [];
  const meta = returnsQuery.data?.meta;
  const counts = meta?.counts ?? emptyCounts;
  const summary = meta?.summary ?? emptySummary;
  const openReturn = detailQuery.data ?? null;
  const eligibleOrders = eligibleOrdersQuery.data ?? [];

  function replaceUrl(nextQuery = query, nextReturnId = openReturnId) {
    router.replace(buildReturnsHref(pathname, { query: nextQuery, returnId: nextReturnId }), {
      scroll: false,
    });
  }

  function patchQuery(patch: Partial<ReturnQuery>) {
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
    replaceUrl(defaultReturnQuery);
  }

  function openCreateDialog() {
    setFeedback(null);
    setCreateOpen(true);
  }

  function openReturnRecord(returnId: string) {
    setFeedback(null);
    replaceUrl(query, returnId);
  }

  function closeReturnRecord() {
    setFeedback(null);
    replaceUrl(query, null);
  }

  async function create(input: CreateReturnInput) {
    const result = await createReturnMutation.mutateAsync(input);
    if (!result.ok) {
      setFeedback({
        tone: "error",
        title: "Return could not be opened",
        message: result.error.message,
      });
      return result.error.message;
    }
    setCreateOpen(false);
    setFeedback({
      tone: "success",
      title: "Return opened",
      message: result.value.message,
    });
    replaceUrl(query, result.value.returnRecord.id);
    return null;
  }

  async function transition(returnId: string, status: ReturnStatus) {
    const result = await transitionReturnMutation.mutateAsync({ returnId, nextStatus: status });
    if (!result.ok) {
      setFeedback({
        tone: "error",
        title: "Return could not move",
        message: result.error.message,
      });
      return result.error.message;
    }
    setFeedback({
      tone: "success",
      title: "Return updated",
      message: result.value.message,
    });
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <ReturnsHeader onCreate={openCreateDialog} />
      <ReturnsSummaryStrip summary={summary} />

      <Card className="gap-0 overflow-hidden py-0">
        <ReturnSavedViews
          counts={counts}
          onChange={(view) => patchQuery({ view })}
          value={query.view}
        />
        <ReturnControls
          onQueryChange={patchQuery}
          onReset={resetQuery}
          query={query}
          resultCount={meta?.total ?? returns.length}
        />
      </Card>

      {feedback ? (
        <Alert aria-live="polite" variant={feedback.tone === "error" ? "destructive" : "default"}>
          <AlertTitle>{feedback.title}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}

      {returnsQuery.isError ? (
        <Alert aria-live="polite" variant="destructive">
          <AlertTitle>Returns could not be loaded</AlertTitle>
          <AlertDescription>
            {returnsQuery.error instanceof Error
              ? returnsQuery.error.message
              : "Refresh and try loading the persisted returns again."}
          </AlertDescription>
        </Alert>
      ) : null}

      {returns.length ? (
        <>
          <ReturnsMobileList onOpen={openReturnRecord} returns={returns} />
          <ReturnsTable onOpen={openReturnRecord} returns={returns} />
          {meta ? (
            <AdminPagination
              noun="Returns"
              onPageChange={(page) => patchQuery({ page })}
              onPageSizeChange={(pageSize) => patchQuery({ pageSize })}
              page={meta.page}
              pageCount={meta.pageCount}
              pageSize={meta.pageSize}
              totalItems={meta.total}
            />
          ) : null}
        </>
      ) : returnsQuery.isPending ? (
        <p className="rounded-[18px] border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
          Loading returns…
        </p>
      ) : (
        <ReturnsEmptyState
          hasReturns={summary.totalReturns > 0}
          onCreate={openCreateDialog}
          onReset={resetQuery}
        />
      )}

      <CreateReturnDialog
        key={createOpen ? `return-open-${eligibleOrders.length}` : "return-closed"}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setFeedback(null);
        }}
        onSubmit={create}
        open={createOpen}
        orders={eligibleOrders}
      />

      <ReturnDetailSheet
        feedback={feedback}
        onOpenChange={(open) => {
          if (!open) closeReturnRecord();
        }}
        onTransition={transition}
        returnRecord={openReturn}
      />
    </div>
  );
}

function readQueryFromUrl(searchParams: SearchParamsReader, fallback: ReturnQuery): ReturnQuery {
  return {
    view: pick(searchParams.get("view"), viewValues, fallback.view),
    search: searchParams.get("q") ?? fallback.search,
    status: pickWithAll(searchParams.get("status"), statusValues),
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

function pickWithAll<TValue extends string>(value: string | null, allowed: Set<TValue>): TValue | "all" {
  if (!value || value === "all") return "all";
  return allowed.has(value as TValue) ? (value as TValue) : "all";
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function pickNumber(value: string | null, allowed: Set<number>, fallback: number) {
  const parsed = Number(value);
  return allowed.has(parsed) ? parsed : fallback;
}
