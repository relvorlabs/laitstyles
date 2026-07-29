import { z } from "zod";

export const dataExportIdentifierSchema = z.string().trim().uuid();
export const deletionRequestIdentifierSchema = z.string().trim().uuid();

export const requestAccountDeletionSchema = z
  .object({
    reason: z.string().trim().max(1_000).optional(),
  })
  .strict();
