import { describe, expect, it } from "vitest";
import {
  ADMIN_QUERY_DEFAULTS,
  makeAdminQueryClient,
} from "@/lib/query/admin-query-client";

describe("admin QueryClient defaults", () => {
  it("configures remote admin cache behaviour intentionally", () => {
    const client = makeAdminQueryClient();

    expect(client.getDefaultOptions().queries).toMatchObject(ADMIN_QUERY_DEFAULTS);
  });
});
