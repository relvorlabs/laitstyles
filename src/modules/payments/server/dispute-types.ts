export type DisputeError = {
  code:
    | "FORBIDDEN"
    | "DISPUTE_INVALID"
    | "DISPUTE_NOT_FOUND"
    | "DISPUTE_PAYMENT_NOT_FOUND"
    | "DISPUTE_INVALID_STATE"
    | "DISPUTE_COMMAND_PENDING"
    | "DISPUTE_IDEMPOTENCY_CONFLICT"
    | "DISPUTE_PROVIDER_UNAVAILABLE";
  message: string;
};

export type DisputeEvidenceFile = {
  blob: Blob;
  name: string;
  contentType: string;
};
