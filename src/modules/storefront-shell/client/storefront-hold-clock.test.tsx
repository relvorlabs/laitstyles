// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { storefrontUiStore } from "@/stores/storefront-ui.store";
import { StorefrontHoldClockBoundary, useStorefrontHoldNow } from "./storefront-hold-clock";

const start = new Date("2026-07-25T12:00:00.000Z");

function ClockProbe({ name }: { name: string }) {
  const now = useStorefrontHoldNow();
  return <output data-testid={name}>{now}</output>;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(start);
  storefrontUiStore.getState().reset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("StorefrontHoldClockBoundary", () => {
  it("uses one interval for every mounted countdown consumer", () => {
    storefrontUiStore.getState().hold("product-1", start.getTime() + 10_000);
    const intervalSpy = vi.spyOn(window, "setInterval");

    render(
      <StorefrontHoldClockBoundary>
        <ClockProbe name="first" />
        <ClockProbe name="second" />
      </StorefrontHoldClockBoundary>,
    );

    expect(intervalSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("first").textContent).toBe(String(start.getTime()));
    expect(screen.getByTestId("second").textContent).toBe(String(start.getTime()));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const next = String(start.getTime() + 1000);
    expect(screen.getByTestId("first").textContent).toBe(next);
    expect(screen.getByTestId("second").textContent).toBe(next);
    expect(intervalSpy).toHaveBeenCalledTimes(1);
  });

  it("removes expired hold intents from the shared tick", () => {
    storefrontUiStore.getState().hold("product-1", start.getTime() + 1000);

    render(
      <StorefrontHoldClockBoundary>
        <ClockProbe name="clock" />
      </StorefrontHoldClockBoundary>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(storefrontUiStore.getState().holds).toEqual([]);
  });
});
