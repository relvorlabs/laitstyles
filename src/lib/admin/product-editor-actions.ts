export type { IntakeStateResult } from "@/lib/admin/intake-actions";
export {
  applyIntakeTransition,
  createInitialIntakeRecords,
  formatIntakeStage,
  getAdjacentIntakeStages,
  updateIntakeAfterEditorAction,
} from "@/lib/admin/intake-actions";
export type { ProductEditorStateResult } from "@/lib/admin/product-editor-save-action";
export { applyProductEditorAction } from "@/lib/admin/product-editor-save-action";
