import { Button } from "@/components/ui/button";
import { RadioDot } from "./radio-dot";

export function ChoiceRow({
  active,
  onClick,
  right,
  subtitle,
  title,
}: {
  active: boolean;
  onClick: () => void;
  right: string;
  subtitle: string;
  title: string;
}) {
  return (
    <Button
      className="flex h-auto items-center gap-[13px] text-left"
      onClick={onClick}
      variant={active ? "secondary" : "ghost"}
    >
      <RadioDot active={active} />
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs text-[#8A887E]">{subtitle}</span>
      </span>
      <span className="text-sm font-semibold">{right}</span>
    </Button>
  );
}
