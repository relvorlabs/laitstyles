// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionProvider, useSession } from "@/providers/session-provider";

afterEach(() => {
  cleanup();
});

function Consumer() {
  const session = useSession();
  return (
    <span data-testid="session">
      {session.signedIn ? "signed-in" : "signed-out"}:{session.displayName ?? "none"}:
      {session.role ?? "no-role"}
    </span>
  );
}

describe("SessionProvider", () => {
  it("exposes the provided session to descendants", () => {
    render(
      <SessionProvider
        session={{ signedIn: true, email: "a@b.com", displayName: "Ada", role: "admin" }}
      >
        <Consumer />
      </SessionProvider>,
    );

    expect(screen.getByTestId("session").textContent).toBe("signed-in:Ada:admin");
  });

  it("throws when useSession is called outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow("useSession must be used within SessionProvider");
    spy.mockRestore();
  });
});
