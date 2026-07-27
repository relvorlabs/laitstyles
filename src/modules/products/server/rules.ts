import "server-only";

import type { StaffCapability } from "@/modules/auth/permissions";
import { hasCapability } from "@/modules/auth/permissions";
import type { StaffSession } from "@/modules/auth/server/session";
import type { ProductMutationError } from "@/modules/products/types";

export function canManageProduct(actor: StaffSession, capability: StaffCapability): boolean {
  return hasCapability(actor.role, capability);
}

export function slugifyProductName(value: string): string {
  return (
    value
      .trim()
      .toLocaleLowerCase("en-NG")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled-product"
  );
}

export function cleanProductText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isProductId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export class ProductRuleViolation extends Error {
  constructor(readonly actionError: ProductMutationError) {
    super(actionError.message);
  }
}
