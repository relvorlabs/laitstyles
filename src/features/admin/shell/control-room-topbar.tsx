"use client";

import {
  Add01Icon,
  ArrowUpRight01Icon,
  Logout03Icon,
  Menu01Icon,
  Notification03Icon,
  Search01Icon,
  Store01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { useProductEditorController } from "@/features/control-room/product-editor/product-editor-controller";
import { useRecordSaleController } from "@/features/control-room/record-sale/record-sale-controller";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import { getControlRoomPage } from "@/features/control-room/shell/navigation";

type ControlRoomTopbarProps = {
  pathname: string;
  onOpenNavigation: () => void;
  onOpenSearch: () => void;
};

export function ControlRoomTopbar({
  pathname,
  onOpenNavigation,
  onOpenSearch,
}: ControlRoomTopbarProps) {
  const page = getControlRoomPage(pathname);
  const { openNewProduct } = useProductEditorController();
  const { openRecordSale } = useRecordSaleController();
  const attentionHref = pathname === "/admin" ? "#attention" : "/admin#attention";

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/88 backdrop-blur-xl">
      <div className="flex min-h-[76px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <Button
          aria-label="Open Admin navigation"
          className="size-11 rounded-full lg:hidden"
          onClick={onOpenNavigation}
          size="icon-lg"
          type="button"
          variant="outline"
        >
          <ControlRoomIcon icon={Menu01Icon} size={19} />
        </Button>

        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Admin
          </div>
          <div className="mt-0.5 truncate font-serif text-[21px] font-medium leading-none">
            {page.label}
          </div>
        </div>

        <Button
          aria-label="Search products, orders, customers and store tasks"
          className="group hidden min-h-12 min-w-[300px] items-center justify-start gap-3 rounded-2xl border border-border bg-surface-raised px-3.5 text-left shadow-laitstyle-sm transition-colors hover:border-border-strong hover:bg-surface-interactive xl:flex 2xl:min-w-[360px]"
          onClick={onOpenSearch}
          type="button"
          variant="outline"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-selected text-surface-selected-foreground">
            <ControlRoomIcon icon={Search01Icon} size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Search everything
            </span>
            <span className="mt-0.5 block truncate text-[12.5px] font-medium text-foreground">
              Products, orders, customers and tasks
            </span>
          </span>
          <kbd className="rounded-lg border border-border bg-surface-sunken px-2 py-1 font-mono text-[10px] text-muted-foreground">
            ⌘ K
          </kbd>
        </Button>

        <Button
          aria-label="Search Admin"
          className="size-11 rounded-full xl:hidden"
          onClick={onOpenSearch}
          size="icon-lg"
          type="button"
          variant="outline"
        >
          <ControlRoomIcon icon={Search01Icon} size={18} />
        </Button>

        <ThemeToggle className="hidden sm:inline-flex" />

        <form action="/auth/sign-out" className="hidden sm:block" method="post">
          <input name="next" type="hidden" value="/auth/sign-in?next=/admin" />
          <Button
            aria-label="Sign out of Admin"
            className="size-11 rounded-full"
            size="icon-lg"
            type="submit"
            variant="outline"
          >
            <ControlRoomIcon icon={Logout03Icon} size={18} />
          </Button>
        </form>

        <Link
          aria-label="Go to items needing attention"
          className={buttonVariants({
            variant: "outline",
            size: "icon-lg",
            className: "relative hidden size-11 rounded-full sm:inline-flex",
          })}
          href={attentionHref}
        >
          <ControlRoomIcon icon={Notification03Icon} size={18} />
          <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-background bg-destructive" />
        </Link>

        <Link
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className: "hidden h-11 rounded-full px-4 text-[12px] 2xl:inline-flex",
          })}
          href="/"
        >
          Preview storefront
          <ControlRoomIcon icon={ArrowUpRight01Icon} size={16} />
        </Link>

        <Button
          aria-label="Add product"
          className="size-11 rounded-full sm:h-11 sm:w-auto sm:px-4"
          onClick={openNewProduct}
          type="button"
          variant="outline"
        >
          <ControlRoomIcon icon={Add01Icon} size={17} />
          <span className="hidden sm:inline">Add product</span>
        </Button>

        <Button
          aria-label="Record sale"
          className="size-11 rounded-full sm:h-11 sm:w-auto sm:px-5"
          onClick={openRecordSale}
          type="button"
        >
          <ControlRoomIcon icon={Store01Icon} size={17} />
          <span className="hidden sm:inline">Record sale</span>
        </Button>
      </div>
    </header>
  );
}
