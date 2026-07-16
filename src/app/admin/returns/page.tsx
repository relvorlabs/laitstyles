import {
  defaultReturnQuery,
  returnSavedViews,
  returnStatuses,
} from "@/features/admin/returns/return-selectors";
import type { ReturnSavedView, ReturnSortKey } from "@/features/admin/returns/return-types";
import { ReturnsWorkspace } from "@/features/admin/returns/returns-workspace";
import { activeAdminSeed } from "@/lib/admin/shared/admin-seed";
import type { ReturnStatus } from "@/lib/admin/shared/types";

type ReturnsPageProps = {
  searchParams: Promise<{
    view?: string | string[];
    q?: string | string[];
    status?: string | string[];
    sort?: string | string[];
    return?: string | string[];
  }>;
};

const viewValues = new Set<ReturnSavedView>(returnSavedViews.map((view) => view.value));
const statusValues = new Set<ReturnStatus>(returnStatuses);
const sortValues = new Set<ReturnSortKey>(["updated-desc", "requested-desc", "value-desc"]);

export default async function ReturnsPage({ searchParams }: ReturnsPageProps) {
  const params = await searchParams;
  const requestedReturn = first(params.return);
  const initialOpenReturnId = (activeAdminSeed.returns ?? []).some(
    (record) => record.id === requestedReturn,
  )
    ? (requestedReturn ?? null)
    : null;

  return (
    <ReturnsWorkspace
      initialOpenReturnId={initialOpenReturnId}
      initialQuery={{
        ...defaultReturnQuery,
        view: pick(first(params.view), viewValues, "all"),
        search: first(params.q) ?? "",
        status: pickWithAll(first(params.status), statusValues),
        sort: pick(first(params.sort), sortValues, "updated-desc"),
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

function pickWithAll<TValue extends string>(
  value: string | undefined,
  allowed: Set<TValue>,
): TValue | "all" {
  if (!value || value === "all") return "all";
  return allowed.has(value as TValue) ? (value as TValue) : "all";
}
