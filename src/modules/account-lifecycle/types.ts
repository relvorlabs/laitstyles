export type DataExportStatus = "queued" | "processing" | "ready" | "failed" | "expired";
export type AccountDeletionStatus =
  | "requested"
  | "blocked"
  | "cancelled"
  | "scheduled"
  | "completed";

export type AccountExportSummary = {
  id: string;
  status: DataExportStatus;
  requestedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
};

export type AccountExportPayload = {
  generatedAt: string;
  profile: { displayName: string | null; email: string | null; phone: string | null } | null;
  addresses: Array<Record<string, unknown>>;
  preferences: Record<string, unknown> | null;
  notifications: Array<Record<string, unknown>>;
  savedProducts: Array<Record<string, unknown>>;
  orders: Array<Record<string, unknown>>;
  returns: Array<Record<string, unknown>>;
  reviews: Array<Record<string, unknown>>;
  support: Array<Record<string, unknown>>;
  consentHistory: Array<Record<string, unknown>>;
};

export type AccountDeletionRequestSummary = {
  id: string;
  status: AccountDeletionStatus;
  reason: string | null;
  requestedAt: string;
  scheduledFor: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
};

export type DeletionBlockerReason =
  | "active-order"
  | "open-return"
  | "pending-refund"
  | "open-dispute"
  | "pending-payout";

export class AccountLifecycleError extends Error {
  readonly code: string;
  readonly blockedBy?: DeletionBlockerReason;
  constructor(code: string, message: string, blockedBy?: DeletionBlockerReason) {
    super(message);
    this.name = "AccountLifecycleError";
    this.code = code;
    this.blockedBy = blockedBy;
  }
}

export type CustomerIdentity = {
  customerId: string;
  authUserId: string;
  email: string | null;
  displayName: string | null;
  phone: string | null;
};

export type RequestAccountDeletionInput = { reason?: string };
