// Temporary Phase 5–6 repair bridge. Delete after remaining storefront UI
// consumers move to their owning domain modules.
export * from "@/modules/storefront-shell/client/storefront-runtime";
export {
  useStorefrontCatalogueData as useStorefrontCatalogData,
} from "@/modules/storefront-shell/client/storefront-runtime";
