import type {
  CatalogueTaxonomyActionError,
  CatalogueTaxonomyActionSuccess,
  CatalogueTaxonomyItem,
  CatalogueTaxonomyKind,
  CatalogueTaxonomyInput,
} from "@/lib/admin/inventory/catalogue-taxonomy";
import type { ProductLifecycleActionError, ProductLifecycleActionSuccess } from "@/lib/admin/inventory/product-lifecycle-reducer";
import type { InventoryProduct } from "@/lib/admin/inventory/inventory-types";
import type {
  ProductEditorActionError,
  ProductEditorActionSuccess,
  ProductEditorIntent,
  ProductEditorIssue,
  ProductEditorValues,
} from "@/lib/admin/product-editor/product-editor-types";

export type AdminProduct = InventoryProduct;
export type ProductTaxonomyItem = CatalogueTaxonomyItem;
export type ProductTaxonomyKind = CatalogueTaxonomyKind;
export type ProductTaxonomyInput = CatalogueTaxonomyInput;

export type ProductMutationInput = {
  values: ProductEditorValues;
  intent: ProductEditorIntent;
};

export type ProductMutationSuccess = ProductEditorActionSuccess;
export type ProductMutationError = ProductEditorActionError;
export type ProductMutationIssue = ProductEditorIssue;

export type ProductLifecycleSuccess = ProductLifecycleActionSuccess;
export type ProductLifecycleError = ProductLifecycleActionError;

export type ProductTaxonomySuccess = CatalogueTaxonomyActionSuccess;
export type ProductTaxonomyError = CatalogueTaxonomyActionError;

export type ProductSaveOutcome = ProductMutationSuccess & {
  previousSlug: string | null;
};

export type ProductLifecycleOutcome = ProductLifecycleSuccess & {
  slug: string;
};

export type ProductTaxonomyOutcome = ProductTaxonomySuccess & {
  affectedProductSlugs: string[];
};
