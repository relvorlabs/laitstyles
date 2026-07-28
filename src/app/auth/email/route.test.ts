import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn(),
  sendSignupConfirmationEmail: vi.fn(),
}));

vi.mock("@/modules/auth/server/authenticate", () => ({
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
  sendSignupConfirmationEmail: mocks.sendSignupConfirmationEmail,
}));

import { POST } from "@/app/auth/email/route";

function request(body: unknown) {
  return new Request("https://laitstyle.example/auth/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("auth email JSON adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendPasswordResetEmail.mockResolvedValue({
      ok: true,
      value: { status: "accepted", email: "shopper@example.com" },
    });
    mocks.sendSignupConfirmationEmail.mockResolvedValue({
      ok: true,
      value: { status: "accepted", email: "shopper@example.com" },
    });
  });

  it("requests password recovery with the originating dialog surface", async () => {
    const response = await POST(
      request({
        kind: "recovery",
        email: " shopper@example.com ",
        returnTo: "/products?auth=signin&support=recovery",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      value: { status: "accepted", email: "shopper@example.com" },
    });
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith(
      "shopper@example.com",
      "/products?auth=signin&support=recovery",
    );
    expect(mocks.sendSignupConfirmationEmail).not.toHaveBeenCalled();
  });

  it("requests another confirmation with the originating dialog surface", async () => {
    const response = await POST(
      request({
        kind: "confirmation",
        email: "shopper@example.com",
        returnTo: "/?auth=signin&support=confirmation",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.sendSignupConfirmationEmail).toHaveBeenCalledWith(
      "shopper@example.com",
      "/?auth=signin&support=confirmation",
    );
  });

  it("rejects malformed payloads before invoking an email provider", async () => {
    const response = await POST(request({ kind: "recovery", email: "not-an-email" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "invalid-input",
        message: "Check the highlighted fields and try again.",
        fieldErrors: { email: "Enter a valid email address." },
      },
    });
    expect(mocks.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(mocks.sendSignupConfirmationEmail).not.toHaveBeenCalled();
  });
});
