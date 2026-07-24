import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseJsonBody, parseSearchParams } from "@/lib/http/request";

describe("HTTP request validation", () => {
  it("parses JSON bodies through the supplied schema", async () => {
    const request = new Request("http://localhost/api/v1/products", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ name: "Linen Shirt" }),
    });

    await expect(
      parseJsonBody(request, z.object({ name: z.string().min(1) })),
    ).resolves.toEqual({ name: "Linen Shirt" });
  });

  it("returns stable transport errors for missing content type and malformed JSON", async () => {
    const missingContentType = new Request("http://localhost/api/v1/products", {
      method: "POST",
      body: JSON.stringify({ name: "Linen Shirt" }),
    });

    await expect(
      parseJsonBody(missingContentType, z.object({ name: z.string() })),
    ).rejects.toMatchObject({
      code: "INVALID_CONTENT_TYPE",
      status: 400,
    });

    const malformed = new Request("http://localhost/api/v1/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    await expect(
      parseJsonBody(malformed, z.object({ name: z.string() })),
    ).rejects.toMatchObject({
      code: "INVALID_JSON",
      status: 400,
    });
  });

  it("parses scalar and repeated query parameters", () => {
    const request = new Request(
      "http://localhost/api/v1/products?page=2&status=draft&status=published",
    );
    const schema = z.object({
      page: z.coerce.number().int(),
      status: z.array(z.string()),
    });

    expect(parseSearchParams(request, schema)).toEqual({
      page: 2,
      status: ["draft", "published"],
    });
  });
});
