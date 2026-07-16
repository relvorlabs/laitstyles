"use client";

import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { HoldControls } from "@/features/admin/holds/hold-controls";
import { HoldDetailSheet } from "@/features/admin/holds/hold-detail-sheet";
import { HoldSavedViews } from "@/features/admin/holds/hold-saved-views";
import {
  defaultHoldQuery,
  getHoldSavedViewCounts,
  getHoldWorkspaceSummary,
  queryHolds,
} from "@/features/admin/holds/hold-selectors";
import type { HoldQuery } from "@/features/admin/holds/hold-types";
import { HoldsEmptyState } from "@/features/admin/holds/holds-empty-state";
import { HoldsHeader } from "@/features/admin/holds/holds-header";
import { HoldsMobileList } from "@/features/admin/holds/holds-mobile-list";
import { HoldsSummaryStrip } from "@/features/admin/holds/holds-summary-strip";
import { HoldsTable } from "@/features/admin/holds/holds-table";
import { buildHoldsHref } from "@/features/admin/holds/holds-url";
import { useAdmin } from "@/features/admin/state/admin-provider";
import type { ConvertHoldInput } from "@/lib/admin/shared/types";

export type HoldActionFeedback = {
  tone: "success" | "error";
  title: string;
  message: string;
};

export function HoldsWorkspace({
  initialQuery,
  initialOpenHoldId,
}: {
  initialQuery: HoldQuery;
  initialOpenHoldId: string | null;
}) {
  const pathname = usePathname();
  const { state, extendHold, releaseHold, convertHold } = useAdmin();
  const [query, setQuery] = useState(initialQuery);
  const [openHoldId, setOpenHoldId] = useState<string | null>(initialOpenHoldId);
  const [feedback, setFeedback] = useState<HoldActionFeedback | null>(null);

  const holds = useMemo(() => queryHolds(state, query), [query, state]);
  const counts = useMemo(() => getHoldSavedViewCounts(state), [state]);
  const summary = useMemo(() => getHoldWorkspaceSummary(state), [state]);
  const openHold = state.holds.find((hold) => hold.id === openHoldId) ?? null;

  function replaceUrl(nextQuery = query, nextHoldId = openHoldId) {
    window.history.replaceState(
      null,
      "",
      buildHoldsHref(pathname, {
        query: nextQuery,
        holdId: nextHoldId,
      }),
    );
  }

  function patchQuery(patch: Partial<HoldQuery>) {
    const nextQuery = { ...query, ...patch };
    setQuery(nextQuery);
    setFeedback(null);
    replaceUrl(nextQuery);
  }

  function resetQuery() {
    setQuery(defaultHoldQuery);
    setFeedback(null);
    replaceUrl(defaultHoldQuery);
  }

  function openHoldRecord(holdId: string) {
    setOpenHoldId(holdId);
    setFeedback(null);
    replaceUrl(query, holdId);
  }

  function closeHoldRecord() {
    setOpenHoldId(null);
    setFeedback(null);
    replaceUrl(query, null);
  }

  function showResult(
    result:
      | ReturnType<typeof extendHold>
      | ReturnType<typeof releaseHold>
      | ReturnType<typeof convertHold>,
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

    setFeedback({
      tone: "success",
      title: successTitle,
      message: result.value.message,
    });
    return null;
  }

  function extend(holdId: string, minutes: number) {
    return showResult(extendHold(holdId, minutes), "Hold extended");
  }

  function release(holdId: string) {
    return showResult(releaseHold(holdId), "Hold released");
  }

  function convert(input: ConvertHoldInput) {
    return showResult(convertHold(input), "Order created from hold");
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <HoldsHeader />
      <HoldsSummaryStrip summary={summary} />

      <Card className="gap-0 overflow-hidden py-0">
        <HoldSavedViews
          counts={counts}
          onChange={(view) => patchQuery({ view })}
          value={query.view}
        />
        <HoldControls
          onQueryChange={patchQuery}
          onReset={resetQuery}
          query={query}
          resultCount={holds.length}
        />
      </Card>

      {holds.length ? (
        <>
          <HoldsMobileList holds={holds} onOpen={openHoldRecord} state={state} />
          <HoldsTable holds={holds} onOpen={openHoldRecord} state={state} />
        </>
      ) : (
        <HoldsEmptyState hasHolds={state.holds.length > 0} onReset={resetQuery} />
      )}

      <HoldDetailSheet
        feedback={feedback}
        hold={openHold}
        onConvert={convert}
        onExtend={extend}
        onOpenChange={(open) => {
          if (!open) closeHoldRecord();
        }}
        onRelease={release}
        state={state}
      />
    </div>
  );
}
