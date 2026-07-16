import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-[5px]",
        checked ? "bg-primary" : "border-[1.5px] border-[#CFCDC3] bg-card",
      )}
    >
      {checked ? <Check className="size-[13px] text-white" strokeWidth={3} /> : null}
    </span>
  );
}
