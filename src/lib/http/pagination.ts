import { z } from "zod";
import type { ApiPaginationMeta } from "@/lib/http/contracts";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function createPaginationMeta({
  page,
  pageSize,
  total,
}: PaginationQuery & { total: number }): ApiPaginationMeta {
  assertNonNegativeInteger(total, "total");

  return {
    page,
    pageSize,
    total,
    pageCount: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative integer.`);
  }
}
