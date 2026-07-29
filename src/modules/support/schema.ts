import { z } from "zod";
import { paginationQuerySchema } from "@/lib/http/pagination";

export const supportTicketCategorySchema = z.enum([
  "order",
  "payment",
  "product",
  "account",
  "other",
]);
export const supportTicketIdentifierSchema = z.string().trim().uuid();

const attachmentSchema = z
  .object({
    assetId: z.string().trim().uuid(),
    fileName: z.string().trim().min(1).max(255),
  })
  .strict();

export const createSupportTicketSchema = z
  .object({
    subject: z.string().trim().min(1, "Enter a subject.").max(160),
    category: supportTicketCategorySchema.default("other"),
    body: z.string().trim().min(1, "Enter a message.").max(4_000),
    attachments: z.array(attachmentSchema).max(5).default([]),
  })
  .strict();

export const replyToTicketSchema = z
  .object({
    body: z.string().trim().min(1, "Enter a message.").max(4_000),
    attachments: z.array(attachmentSchema).max(5).default([]),
  })
  .strict();

export const supportTicketListSearchSchema = paginationQuerySchema;

export const completeSupportAttachmentSchema = z
  .object({
    publicId: z.string().trim().min(1).max(255),
    fileName: z.string().trim().min(1).max(255),
    ownershipToken: z.string().trim().min(1),
    resourceType: z.enum(["image", "raw"]),
  })
  .strict();
