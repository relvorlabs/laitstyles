"use client";

type PaystackOutcome =
  | { kind: "success"; reference: string | null }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

type PaystackCallbacks = {
  onSuccess?: (response: { reference?: string }) => void;
  onCancel?: () => void;
  onClose?: () => void;
  onError?: (error: unknown) => void;
};

type PaystackInstance = {
  resumeTransaction: (accessCode: string, callbacks?: PaystackCallbacks) => void;
};

type PaystackConstructor = new () => PaystackInstance;

let popupPromise: Promise<PaystackInstance> | null = null;

export function preloadPaystackPopup() {
  popupPromise ??= import("@paystack/inline-js").then((module) => {
    const Paystack = module.default as unknown as PaystackConstructor;
    return new Paystack();
  });
  return popupPromise;
}

export async function resumePaystackTransaction(accessCode: string): Promise<PaystackOutcome> {
  if (!accessCode.trim()) return { kind: "error", message: "Payment access code is missing." };
  const popup = await preloadPaystackPopup();

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
        onClose: () => finish({ kind: "cancelled" }),
        onError: (error) =>
          finish({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "Paystack could not open the payment window.",
          }),
      });
    } catch (error) {
      finish({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Paystack could not open the payment window.",
      });
    }
  });
}
