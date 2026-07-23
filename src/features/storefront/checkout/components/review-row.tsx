import { Button } from "@/components/ui/button";

export function ReviewRow({
  label,
  onEdit,
  value,
}: {
  label: string;
  onEdit: () => void;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-3.5 border-t border-[#F0EEE8] py-[15px]">
      <div className="min-w-0">
        <div className="mb-[5px] text-[11px] uppercase tracking-[.06em] text-[#A7A59B]">
          {label}
        </div>
        <div className="whitespace-pre-line text-[13.5px] leading-[1.6] text-[#3D3B35]">
          {value}
        </div>
      </div>
      <Button size="lg" className="shrink-0 self-start" onClick={onEdit} variant="ghost">
        Edit
      </Button>
    </div>
  );
}
