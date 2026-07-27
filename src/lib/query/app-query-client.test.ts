import { describe, expect, it } from "vitest";
import { APP_QUERY_DEFAULTS, makeAppQueryClient } from "@/lib/query/app-query-client";

describe("app QueryClient defaults", () => {
  it("configures the shared admin/storefront cache behaviour intentionally", () => {
    const client = makeAppQueryClient();

    expect(client.getDefaultOptions().queries).toMatchObject(APP_QUERY_DEFAULTS);
    expect(APP_QUERY_DEFAULTS).toEqual({
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    });
  });
});
