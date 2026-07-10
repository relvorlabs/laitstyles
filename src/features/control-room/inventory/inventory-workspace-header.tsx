import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CatalogueTaxonomyManager } from "@/features/control-room/inventory/catalogue-taxonomy-manager";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";

export function InventoryWorkspaceHeader() {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Catalogue operations
        </p>
        <h1 className="mt-3 max-w-[820px] text-balance font-serif text-[40px] font-medium leading-[.98] sm:text-[52px]">
          See every piece, unit and variant as one catalogue truth.
        </h1>
        <p className="mt-4 max-w-[760px] text-[14px] leading-6 text-muted-foreground">
          Product imagery leads the workspace, while stock, managed categories, collections, holds,
          visibility and sales stay close enough for daily decisions.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 xl:justify-end">
        <CatalogueTaxonomyManager
          className="h-11 rounded-full px-5"
          triggerLabel="Manage catalogue groups"
        />
        <Link
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className: "h-11 rounded-full px-5",
          })}
          href="/shop"
        >
          Preview catalogue
          <ControlRoomIcon icon={ArrowUpRight01Icon} size={16} />
        </Link>
      </div>
    </section>
  );
}
