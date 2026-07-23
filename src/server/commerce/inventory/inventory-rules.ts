import "server-only";

import type { StaffCapability } from "@/lib/auth/permissions";
import { hasCapability } from "@/lib/auth/permissions";
import type { ProductEditorActionError } from "@/lib/admin/product-editor/product-editor-types";
import type { StaffSession } from "@/server/auth/session";

export function canStaff(actor: StaffSession, capability: StaffCapability): boolean {
  return hasCapability(actor.role, capability);
}

export function slugify(value: string): string {
  return (
    value
      .trim()
      .toLocaleLowerCase("en-NG")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled-product"
  );
}

export function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export class InventoryRuleViolation extends Error {
  constructor(readonly actionError: ProductEditorActionError) {
    super(actionError.message);
  }
}
