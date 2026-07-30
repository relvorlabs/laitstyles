import { z } from "zod";
import {
  DISPUTE_EVIDENCE_CONTENT_TYPES,
  DISPUTE_EVIDENCE_MAX_BYTES,
} from "@/modules/payments/server/paystack/disputes";

export const disputeIdentifierSchema = z.string().uuid();

export const disputeListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(["awaiting_evidence", "pending", "resolved", "declined"]).optional(),
  paymentId: z.string().uuid().optional(),
  dueBefore: z.string().datetime({ offset: true }).optional(),
});

export const updateDisputeBodySchema = z.object({
  refundAmountMinor: z.number().int().nonnegative().safe(),
  uploadedFilename: z.string().trim().min(1).max(180).optional(),
});

export const disputeEvidenceBodySchema = z.object({
  customerEmail: z.string().trim().email(),
  customerName: z.string().trim().min(1).max(160),
  customerPhone: z.string().trim().min(5).max(40),
  serviceDetails: z.string().trim().min(3).max(2_000),
  deliveryAddress: z.string().trim().min(3).max(500).optional(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  uploadedFilename: z.string().trim().min(1).max(180).optional(),
});

export const disputeDecisionBodySchema = z.object({
  message: z.string().trim().min(3).max(1_000),
  refundAmountMinor: z.number().int().nonnegative().safe(),
  uploadedFilename: z.string().trim().min(1).max(180).optional(),
  evidenceId: z.string().trim().regex(/^\d+$/).optional(),
});

export const disputeEvidenceFileSchema = z.object({
  name: z.string().trim().min(1).max(180),
  type: z.enum(DISPUTE_EVIDENCE_CONTENT_TYPES as [string, ...string[]]),
  size: z.number().int().min(1).max(DISPUTE_EVIDENCE_MAX_BYTES),
});

export const idempotencyKeySchema = z.string().trim().min(8).max(200);

export type DisputeListQuery = z.infer<typeof disputeListQuerySchema>;
export type UpdateDisputeBody = z.infer<typeof updateDisputeBodySchema>;
export type DisputeEvidenceBody = z.infer<typeof disputeEvidenceBodySchema>;
export type DisputeDecisionBody = z.infer<typeof disputeDecisionBodySchema>;
