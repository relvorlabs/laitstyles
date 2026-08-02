"use client";

export type PaystackOutcome =
  | { kind: "success"; reference: string | null }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

export type PaystackWindowHandoff = {
  stage: "opening" | "closed";
  reopenCheckout: boolean;
};

type PaystackCallbacks = {
  onLoad?: (response: { accessCode?: string; id?: number }) => void;
  onSuccess?: (response: { reference?: string }) => void;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
};

type PaystackInstance = {
  resumeTransaction: (accessCode: string, callbacks?: PaystackCallbacks) => unknown;
};

type PaystackConstructor = new () => PaystackInstance;

const PAYSTACK_WINDOW_HANDOFF_EVENT = "laitstyles:paystack-window-handoff";
let constructorPromise: Promise<PaystackConstructor> | null = null;

export function preloadPaystackPopup(): Promise<PaystackConstructor> {
  constructorPromise ??= import("@paystack/inline-js")
    .then((module) => module.default as unknown as PaystackConstructor)
    .catch((error: unknown) => {
      constructorPromise = null;
      throw error;
    });
  return constructorPromise;
}

export function subscribePaystackWindowHandoff(
  listener: (handoff: PaystackWindowHandoff) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => listener((event as CustomEvent<PaystackWindowHandoff>).detail);
  window.addEventListener(PAYSTACK_WINDOW_HANDOFF_EVENT, handler);
  return () => window.removeEventListener(PAYSTACK_WINDOW_HANDOFF_EVENT, handler);
}

export async function resumePaystackTransaction(accessCode: string): Promise<PaystackOutcome> {
  if (!accessCode.trim()) return { kind: "error", message: "Payment access code is missing." };

  let popup: PaystackInstance;
  try {
    const Paystack = await preloadPaystackPopup();
    popup = new Paystack();
  } catch (error: unknown) {
    return {
      kind: "error",
      message:
        error instanceof Error
          ? error.message
          : "Paystack could not load the secure payment window.",
    };
  }

  return new Promise((resolve) => {
    let completed = false;
    let loaded = false;
    const finish = (outcome: PaystackOutcome) => {
      if (completed) return;
      completed = true;
      if (loaded) {
        dispatchPaystackWindowHandoff({
          stage: "closed",
          reopenCheckout: outcome.kind !== "success",
        });
      }
      resolve(outcome);
    };

    try {
      // Keep this SDK call in the original user action. Closing our own modal or
      // awaiting a timer first can lose browser user activation and prevent the
      // provider checkout from becoming visible.
      popup.resumeTransaction(accessCode, {
        onLoad: () => {
          if (loaded || completed) return;
          loaded = true;
          dispatchPaystackWindowHandoff({ stage: "opening", reopenCheckout: false });
        },
        onSuccess: (response) => finish({ kind: "success", reference: response.reference ?? null }),
        onCancel: () => finish({ kind: "cancelled" }),
        onError: (error) =>
          finish({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "Paystack could not open the payment window.",
          }),
      });
    } catch (error: unknown) {
      finish({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Paystack could not open the payment window.",
      });
    }
  });
}

function dispatchPaystackWindowHandoff(handoff: PaystackWindowHandoff): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PaystackWindowHandoff>(PAYSTACK_WINDOW_HANDOFF_EVENT, { detail: handoff }),
  );
}
