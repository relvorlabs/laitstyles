import {
  defaultHoldQuery,
  holdSavedViews,
  holdSortOptions,
} from "@/features/admin/holds/hold-selectors";
import type {
  HoldSavedView,
  HoldSortKey,
  HoldSourceFilter,
  HoldStageFilter,
} from "@/features/admin/holds/hold-types";
import { HoldsWorkspace } from "@/features/admin/holds/holds-workspace";
import { activeAdminSeed } from "@/lib/admin/admin-seed";

type HoldsPageProps = {
  searchParams: Promise<{
    view?: string | string[];
    q?: string | string[];
    source?: string | string[];
    stage?: string | string[];
    sort?: string | string[];
    hold?: string | string[];
  }>;
};

const viewValues = new Set<HoldSavedView>(holdSavedViews.map((view) => view.value));
const sourceValues = new Set<HoldSourceFilter>(["all", "storefront", "assisted"]);
const stageValues = new Set<HoldStageFilter>(["all", "product", "cart", "checkout", "payment"]);
const sortValues = new Set<HoldSortKey>(holdSortOptions.map((option) => option.value));

export default async function HoldsPage({ searchParams }: HoldsPageProps) {
  const params = await searchParams;
  const requestedHold = first(params.hold);
  const initialOpenHoldId = activeAdminSeed.holds.some((hold) => hold.id === requestedHold)
    ? (requestedHold ?? null)
    : null;

  return (
    <HoldsWorkspace
      initialOpenHoldId={initialOpenHoldId}
      initialQuery={{
        ...defaultHoldQuery,
        view: pick(first(params.view), viewValues, "all"),
        search: first(params.q) ?? "",
        source: pick(first(params.source), sourceValues, "all"),
        stage: pick(first(params.stage), stageValues, "all"),
        sort: pick(first(params.sort), sortValues, "expiry-asc"),
      }}
    />
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pick<TValue extends string>(
  value: string | undefined,
  allowed: Set<TValue>,
  fallback: TValue,
): TValue {
  return value && allowed.has(value as TValue) ? (value as TValue) : fallback;
}
