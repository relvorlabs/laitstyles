import type { ReturnQuery } from "@/features/admin/returns/return-types";

export function buildReturnsHref(
  pathname: string,
  {
    query,
    returnId,
  }: {
    query: ReturnQuery;
    returnId: string | null;
  },
) {
  const params = new URLSearchParams();
  if (query.view !== "all") params.set("view", query.view);
  if (query.search) params.set("q", query.search);
  if (query.status !== "all") params.set("status", query.status);
  if (query.sort !== "updated-desc") params.set("sort", query.sort);
  if (query.page !== 1) params.set("page", String(query.page));
  if (query.pageSize !== 25) params.set("pageSize", String(query.pageSize));
  if (returnId) params.set("return", returnId);
  const suffix = params.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}
