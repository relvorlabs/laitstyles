"use client";

// Compatibility export while the remaining admin prototype modules are migrated
// domain-by-domain. Every Inventory product and taxonomy mutation below is a
// capability-gated Server Action; no AdminStore mutation is exported here.
export {
  useArchiveProduct,
  useCreateCatalogueTaxonomy,
  useDeleteCatalogueTaxonomy,
  useDeleteProduct,
  useRenameCatalogueTaxonomy,
  useRestoreProduct,
  useSaveProduct,
} from "@/features/admin/inventory/inventory-mutations";
