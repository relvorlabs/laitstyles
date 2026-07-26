import { describe, expect, it } from "vitest";

import {
  assertProductAuthorizationResponse,
  parseAuthorizationDomain,
  requireProductAuthorizationActors,
} from "../../scripts/auth/product-authorization-contract.mjs";

describe("Product authorization acceptance contract", () => {
  it("selects only the explicit products authorization domain", () => {
    expect(parseAuthorizationDomain(["--authorization", "--domain", "products"])).toBe("products");
    expect(() => parseAuthorizationDomain(["--authorization"])).toThrow(
      "Authorization acceptance requires --domain",
    );
    expect(() => parseAuthorizationDomain(["--authorization", "--domain", "orders"])).toThrow(
      "Unsupported authorization domain",
    );
  });

  it("fails with variable names rather than unavailable actor secrets", () => {
    const secret = "must-not-appear";
    let message = "";
    try {
      requireProductAuthorizationActors({ AUTH_ACCEPTANCE_ADMIN_PASSWORD: secret });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("AUTH_ACCEPTANCE_CONSUMER_EMAIL");
    expect(message).not.toContain(secret);
  });

  it.each([
    ["anonymous", 401, "AUTHENTICATION_REQUIRED", "Sign in before continuing."],
    ["consumer", 403, "MISSING_CAPABILITY", "This account role cannot perform that action."],
  ] as const)("accepts the stable %s denial envelope", (actor, status, code, message) => {
    expect(() =>
      assertProductAuthorizationResponse(actor, status, { error: { code, message } }),
    ).not.toThrow();
  });

  it.each(["manager", "admin"] as const)("requires a successful %s create", (actor) => {
    expect(() =>
      assertProductAuthorizationResponse(actor, 201, { data: { product: { id: "product-id" } } }),
    ).not.toThrow();
  });

  it("rejects a denial with an unstable envelope", () => {
    expect(() =>
      assertProductAuthorizationResponse("consumer", 403, {
        error: { code: "FORBIDDEN", message: "No." },
      }),
    ).toThrow("consumer Product authorization response");
  });
});
