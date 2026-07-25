"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { HoldControls } from "@/features/admin/holds/hold-controls";
import { HoldDetailSheet } from "@/features/admin/holds/hold-detail-sheet";
import { HoldSavedViews } from "@/features/admin/holds/hold-saved-views";
import {
  defaultHoldQuery,
  holdSavedViews,
  holdSortOptions,
} from "@/features/admin/holds/hold-selectors";
import type {
  HoldQuery,
  HoldSavedView,
  HoldSortKey,
  HoldSourceFilter,
  HoldStageFilter,
} from "@/features/admin/holds/hold-types";
import { HoldsEmptyState } from "@/features/admin/holds/holds-empty-state";
import { HoldsHeader } from "@/features/admin/holds/holds-header";
import { HoldsMobileList } from "@/features/admin/holds/holds-mobile-list";
import { HoldsSummaryStrip } from "@/features/admin/holds/holds-summary-strip";
import { HoldsTable } from "@/features/admin/holds/holds-table";
import { buildHoldsHref } from "@/features/admin/holds/holds-url";
import { useHoldClock } from "@/features/admin/holds/use-hold-clock";
import { AdminPagination } from "@/features/admin/shared/admin-pagination";
import {
  adminHoldQueryOptions,
  adminHoldsQueryOptions,
  useConvertHold,
  useExtendHold,
  useReleaseHold,
} from "@/modules/holds/client/hooks";
import type {
  ConvertHoldInput,
  HoldSavedViewCounts,
  HoldWorkspaceSummary,
} from "@/modules/holds/types";

export type HoldActionFeedback = {
  tone: "success" | "error";
  title: string;
  message: string;
};

const emptyCounts: HoldSavedViewCounts = {
  all: 0,
  active: 0,
  expiring: 0,
  "payment-risk": 0,
  expired: 0,
};
const emptySummary: HoldWorkspaceSummary = {
  totalHolds: 0,
  activeHolds: 0,
  expiringHolds: 0,
  paymentRisk: 0,
  expiredHolds: 0,
  reservedUnits: 0,
};
const viewValues = new Set<HoldSavedView>(holdSavedViews.map((view) => view.value));
const sourceValues = new Set<HoldSourceFilter>(["all", "storefront", "assisted"]);
const stageValues = new Set<HoldStageFilter>(["all", "product", "cart", "checkout", "payment"]);
const sortValues = new Set<HoldSortKey>(holdSortOptions.map((option) => option.value));
const pageSizeValues = new Set([10, 25, 50, 100]);

type SearchParamsReader = { get(name: string): string | null };

export function HoldsWorkspace({ initialQuery }: { initialQuery: HoldQuery }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = useHoldClock();
  const extendHoldMutation = useExtendHold();
  const releaseHoldMutation = useReleaseHold();
  const convertHoldMutation = useConvertHold();
  const [feedback, setFeedback] = useState<HoldActionFeedback | null>(null);

  const query = useMemo(
    () => readQueryFromUrl(searchParams, initialQuery),
    [initialQuery, searchParams],
  );
  const openHoldId = searchParams.get("hold")?.trim() || null;
  const holdsQuery = useQuery(adminHoldsQueryOptions(query));
  const detailQuery = useQuery(adminHoldQueryOptions(openHoldId ?? ""));
  const holds = holdsQuery.data?.data ?? [];
  const meta = holdsQuery.data?.meta;
  const counts = meta?.counts ?? emptyCounts;
  const summary = meta?.summary ?? emptySummary;
  const openHold = detailQuery.data ?? null;

  function replaceUrl(nextQuery = query, nextHoldId = openHoldId) {
    router.replace(buildHoldsHref(pathname, { query: nextQuery, holdId: nextHoldId }), {
      scroll: false,
    });
  }

  function patchQuery(patch: Partial<HoldQuery>) {
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
    replaceUrl(defaultHoldQuery);
  }

  function openHoldRecord(holdId: string) {
    setFeedback(null);
    replaceUrl(query, holdId);
  }

  function closeHoldRecord() {
    setFeedback(null);
    replaceUrl(query, null);
  }

  function showResult(
    result: Awaited<
      | ReturnType<typeof extendHoldMutation.mutateAsync>
      | ReturnType<typeof releaseHoldMutation.mutateAsync>
      | ReturnType<typeof convertHoldMutation.mutateAsync>
    >,
    successTitle: string,
  ) {
    if (!result.ok) {
      setFeedback({
        tone: "error",
        title: "Hold action could not be completed",
        message: result.error.message,
      });
      return result.error.message;
    }
    setFeedback({ tone: "success", title: successTitle, message: result.value.message });
    return null;
  }

  async function extend(holdId: string, minutes: number) {
    return showResult(await extendHoldMutation.mutateAsync({ holdId, minutes }), "Hold extended");
  }

  async function release(holdId: string) {
    return showResult(await releaseHoldMutation.mutateAsync(holdId), "Hold released");
  }

  async function convert(input: ConvertHoldInput & { holdId: string }) {
    return showResult(await convertHoldMutation.mutateAsync(input), "Order created from hold");
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <HoldsHeader />
      <HoldsSummaryStrip summary={summary} />

      <Card className="gap-0 overflow-hidden py-0">
        <HoldSavedViews counts={counts} onChange={(view) => patchQuery({ view })} value={query.view} />
        <HoldControls
          onQueryChange={patchQuery}
          onReset={resetQuery}
          query={query}
          resultCount={meta?.total ?? holds.length}
        />
      </Card>

      {feedback ? (
        <Alert aria-live="polite" variant={feedback.tone === "error" ? "destructive" : "default"}>
          <AlertTitle>{feedback.title}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}

      {holdsQuery.isError ? (
        <Alert aria-live="polite" variant="destructive">
          <AlertTitle>Holds could not be loaded</AlertTitle>
          <AlertDescription>
            {holdsQuery.error instanceof Error
              ? holdsQuery.error.message
              : "Refresh and try loading the persisted holds again."}
          </AlertDescription>
        </Alert>
      ) : null}

      {holds.length ? (
        <>
          <HoldsMobileList holds={holds} now={now} onOpen={openHoldRecord} />
          <HoldsTable holds={holds} now={now} onOpen={openHoldRecord} />
          {meta ? (
            <AdminPagination
              noun="Holds"
              onPageChange={(page) => patchQuery({ page })}
              onPageSizeChange={(pageSize) => patchQuery({ pageSize })}
              page={meta.page}
              pageCount={meta.pageCount}
              pageSize={meta.pageSize}
              totalItems={meta.total}
            />
          ) : null}
        </>
      ) : holdsQuery.isPending ? (
        <p className="rounded-[18px] border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
          Loading holds…
        </p>
      ) : (
        <HoldsEmptyState hasHolds={summary.totalHolds > 0} onReset={resetQuery} />
      )}

      <HoldDetailSheet
        feedback={feedback}
        hold={openHold}
        now={now}
        onConvert={convert}
        onExtend={extend}
        onOpenChange={(open) => {
          if (!open) closeHoldRecord();
        }}
        onRelease={release}
      />
    </div>
  );
}

function readQueryFromUrl(searchParams: SearchParamsReader, fallback: HoldQuery): HoldQuery {
  return {
    view: pick(searchParams.get("view"), viewValues, fallback.view),
    search: searchParams.get("q") ?? fallback.search,
    source: pick(searchParams.get("source"), sourceValues, fallback.source),
    stage: pick(searchParams.get("stage"), stageValues, fallback.stage),
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
