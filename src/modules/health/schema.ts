import { z } from "zod";

export const healthStatusSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("laitstyles"),
  timestamp: z.iso.datetime(),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;

export type HealthMeta = {
  version: "v1";
};
