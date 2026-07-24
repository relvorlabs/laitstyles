import { describe, expect, it } from "vitest";
import { requireApiPermission } from "@/lib/http/policy";

describe("requireApiPermission", () => {
  it("allows valid policies and maps denied policies to stable errors", () => {
    expect(() => requireApiPermission(true)).not.toThrow();

    try {
      requireApiPermission(false, {
        code: "PRODUCT_NOT_FOUND",
        message: "The selected product could not be found.",
        status: 404,
      });
      throw new Error("Expected requireApiPermission to throw.");
    } catch (error) {
      expect(error).toMatchObject({
        code: "PRODUCT_NOT_FOUND",
        status: 404,
      });
    }
  });
});
