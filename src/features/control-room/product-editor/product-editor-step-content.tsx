import { ProductFulfilmentStep } from "@/features/control-room/product-editor/product-fulfilment-step";
import { ProductIdentityStep } from "@/features/control-room/product-editor/product-identity-step";
import { ProductImagesStep } from "@/features/control-room/product-editor/product-images-step";
import { ProductPricingStep } from "@/features/control-room/product-editor/product-pricing-step";
import { ProductReviewStep } from "@/features/control-room/product-editor/product-review-step";
import { ProductStockStep } from "@/features/control-room/product-editor/product-stock-step";
import { ProductTypeStep } from "@/features/control-room/product-editor/product-type-step";
import type {
  InventoryMode,
  ProductEditorIssue,
  ProductEditorStep,
} from "@/lib/control-room/types";

export function ProductEditorStepContent({
  activeStep,
  issues,
  onModeChange,
  onStepChange,
}: {
  activeStep: ProductEditorStep;
  issues: ProductEditorIssue[];
  onModeChange: (mode: InventoryMode) => void;
  onStepChange: (step: ProductEditorStep) => void;
}) {
  if (activeStep === "type") {
    return <ProductTypeStep onModeChange={onModeChange} />;
  }
  if (activeStep === "identity") return <ProductIdentityStep />;
  if (activeStep === "images") return <ProductImagesStep />;
  if (activeStep === "stock") return <ProductStockStep />;
  if (activeStep === "pricing") return <ProductPricingStep />;
  if (activeStep === "fulfilment") return <ProductFulfilmentStep />;

  return (
    <ProductReviewStep issues={issues} onStepChange={onStepChange} />
  );
}
