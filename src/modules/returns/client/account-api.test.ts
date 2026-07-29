import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAccountReturnRequest,
  getAccountReturnRequest,
  listAccountReturnsRequest,
} from "@/modules/returns/client/api";

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => vi.restoreAllMocks());

describe("account returns API client", () => {
  it("lists account returns without caching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response([]));

    await listAccountReturnsRequest();

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/account/returns",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("gets an encoded return id", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response({ id: "a/b" }));

    await getAccountReturnRequest("a/b");

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/account/returns/a%2Fb",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("creates a return through the account endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response({ id: "r-1" }, 201));
    const input = {
      orderNumber: "LS-1",
      reason: "Wrong fit",
      lines: [{ orderLineId: "line-1", quantity: 1 }],
    };

    await createAccountReturnRequest(input);

    const [url, init] = fetchSpy.mock.calls[0] as [RequestInfo, RequestInit];
    expect(url).toBe("/api/v1/account/returns");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(input));
  });
});
