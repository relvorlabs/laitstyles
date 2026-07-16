import type { ProductEditorStep } from "@/lib/admin/shared/types";

export const productEditorStepLabels: Record<ProductEditorStep, string> = {
  type: "Product type",
  identity: "Identity",
  images: "Images",
  stock: "Stock & variants",
  pricing: "Pricing",
  fulfilment: "Fulfilment",
  review: "Review & publish",
};

export function getProductEditorStepLabel(step: ProductEditorStep) {
  return productEditorStepLabels[step];
}
