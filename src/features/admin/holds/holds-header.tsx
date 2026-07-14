import { TimeQuarter02Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";

export function HoldsHeader() {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-[760px]">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <ControlRoomIcon icon={TimeQuarter02Icon} size={15} />
          Reserved stock
        </div>
        <h1 className="mt-3 font-serif text-[38px] font-medium leading-[0.98] sm:text-[48px]">
          Holds
        </h1>
        <p className="mt-4 max-w-[680px] text-[13px] leading-6 text-muted-foreground sm:text-[14px]">
          Watch reservations approaching release, resolve payment risk, and convert confirmed
          customers without creating duplicate stock records.
        </p>
      </div>
      <Badge className="w-fit" variant="outline">
        Session clock · live countdown
      </Badge>
    </header>
  );
}
