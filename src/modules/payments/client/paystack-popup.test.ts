// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

type PopupCallbacks = {
  onLoad?: (value: { accessCode?: string; id?: number }) => void;
  onSuccess?: (value: { reference?: string }) => void;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
};

const mocks = vi.hoisted(() => ({
  constructorCount: 0,
  resume: vi.fn(),
}));

vi.mock("@paystack/inline-js", () => ({
  default: class Paystack {
    constructor() {
      mocks.constructorCount += 1;
    }

    resumeTransaction(accessCode: string, callbacks?: PopupCallbacks) {
      return mocks.resume(accessCode, callbacks);
    }
  },
}));

import {
  resumePaystackTransaction,
  subscribePaystackWindowHandoff,
} from "@/modules/payments/client/paystack-popup";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.constructorCount = 0;
});

describe("resumePaystackTransaction", () => {
  it("rejects a missing access code before loading Popup", async () => {
    await expect(resumePaystackTransaction(" ")).resolves.toEqual({
      kind: "error",
      message: "Payment access code is missing.",
    });
    expect(mocks.resume).not.toHaveBeenCalled();
    expect(mocks.constructorCount).toBe(0);
  });

  it("constructs a fresh Popup instance for every launch", async () => {
    mocks.resume.mockImplementation(
      (_accessCode: string, callbacks: PopupCallbacks) => callbacks.onCancel?.(),
    );

    await expect(resumePaystackTransaction("access-one")).resolves.toEqual({
      kind: "cancelled",
    });
    await expect(resumePaystackTransaction("access-two")).resolves.toEqual({
      kind: "cancelled",
    });

    expect(mocks.constructorCount).toBe(2);
    expect(mocks.resume).toHaveBeenNthCalledWith(1, "access-one", expect.any(Object));
    expect(mocks.resume).toHaveBeenNthCalledWith(2, "access-two", expect.any(Object));
  });

  it("closes the internal checkout only after Paystack reports that it loaded", async () => {
    const handoffs: string[] = [];
    const unsubscribe = subscribePaystackWindowHandoff((handoff) => handoffs.push(handoff.stage));
    mocks.resume.mockImplementationOnce(
      (_accessCode: string, callbacks: PopupCallbacks) => {
        expect(handoffs).toEqual([]);
        callbacks.onLoad?.({ accessCode: "access-code", id: 42 });
        expect(handoffs).toEqual(["opening"]);
        callbacks.onCancel?.();
      },
    );

    await expect(resumePaystackTransaction("access-code")).resolves.toEqual({
      kind: "cancelled",
    });
    expect(handoffs).toEqual(["opening", "closed"]);
    unsubscribe();
  });

  it("normalizes Popup success", async () => {
    mocks.resume.mockImplementationOnce(
      (_accessCode: string, callbacks: PopupCallbacks) => {
        callbacks.onLoad?.({ accessCode: "access-code", id: 42 });
        callbacks.onSuccess?.({ reference: "LS-CHECKOUT-reference" });
      },
    );

    await expect(resumePaystackTransaction("access-code")).resolves.toEqual({
      kind: "success",
      reference: "LS-CHECKOUT-reference",
    });
  });

  it("normalizes Popup cancellation", async () => {
    mocks.resume.mockImplementationOnce(
      (_accessCode: string, callbacks: PopupCallbacks) => callbacks.onCancel?.(),
    );

    await expect(resumePaystackTransaction("access-code")).resolves.toEqual({
      kind: "cancelled",
    });
  });

  it("normalizes Popup errors without closing a checkout that Paystack never loaded", async () => {
    const handoffs: string[] = [];
    const unsubscribe = subscribePaystackWindowHandoff((handoff) => handoffs.push(handoff.stage));
    mocks.resume.mockImplementationOnce(
      (_accessCode: string, callbacks: PopupCallbacks) =>
        callbacks.onError?.(new Error("Popup failed")),
    );

    await expect(resumePaystackTransaction("access-code")).resolves.toEqual({
      kind: "error",
      message: "Popup failed",
    });
    expect(handoffs).toEqual([]);
    unsubscribe();
  });

  it("normalizes synchronous SDK failures", async () => {
    mocks.resume.mockImplementationOnce(() => {
      throw new Error("SDK unavailable");
    });

    await expect(resumePaystackTransaction("access-code")).resolves.toEqual({
      kind: "error",
      message: "SDK unavailable",
    });
  });
});
