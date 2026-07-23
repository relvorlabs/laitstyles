"use client";

// Feature-local compatibility surface. The implementation remains in the
// Phase-3-owned lib/admin inventory seam so dependency direction stays
// features -> lib and existing consumers do not need a broad move-only edit.
export {
  useArchiveProduct,
  useCreateCatalogueTaxonomy,
  useDeleteCatalogueTaxonomy,
  useDeleteProduct,
  useRenameCatalogueTaxonomy,
  useRestoreProduct,
  useSaveProduct,
} from "@/lib/admin/inventory/inventory-mutations";
