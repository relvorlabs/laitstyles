// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionProvider, useSession, useSessionActions } from "@/providers/session-provider";

afterEach(() => {
  cleanup();
});

function Consumer() {
  const session = useSession();
  return (
    <span data-testid="session">
      {session.signedIn ? "signed-in" : "signed-out"}:{session.identityKey ?? "no-identity"}:
      {session.displayName ?? "none"}:{session.role ?? "no-role"}
    </span>
  );
}

function SessionControls() {
  const { resetSession, setSession } = useSessionActions();
  return (
    <>
      <button
        onClick={() =>
          setSession({
            signedIn: true,
            identityKey: "consumer-1",
            email: "shopper@example.com",
            displayName: "Shopper",
            role: null,
          })
        }
        type="button"
      >
        Sign in locally
      </button>
      <button onClick={resetSession} type="button">
        Sign out locally
      </button>
    </>
  );
}

describe("SessionProvider", () => {
  it("exposes the provided session to descendants", () => {
    render(
      <SessionProvider
        session={{
          signedIn: true,
          identityKey: "consumer-1",
          email: "a@b.com",
          displayName: "Ada",
          role: "admin",
        }}
      >
        <Consumer />
      </SessionProvider>,
    );

    expect(screen.getByTestId("session").textContent).toBe("signed-in:consumer-1:Ada:admin");
  });

  it("updates sign-in and sign-out state without remounting the provider", async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider
        session={{
          signedIn: false,
          identityKey: null,
          email: null,
          displayName: null,
          role: null,
        }}
      >
        <Consumer />
        <SessionControls />
      </SessionProvider>,
    );

    expect(screen.getByTestId("session").textContent).toBe("signed-out:no-identity:none:no-role");

    await user.click(screen.getByRole("button", { name: "Sign in locally" }));
    expect(screen.getByTestId("session").textContent).toBe("signed-in:consumer-1:Shopper:no-role");

    await user.click(screen.getByRole("button", { name: "Sign out locally" }));
    expect(screen.getByTestId("session").textContent).toBe("signed-out:no-identity:none:no-role");
  });

  it("synchronizes a new server session prop", () => {
    const { rerender } = render(
      <SessionProvider
        session={{
          signedIn: false,
          identityKey: null,
          email: null,
          displayName: null,
          role: null,
        }}
      >
        <Consumer />
      </SessionProvider>,
    );

    rerender(
      <SessionProvider
        session={{
          signedIn: true,
          identityKey: "consumer-1",
          email: "a@b.com",
          displayName: "Ada",
          role: "admin",
        }}
      >
        <Consumer />
      </SessionProvider>,
    );

    expect(screen.getByTestId("session").textContent).toBe("signed-in:consumer-1:Ada:admin");
  });

  it("throws when useSession is called outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow("useSession must be used within SessionProvider");
    spy.mockRestore();
  });
});
