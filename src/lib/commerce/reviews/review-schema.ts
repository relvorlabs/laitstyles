import { z } from "zod";

import type { ReviewInput } from "./review-types";

export const reviewInputSchema = z.object({
  rating: z
    .number()
    .int("Choose a whole-number rating from 1 to 5.")
    .min(1, "Choose a rating from 1 to 5.")
    .max(5, "Choose a rating from 1 to 5."),
  title: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined),
  body: z
    .string()
    .trim()
    .min(20, "Write at least 20 characters.")
    .max(2000, "Keep your review within 2,000 characters."),
  fit: z.enum(["runs_small", "true_to_size", "runs_large", "not_applicable"]),
}) satisfies z.ZodType<ReviewInput>;

export type { ReviewInput } from "./review-types";
