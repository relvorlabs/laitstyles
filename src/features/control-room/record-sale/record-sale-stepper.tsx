"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import {
  recordSaleSteps,
  type RecordSaleStep,
} from "@/features/control-room/record-sale/record-sale-types";

const labels: Record<RecordSaleStep, string> = {
  item: "Item",
  customer: "Customer",
  payment: "Payment",
  review: "Review",
};

export function RecordSaleStepper({
  activeStep,
  highestVisited,
  onStepChange,
}: {
  activeStep: RecordSaleStep;
  highestVisited: number;
  onStepChange: (step: RecordSaleStep) => void;
}) {
  const activeIndex = recordSaleSteps.indexOf(activeStep);

  return (
    <nav
      aria-label="Record sale progress"
      className="shrink-0 border-b border-border bg-secondary/45 px-4 py-3 sm:px-6 lg:border-r lg:border-b-0 lg:px-4 lg:py-6"
    >
      <ol className="grid grid-cols-4 gap-2 lg:flex lg:flex-col">
        {recordSaleSteps.map((step, index) => {
          const completed = index < activeIndex;
          const selected = step === activeStep;
          const reachable = index <= highestVisited;

          return (
            <li key={step}>
              <Button
                aria-current={selected ? "step" : undefined}
                className="h-auto min-h-11 w-full justify-start rounded-[12px] px-3 py-2 text-left"
                disabled={!reachable}
                onClick={() => onStepChange(step)}
                type="button"
                variant={selected ? "secondary" : "ghost"}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-current text-[11px]">
                    {completed ? (
                      <ControlRoomIcon icon={CheckmarkCircle02Icon} size={15} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="hidden truncate text-sm sm:inline">
                    {labels[step]}
                  </span>
                </span>
              </Button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
