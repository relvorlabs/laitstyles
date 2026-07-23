"use client";

// Compatibility export while the remaining admin prototype modules are migrated
// domain-by-domain. All product and taxonomy mutations are real Server Actions;
// only the explicitly out-of-scope intake transition still uses AdminStore.
export {
  useArchiveProduct,
  useCreateCatalogueTaxonomy,
  useDeleteCatalogueTaxonomy,
  useDeleteProduct,
  useRenameCatalogueTaxonomy,
  useRestoreProduct,
  useSaveProduct,
  useTransitionIntake,
} from "@/features/admin/inventory/inventory-mutations";
