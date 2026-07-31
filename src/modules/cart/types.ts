import type { z } from "zod";
import type { ownedCartIntentSchema, ownedCartWriteSchema } from "@/modules/cart/schema";

export type OwnedCartIntent = z.infer<typeof ownedCartIntentSchema>;
export type OwnedCartWriteInput = z.infer<typeof ownedCartWriteSchema>;

export type OwnedCartLine = {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  updatedAt: string;
};

export type OwnedCartSnapshot = {
  lines: OwnedCartLine[];
  revision: string | null;
};
