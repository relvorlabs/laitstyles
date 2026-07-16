import { cn } from "@/lib/utils";

export function RadioDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "flex size-[19px] shrink-0 items-center justify-center rounded-full border-2",
        active ? "border-primary" : "border-[#CFCDC4]",
      )}
    >
      <span className={cn("size-[9px] rounded-full", active ? "bg-primary" : "bg-transparent")} />
    </span>
  );
}
