import { describe, expect, it } from "vitest";
import {
  authEmailSchema,
  authFieldErrors,
  passwordSignInSchema,
  passwordSignUpSchema,
  recoveredPasswordSchema,
} from "@/modules/auth/schema";

describe("password auth schemas", () => {
  it("trims normalized identity fields", () => {
    expect(
      passwordSignUpSchema.parse({
        email: "  shopper@example.com ",
        password: "password123",
        confirmPassword: "password123",
        first: "  Ada ",
        last: " Lovelace  ",
        terms: "true",
        next: "/account",
      }),
    ).toEqual({
      email: "shopper@example.com",
      password: "password123",
      confirmPassword: "password123",
      first: "Ada",
      last: "Lovelace",
      terms: true,
      next: "/account",
    });
  });

  it("returns fixed field copy for malformed sign-in data", () => {
    const result = passwordSignInSchema.safeParse({ email: "not-an-email", password: "" });
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(authFieldErrors(result.error)).toEqual({
      email: "Enter a valid email address.",
      password: "Enter your password.",
    });
  });

  it("requires names, terms, and an eight-character sign-up password", () => {
    const result = passwordSignUpSchema.safeParse({
      email: "shopper@example.com",
      password: "short",
      confirmPassword: "short",
      first: "",
      last: "",
      terms: "false",
    });
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(authFieldErrors(result.error)).toEqual({
      password: "Password must be at least 8 characters.",
      first: "Enter your first name.",
      last: "Enter your last name.",
      terms: "Please accept the Terms to continue.",
    });
  });

  it("normalizes recovery email input", () => {
    expect(authEmailSchema.parse({ email: " shopper@example.com " })).toEqual({
      email: "shopper@example.com",
    });
  });

  it("requires recovered passwords to match", () => {
    const result = recoveredPasswordSchema.safeParse({
      password: "password123",
      confirmPassword: "different123",
    });
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(authFieldErrors(result.error)).toEqual({
      confirmPassword: "Passwords do not match.",
    });
  });
});
