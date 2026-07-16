"use client";

import { Button } from "@/components/ui/button";
import type { ProductEditorStep } from "@/lib/admin/shared/types";

export function ProductEditorFooter({
  activeStep,
  onBack,
  onNext,
  onPublish,
  onSaveDraft,
  onSchedule,
}: {
  activeStep: ProductEditorStep;
  onBack: () => void;
  onNext: () => void;
  onPublish: () => void;
  onSaveDraft: () => void;
  onSchedule: () => void;
}) {
  const isFirst = activeStep === "type";
  const isReview = activeStep === "review";

  return (
    <footer className="border-t border-border bg-card px-4 py-4 sm:px-6">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button size="lg" onClick={onSaveDraft} type="button" variant="outline">
            Save draft
          </Button>
          <span className="hidden text-[10.5px] text-muted-foreground xl:inline">
            Session only · refresh resets the prototype
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {!isFirst ? (
            <Button size="lg" onClick={onBack} type="button" variant="ghost">
              Back
            </Button>
          ) : null}

          {isReview ? (
            <>
              <Button size="lg" onClick={onSchedule} type="button" variant="outline">
                Schedule
              </Button>
              <Button size="lg" onClick={onPublish} type="button">
                Publish now
              </Button>
            </>
          ) : (
            <Button size="lg" onClick={onNext} type="button">
              Continue
            </Button>
          )}
        </div>
      </div>
    </footer>
  );
}
