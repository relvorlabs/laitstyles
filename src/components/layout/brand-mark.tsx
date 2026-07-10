import { LaitstyleSymbol } from "@/components/brand/laitstyle-symbol";
import { cn } from "@/lib/utils";

export function BrandMark({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center text-foreground",
        compact ? "gap-2" : "gap-2.5",
        className,
      )}
    >
      <LaitstyleSymbol
        aria-hidden="true"
        className={compact ? "h-7 w-[18px]" : "h-9 w-6"}
        focusable="false"
      />
      <span
        className={cn(
          "font-semibold uppercase leading-none",
          compact
            ? "text-[13px] tracking-[0.24em]"
            : "text-[15px] tracking-[0.28em]",
        )}
      >
        Laitstyle
      </span>
    </span>
  );
}
