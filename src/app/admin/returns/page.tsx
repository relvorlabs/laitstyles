import {
  defaultReturnQuery,
  returnSavedViews,
  returnStatuses,
} from "@/features/admin/returns/return-selectors";
import type {
  ReturnSavedView,
  ReturnSortKey,
  ReturnStatus,
} from "@/features/admin/returns/return-types";
import { ReturnsWorkspace } from "@/features/admin/returns/returns-workspace";

const viewValues = new Set<ReturnSavedView>(returnSavedViews.map((view) => view.value));
const statusValues = new Set<ReturnStatus>(returnStatuses);
const sortValues = new Set<ReturnSortKey>(["updated-desc", "requested-desc", "value-desc"]);
const pageSizeValues = new Set([10, 25, 50, 100]);

type ReturnsPageProps = {
  searchParams: Promise<{
    view?: string | string[];
    q?: string | string[];
    status?: string | string[];
    sort?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
    return?: string | string[];
  }>;
};

export default async function ReturnsPage({ searchParams }: ReturnsPageProps) {
  const params = await searchParams;
  return (
    <ReturnsWorkspace
      initialQuery={{
        ...defaultReturnQuery,
        view: pick(first(params.view), viewValues, "all"),
        search: first(params.q) ?? "",
        status: pickWithAll(first(params.status), statusValues),
        sort: pick(first(params.sort), sortValues, "updated-desc"),
        page: positiveInteger(first(params.page), 1),
        pageSize: pickNumber(first(params.pageSize), pageSizeValues, 25),
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

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function pickNumber(value: string | undefined, allowed: Set<number>, fallback: number) {
  const parsed = Number(value);
  return allowed.has(parsed) ? parsed : fallback;
}
