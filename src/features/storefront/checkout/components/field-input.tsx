import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function FieldInput({
  ariaLabel,
  error,
  onChange,
  placeholder,
  type = "text",
  value,
  withRightPadding = false,
}: {
  ariaLabel: string;
  error?: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
  withRightPadding?: boolean;
}) {
  return (
    <div>
      <Input
        aria-invalid={!!error}
        aria-label={ariaLabel}
        className={cn(
          "h-[52px] rounded-[9px] bg-card px-[15px] text-sm focus-visible:border-primary focus-visible:ring-0",
          withRightPadding ? "pr-11" : "",
          error ? "border-[#D98B84]" : "border-input",
        )}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? (
        <div className="mt-1.5 text-xs text-destructive" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
