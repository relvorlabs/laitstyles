export const DISPUTE_EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
export const DISPUTE_EVIDENCE_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type DisputeEvidenceContentType =
  (typeof DISPUTE_EVIDENCE_CONTENT_TYPES)[number];
