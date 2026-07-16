export type { IntakeStateResult } from "@/lib/admin/product-editor/intake-reducer";
export {
  applyIntakeTransition,
  createInitialIntakeRecords,
  formatIntakeStage,
  getAdjacentIntakeStages,
  updateIntakeAfterEditorAction,
} from "@/lib/admin/product-editor/intake-reducer";
export type { ProductEditorStateResult } from "@/lib/admin/product-editor/product-editor-save-action";
export { applyProductEditorAction } from "@/lib/admin/product-editor/product-editor-save-action";
