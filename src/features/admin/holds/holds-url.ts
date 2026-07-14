import { defaultHoldQuery } from "@/features/control-room/holds/hold-selectors";
import type { HoldQuery } from "@/features/control-room/holds/hold-types";

export function buildHoldsHref(
  pathname: string,
  {
    query,
    holdId,
  }: {
    query: HoldQuery;
    holdId: string | null;
  },
) {
  const params = new URLSearchParams();
  if (query.view !== defaultHoldQuery.view) params.set("view", query.view);
  if (query.search) params.set("q", query.search);
  if (query.source !== defaultHoldQuery.source) {
    params.set("source", query.source);
  }
  if (query.stage !== defaultHoldQuery.stage) params.set("stage", query.stage);
  if (query.sort !== defaultHoldQuery.sort) params.set("sort", query.sort);
  if (holdId) params.set("hold", holdId);

  const suffix = params.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}
