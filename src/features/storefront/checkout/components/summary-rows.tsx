import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function SummaryRows({
  compact = false,
  shipping,
  subtotal,
  total,
  totalLabel,
  vat,
  zoneName,
}: {
  compact?: boolean;
  shipping: string;
  subtotal: string;
  total: string;
  totalLabel: string;
  vat: string;
  zoneName: string;
}) {
  return (
    <div>
      <div className="mb-2.5 flex justify-between text-[13.5px] text-[#57554E]">
        <span>Subtotal{compact ? "" : " · 3 items"}</span>
        <span className="text-primary">{subtotal}</span>
      </div>
      <div className="mb-2.5 flex justify-between text-[13.5px] text-[#57554E]">
        <span>
          Delivery <span className="text-[#A7A59B]">· {zoneName}</span>
        </span>
        <span className="text-primary">{shipping}</span>
      </div>
      <div className="mb-3.5 flex justify-between text-[13.5px] text-[#57554E]">
        <span>VAT (7.5%)</span>
        <span className="text-primary">{vat}</span>
      </div>
      <Separator className="bg-[#ECEAE3]" />
      <div className="flex items-baseline justify-between pt-3.5">
        <span className={cn("font-semibold", compact ? "text-base" : "text-lg")}>{totalLabel}</span>
        <span className={cn("font-semibold", compact ? "text-xl" : "text-[22px]")}>{total}</span>
      </div>
    </div>
  );
}
