import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CheckoutStep } from "@/features/storefront/checkout/checkout-helpers";
import { cn } from "@/lib/utils";

export function StepIndicator({
  current,
  goStep,
}: {
  current: CheckoutStep;
  goStep: (step: CheckoutStep) => void;
}) {
  const labels = ["Contact", "Delivery", "Payment", "Review"] as const;
  return (
    <div className="mb-[26px] flex items-center">
      {labels.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <div className="contents" key={label}>
            {index > 0 ? (
              <span
                className={cn(
                  "mx-2.5 h-[1.5px] flex-1",
                  index <= current ? "bg-primary" : "bg-input",
                )}
              />
            ) : null}
            <Button
              className="flex h-auto shrink-0 items-center gap-2 p-0"
              onClick={() => goStep(index as CheckoutStep)}
              variant="ghost"
              aria-label={label}
            >
              <span
                className={cn(
                  "flex size-[26px] items-center justify-center rounded-full text-[12.5px] font-semibold",
                  done || active
                    ? "bg-primary text-primary-foreground"
                    : "border-[1.5px] border-[#D6D4CB] bg-card text-[#A7A59B]",
                )}
              >
                {done ? <Check className="size-3" strokeWidth={3} /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-[13px] max-sm:hidden",
                  active
                    ? "font-semibold text-primary"
                    : done
                      ? "text-[#57554E]"
                      : "text-[#A7A59B]",
                )}
              >
                {label}
              </span>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
