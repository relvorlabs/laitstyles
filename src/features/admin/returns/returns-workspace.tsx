"use client";

import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { CreateReturnDialog } from "@/features/control-room/returns/create-return-dialog";
import { ReturnControls } from "@/features/control-room/returns/return-controls";
import { ReturnDetailSheet } from "@/features/control-room/returns/return-detail-sheet";
import { ReturnSavedViews } from "@/features/control-room/returns/return-saved-views";
import {
  defaultReturnQuery,
  getReturnSavedViewCounts,
  getReturnWorkspaceSummary,
  queryReturns,
} from "@/features/control-room/returns/return-selectors";
import type {
  ReturnActionFeedback,
  ReturnQuery,
} from "@/features/control-room/returns/return-types";
import { ReturnsEmptyState } from "@/features/control-room/returns/returns-empty-state";
import { ReturnsHeader } from "@/features/control-room/returns/returns-header";
import { ReturnsMobileList } from "@/features/control-room/returns/returns-mobile-list";
import { ReturnsSummaryStrip } from "@/features/control-room/returns/returns-summary-strip";
import { ReturnsTable } from "@/features/control-room/returns/returns-table";
import { buildReturnsHref } from "@/features/control-room/returns/returns-url";
import { useControlRoom } from "@/features/control-room/state/control-room-provider";
import type { CreateReturnInput, ReturnStatus } from "@/lib/control-room/types";

export function ReturnsWorkspace({
  initialQuery,
  initialOpenReturnId,
}: {
  initialQuery: ReturnQuery;
  initialOpenReturnId: string | null;
}) {
  const pathname = usePathname();
  const { state, createReturn, transitionReturn } = useControlRoom();
  const [query, setQuery] = useState(initialQuery);
  const [openReturnId, setOpenReturnId] = useState<string | null>(initialOpenReturnId);
  const [createOpen, setCreateOpen] = useState(false);
  const [feedback, setFeedback] = useState<ReturnActionFeedback | null>(null);

  const returns = useMemo(() => queryReturns(state, query), [query, state]);
  const counts = useMemo(() => getReturnSavedViewCounts(state), [state]);
  const summary = useMemo(() => getReturnWorkspaceSummary(state), [state]);
  const openReturn = (state.returns ?? []).find((record) => record.id === openReturnId) ?? null;

  function replaceUrl(nextQuery = query, nextReturnId = openReturnId) {
    window.history.replaceState(
      null,
      "",
      buildReturnsHref(pathname, {
        query: nextQuery,
        returnId: nextReturnId,
      }),
    );
  }

  function patchQuery(patch: Partial<ReturnQuery>) {
    const nextQuery = { ...query, ...patch };
    setQuery(nextQuery);
    setFeedback(null);
    replaceUrl(nextQuery);
  }

  function resetQuery() {
    setQuery(defaultReturnQuery);
    setFeedback(null);
    replaceUrl(defaultReturnQuery);
  }

  function openCreateDialog() {
    setFeedback(null);
    setCreateOpen(true);
  }

  function openReturnRecord(returnId: string) {
    setOpenReturnId(returnId);
    setFeedback(null);
    replaceUrl(query, returnId);
  }

  function closeReturnRecord() {
    setOpenReturnId(null);
    setFeedback(null);
    replaceUrl(query, null);
  }

  function create(input: CreateReturnInput) {
    const result = createReturn(input);
    if (!result.ok) {
      setFeedback({
        tone: "error",
        title: "Return could not be opened",
        message: result.error.message,
      });
      return result.error.message;
    }

    setCreateOpen(false);
    setOpenReturnId(result.value.returnRecord.id);
    setFeedback({
      tone: "success",
      title: "Return opened",
      message: result.value.message,
    });
    replaceUrl(query, result.value.returnRecord.id);
    return null;
  }

  function transition(returnId: string, status: ReturnStatus) {
    const result = transitionReturn(returnId, status);
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
          resultCount={returns.length}
        />
      </Card>

      {returns.length ? (
        <>
          <ReturnsMobileList onOpen={openReturnRecord} returns={returns} state={state} />
          <ReturnsTable onOpen={openReturnRecord} returns={returns} state={state} />
        </>
      ) : (
        <ReturnsEmptyState
          hasReturns={(state.returns ?? []).length > 0}
          onCreate={openCreateDialog}
          onReset={resetQuery}
        />
      )}

      <CreateReturnDialog
        key={createOpen ? `return-open-${state.orders.length}` : "return-closed"}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setFeedback(null);
        }}
        onSubmit={create}
        open={createOpen}
        state={state}
      />

      <ReturnDetailSheet
        feedback={feedback}
        onOpenChange={(open) => {
          if (!open) closeReturnRecord();
        }}
        onTransition={transition}
        returnRecord={openReturn}
        state={state}
      />
    </div>
  );
}
