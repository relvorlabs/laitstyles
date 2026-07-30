"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ProductEditorStep } from "@/lib/admin/shared/types";
import { cn } from "@/lib/utils";
import { productEditorSteps } from "@/modules/products/types";
import { productEditorStepLabels } from "@/modules/products/ui/admin/product-editor/product-editor-step-labels";

export function ProductEditorStepper({
  activeStep,
  highestVisited,
  onStepChange,
}: {
  activeStep: ProductEditorStep;
  highestVisited: number;
  onStepChange: (step: ProductEditorStep) => void;
}) {
  const activeIndex = productEditorSteps.indexOf(activeStep);
  const progress = ((activeIndex + 1) / productEditorSteps.length) * 100;

  return (
    <div className="border-b border-border bg-secondary/45 px-5 py-4 sm:px-6 lg:h-full lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
      <div className="lg:hidden">
        <div className="flex items-center justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span>
            Step {activeIndex + 1} of {productEditorSteps.length}
          </span>
          <span>{productEditorStepLabels[activeStep]}</span>
        </div>
        <Progress className="mt-3" value={progress} />
      </div>

      <nav aria-label="Product editor steps" className="hidden lg:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Product workflow
        </p>
        <ol className="mt-5 flex flex-col gap-1.5">
          {productEditorSteps.map((step, index) => {
            const active = step === activeStep;
            const available = index <= highestVisited;
            const complete = index < activeIndex;

            return (
              <li key={step}>
                <Button
                  aria-current={active ? "step" : undefined}
                  className="w-full justify-start gap-3 text-left"
                  disabled={!available}
                  onClick={() => onStepChange(step)}
                  type="button"
                  variant={active ? "default" : "ghost"}
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full border text-[11px] font-semibold tabular-nums",
                      active
                        ? "border-primary-foreground/35 bg-primary-foreground/10"
                        : complete
                          ? "border-brand-sage/45 bg-accent text-accent-foreground"
                          : "border-border bg-card",
                    )}
                  >
                    {complete ? "✓" : index + 1}
                  </span>
                  <span className="text-[12px] font-semibold">{productEditorStepLabels[step]}</span>
                </Button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
