import { z } from "zod";

import type { ReviewInput } from "./review-types";

export const reviewInputSchema: z.ZodType<ReviewInput> = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined),
  body: z.string().trim().min(20).max(2000),
  fit: z.enum(["runs_small", "true_to_size", "runs_large", "not_applicable"]),
});

export type { ReviewInput } from "./review-types";
