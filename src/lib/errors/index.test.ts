import { describe, expect, it } from "vitest";
import { err, ok, type Result } from "@/lib/errors";

describe("canonical Result", () => {
  it("uses value only for success", () => {
    const result: Result<{ id: string }, { code: "missing" }> = ok({ id: "product-a" });

    expect(result).toEqual({ ok: true, value: { id: "product-a" } });
    if (result.ok) expect(result.value.id).toBe("product-a");
  });

  it("uses a typed error only for expected failure", () => {
    const result: Result<{ id: string }, { code: "missing" }> = err({ code: "missing" });

    expect(result).toEqual({ ok: false, error: { code: "missing" } });
    if (!result.ok) expect(result.error.code).toBe("missing");
  });
});
