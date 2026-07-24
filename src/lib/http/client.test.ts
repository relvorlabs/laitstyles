import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, apiRequest } from "@/lib/http/client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("returns a typed success envelope and requests JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { status: "ok" },
          meta: { version: "v1" },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest<{ status: "ok" }, { version: "v1" }>("/api/v1/health");

    expect(result).toEqual({
      data: { status: "ok" },
      meta: { version: "v1" },
    });
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((requestInit.headers as Headers).get("Accept")).toBe("application/json");
  });

  it("throws a typed client error for API failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "VALIDATION_ERROR",
              message: "The request contains invalid fields.",
              fieldErrors: { name: ["Name is required."] },
            },
          }),
          {
            status: 422,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    await expect(apiRequest("/api/v1/products")).rejects.toMatchObject<ApiClientError>({
      name: "ApiClientError",
      code: "VALIDATION_ERROR",
      message: "The request contains invalid fields.",
      status: 422,
      fieldErrors: { name: ["Name is required."] },
    });
  });

  it("rejects malformed JSON responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not-json", { status: 200 })));

    await expect(apiRequest("/api/v1/health")).rejects.toMatchObject<ApiClientError>({
      code: "INVALID_API_RESPONSE",
      message: "The server returned an unreadable response.",
      status: 200,
    });
  });

  it("rejects successful responses that do not match the envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(apiRequest("/api/v1/health")).rejects.toMatchObject<ApiClientError>({
      code: "INVALID_API_RESPONSE",
      message: "The server returned an unexpected response.",
      status: 200,
    });
  });
});
