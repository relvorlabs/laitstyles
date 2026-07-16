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
import { useProductEditorController } from "@/features/admin/product-editor/product-editor-controller";
import { useRecordSaleController } from "@/features/admin/record-sale/record-sale-controller";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import { getAdminPage } from "@/features/admin/shell/navigation";

type AdminTopbarProps = {
  pathname: string;
  onOpenNavigation: () => void;
  onOpenSearch: () => void;
};

export function AdminTopbar({ pathname, onOpenNavigation, onOpenSearch }: AdminTopbarProps) {
  const page = getAdminPage(pathname);
  const { openNewProduct } = useProductEditorController();
  const { openRecordSale } = useRecordSaleController();
  const attentionHref = pathname === "/admin" ? "#attention" : "/admin#attention";

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/88 backdrop-blur-xl">
      <div className="flex min-h-[76px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <Button
          aria-label="Open Admin navigation"
          className="lg:hidden"
          onClick={onOpenNavigation}
          size="icon-lg"
          type="button"
          variant="outline"
        >
          <AdminIcon icon={Menu01Icon} size={19} />
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
          className="group hidden min-w-[300px] items-center justify-start gap-3 text-left xl:flex 2xl:min-w-[360px]"
          onClick={onOpenSearch}
          type="button"
          variant="outline"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-selected text-surface-selected-foreground">
            <AdminIcon icon={Search01Icon} size={17} />
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
          className="xl:hidden"
          onClick={onOpenSearch}
          size="icon-lg"
          type="button"
          variant="outline"
        >
          <AdminIcon icon={Search01Icon} size={18} />
        </Button>

        <ThemeToggle className="hidden sm:inline-flex" />

        <form action="/auth/sign-out" className="hidden sm:block" method="post">
          <input name="next" type="hidden" value="/auth/sign-in?next=/admin" />
          <Button aria-label="Sign out of Admin" size="icon-lg" type="submit" variant="outline">
            <AdminIcon icon={Logout03Icon} size={18} />
          </Button>
        </form>

        <Link
          aria-label="Go to items needing attention"
          className={buttonVariants({
            variant: "outline",
            size: "icon-lg",
            className: "relative hidden sm:inline-flex",
          })}
          href={attentionHref}
        >
          <AdminIcon icon={Notification03Icon} size={18} />
          <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-background bg-destructive" />
        </Link>

        <Link
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className: "hidden 2xl:inline-flex",
          })}
          href="/"
        >
          Preview storefront
          <AdminIcon icon={ArrowUpRight01Icon} size={16} />
        </Link>

        <Button
          aria-label="Add product"
          className="sm:w-auto"
          onClick={openNewProduct}
          type="button"
          variant="outline"
        >
          <AdminIcon icon={Add01Icon} size={17} />
          <span className="hidden sm:inline">Add product</span>
        </Button>

        <Button
          aria-label="Record sale"
          className="sm:w-auto"
          onClick={openRecordSale}
          type="button"
        >
          <AdminIcon icon={Store01Icon} size={17} />
          <span className="hidden sm:inline">Record sale</span>
        </Button>
      </div>
    </header>
  );
}
