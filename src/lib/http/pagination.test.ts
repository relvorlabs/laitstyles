import { describe, expect, it } from "vitest";
import { createPaginationMeta, paginationQuerySchema } from "@/lib/http/pagination";

describe("pagination contract", () => {
  it("coerces bounded query values and returns standard metadata", () => {
    const query = paginationQuerySchema.parse({ page: "2", pageSize: "25" });

    expect(createPaginationMeta({ ...query, total: 51 })).toEqual({
      page: 2,
      pageSize: 25,
      total: 51,
      pageCount: 3,
    });
  });

  it("uses safe defaults and rejects invalid totals", () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 25 });
    expect(() => createPaginationMeta({ page: 1, pageSize: 25, total: -1 })).toThrow(
      "total must be a non-negative integer.",
    );
  });
});
