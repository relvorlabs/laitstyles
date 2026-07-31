"use client";

export type PaystackOutcome =
  | { kind: "success"; reference: string | null }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

type PaystackCallbacks = {
  onSuccess?: (response: { reference?: string }) => void;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
};

type PaystackInstance = {
  resumeTransaction: (accessCode: string, callbacks?: PaystackCallbacks) => void;
};

type PaystackConstructor = new () => PaystackInstance;

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
    const finish = (outcome: PaystackOutcome) => {
      if (completed) return;
      completed = true;
      resolve(outcome);
    };

    try {
      popup.resumeTransaction(accessCode, {
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
