import { hydrateCustomerProfiles } from "@/lib/admin/customers/customer-profile-seed";
import {
  applyCreateCatalogueTaxonomy,
  applyDeleteCatalogueTaxonomy,
  applyRenameCatalogueTaxonomy,
  type CatalogueTaxonomyActionError,
  type CatalogueTaxonomyActionSuccess,
  type CatalogueTaxonomyInput,
  hydrateCatalogueTaxonomy,
} from "@/lib/admin/inventory/catalogue-taxonomy";
import {
  applyArchiveProduct,
  applyDeleteProduct,
  applyRestoreProduct,
  type ProductLifecycleActionError,
  type ProductLifecycleActionSuccess,
} from "@/lib/admin/inventory/product-lifecycle-reducer";
import {
  applyIntakeTransition,
  applyProductEditorAction,
  createInitialIntakeRecords,
} from "@/lib/admin/product-editor/product-editor-reducer";
import { createDefaultStoreSettings } from "@/lib/admin/settings/settings-defaults";
import { applySaveStoreSettings } from "@/lib/admin/settings/settings-reducer";
import type { Result } from "@/lib/admin/shared/result";
import type {
  AdminState,
  IntakeStage,
  IntakeTransitionSuccess,
  ProductEditorActionError,
  ProductEditorActionSuccess,
  ProductEditorIntent,
  ProductEditorValues,
  SaveStoreSettingsInput,
  StoreSettingsActionError,
  StoreSettingsActionSuccess,
} from "@/lib/admin/shared/types";

type ProductActionResult = Result<ProductEditorActionSuccess, ProductEditorActionError>;
type ProductLifecycleResult = Result<ProductLifecycleActionSuccess, ProductLifecycleActionError>;
type IntakeActionResult = Result<IntakeTransitionSuccess, ProductEditorActionError>;
type StoreSettingsResult = Result<StoreSettingsActionSuccess, StoreSettingsActionError>;
type CatalogueTaxonomyResult = Result<CatalogueTaxonomyActionSuccess, CatalogueTaxonomyActionError>;

export type AdminStore = {
  getSnapshot: () => AdminState;
  subscribe: (listener: () => void) => () => void;
  saveProduct: (values: ProductEditorValues, intent: ProductEditorIntent) => ProductActionResult;
  archiveProduct: (productId: string) => ProductLifecycleResult;
  restoreProduct: (productId: string) => ProductLifecycleResult;
  deleteProduct: (productId: string) => ProductLifecycleResult;
  createCatalogueTaxonomy: (input: CatalogueTaxonomyInput) => CatalogueTaxonomyResult;
  renameCatalogueTaxonomy: (taxonomyId: string, name: string) => CatalogueTaxonomyResult;
  deleteCatalogueTaxonomy: (taxonomyId: string) => CatalogueTaxonomyResult;
  transitionIntake: (productId: string, nextStage: IntakeStage) => IntakeActionResult;
  saveStoreSettings: (input: SaveStoreSettingsInput) => StoreSettingsResult;
  resetPrototypeState: () => void;
};

export function createAdminStore(initialState: AdminState, now?: () => string): AdminStore {
  const normalizedInitialState = normalizeState(initialState);
  const getNow = now ?? createSessionClock(normalizedInitialState.asOf);
  let state = normalizedInitialState;
  const listeners = new Set<() => void>();

  function emit(nextState: AdminState) {
    state = nextState;
    for (const listener of listeners) listener();
  }

  function commitAction<TAction, TError>(
    result: Result<{ state: AdminState; action: TAction }, TError>,
  ): Result<TAction, TError> {
    if (!result.ok) return result;
    emit(result.value.state);
    return { ok: true, value: result.value.action };
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    saveProduct(values, intent) {
      return commitAction(applyProductEditorAction(state, values, intent, getNow()));
    },
    archiveProduct(productId) {
      return commitAction(applyArchiveProduct(state, productId, getNow()));
    },
    restoreProduct(productId) {
      return commitAction(applyRestoreProduct(state, productId, getNow()));
    },
    deleteProduct(productId) {
      return commitAction(applyDeleteProduct(state, productId, getNow()));
    },
    createCatalogueTaxonomy(input) {
      return commitAction(applyCreateCatalogueTaxonomy(state, input, getNow()));
    },
    renameCatalogueTaxonomy(taxonomyId, name) {
      return commitAction(applyRenameCatalogueTaxonomy(state, taxonomyId, name, getNow()));
    },
    deleteCatalogueTaxonomy(taxonomyId) {
      return commitAction(applyDeleteCatalogueTaxonomy(state, taxonomyId, name, getNow()));
    },
    transitionIntake(productId, nextStage) {
      return commitAction(applyIntakeTransition(state, productId, nextStage, getNow()));
    },
    saveStoreSettings(input) {
      return commitAction(applySaveStoreSettings(state, input, getNow()));
    },
    resetPrototypeState() {
      emit(normalizedInitialState);
    },
  };
}

function normalizeState(initialState: AdminState): AdminState {
  let index = 0;
  const idFactory = (prefix: string) => `${prefix}-seed-${++index}`;

  return {
    ...initialState,
    catalogueTaxonomy: hydrateCatalogueTaxonomy(
      initialState.products,
      initialState.catalogueTaxonomy,
      initialState.asOf,
      idFactory,
    ),
    customers: hydrateCustomerProfiles(initialState.customers),
    settings: initialState.settings ?? createDefaultStoreSettings(initialState.asOf),
    intake: createInitialIntakeRecords(
      initialState.products,
      initialState.intake,
      initialState.asOf,
      idFactory,
    ),
    returns: initialState.returns ?? [],
  };
}

function createSessionClock(anchor: string) {
  const anchorTime = Date.parse(anchor);
  const startedAt = Date.now();
  return () => new Date(anchorTime + Math.max(0, Date.now() - startedAt)).toISOString();
}
