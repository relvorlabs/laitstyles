declare module "@paystack/inline-js" {
  type PaystackResumeCallbacks = {
    onSuccess?: (transaction: { reference?: string; status?: string; trans?: string }) => void;
    onCancel?: () => void;
    onError?: (error: unknown) => void;
  };

  export default class Paystack {
    resumeTransaction(accessCode: string, callbacks?: PaystackResumeCallbacks): void;
  }
}
