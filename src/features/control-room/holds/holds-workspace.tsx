"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { HoldControls } from "@/features/control-room/holds/hold-controls";
import { HoldDetailSheet } from "@/features/control-room/holds/hold-detail-sheet";
import { HoldSavedViews } from "@/features/control-room/holds/hold-saved-views";
import {
  defaultHoldQuery,
  getHoldSavedViewCounts,
  getHoldWorkspaceSummary,
  queryHolds,
} from "@/features/control-room/holds/hold-selectors";
import type { HoldQuery } from "@/features/control-room/holds/hold-types";
import { HoldsEmptyState } from "@/features/control-room/holds/holds-empty-state";
import { HoldsHeader } from "@/features/control-room/holds/holds-header";
import { HoldsMobileList } from "@/features/control-room/holds/holds-mobile-list";
import { HoldsSummaryStrip } from "@/features/control-room/holds/holds-summary-strip";
import { HoldsTable } from "@/features/control-room/holds/holds-table";
import { buildHoldsHref } from "@/features/control-room/holds/holds-url";
import { useControlRoom } from "@/features/control-room/state/control-room-provider";
import type { ConvertHoldInput } from "@/lib/control-room/types";

export function HoldsWorkspace({
  initialQuery,
  initialOpenHoldId,
}: {
  initialQuery: HoldQuery;
  initialOpenHoldId: string | null;
}) {
  const pathname = usePathname();
  const { state, extendHold, releaseHold, convertHold } = useControlRoom();
  const [query, setQuery] = useState(initialQuery);
  const [openHoldId, setOpenHoldId] = useState<string | null>(
    initialOpenHoldId,
  );
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

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
      return;
    }

    setFeedback({
      tone: "success",
      title: successTitle,
      message: result.value.message,
    });
  }

  function extend(holdId: string, minutes: number) {
    showResult(extendHold(holdId, minutes), "Hold extended");
  }

  function release(holdId: string) {
    showResult(releaseHold(holdId), "Hold released");
  }

  function convert(input: ConvertHoldInput) {
    showResult(convertHold(input), "Order created from hold");
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

      {feedback ? (
        <Alert
          aria-live="polite"
          variant={feedback.tone === "error" ? "destructive" : "default"}
        >
          <AlertTitle>{feedback.title}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}

      {holds.length ? (
        <>
          <HoldsMobileList
            holds={holds}
            onOpen={openHoldRecord}
            state={state}
          />
          <HoldsTable
            holds={holds}
            onOpen={openHoldRecord}
            state={state}
          />
        </>
      ) : (
        <HoldsEmptyState
          hasHolds={state.holds.length > 0}
          onReset={resetQuery}
        />
      )}

      <HoldDetailSheet
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
