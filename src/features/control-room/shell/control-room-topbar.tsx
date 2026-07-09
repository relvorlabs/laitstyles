"use client";

import Link from "next/link";
import {
  ArrowUpRight01Icon,
  Menu01Icon,
  Notification03Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";

type ControlRoomTopbarProps = {
  onOpenNavigation: () => void;
  onOpenSearch: () => void;
};

export function ControlRoomTopbar({
  onOpenNavigation,
  onOpenSearch,
}: ControlRoomTopbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/88 backdrop-blur-xl">
      <div className="flex min-h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button
          aria-label="Open Control Room navigation"
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
            Control room
          </div>
          <div className="mt-0.5 truncate font-serif text-[21px] font-medium leading-none">
            Overview
          </div>
        </div>

        <button
          className="hidden min-h-11 min-w-[280px] items-center gap-3 rounded-full border border-border bg-card px-4 text-left text-[13px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground md:flex"
          onClick={onOpenSearch}
          type="button"
        >
          <ControlRoomIcon icon={Search01Icon} size={17} />
          <span className="flex-1">Search today’s workspace</span>
          <kbd className="rounded-md border border-border bg-secondary px-2 py-1 font-mono text-[10px] text-muted-foreground">
            ⌘ K
          </kbd>
        </button>

        <Button
          aria-label="Search the Control Room"
          className="size-11 rounded-full md:hidden"
          onClick={onOpenSearch}
          size="icon-lg"
          type="button"
          variant="outline"
        >
          <ControlRoomIcon icon={Search01Icon} size={18} />
        </Button>

        <a
          aria-label="Go to items needing attention"
          className={buttonVariants({
            variant: "outline",
            size: "icon-lg",
            className: "relative size-11 rounded-full",
          })}
          href="#attention"
        >
          <ControlRoomIcon icon={Notification03Icon} size={18} />
          <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-background bg-destructive" />
        </a>

        <Link
          className={buttonVariants({
            size: "lg",
            className: "hidden h-11 rounded-full px-5 text-[13px] sm:inline-flex",
          })}
          href="/"
        >
          Preview storefront
          <ControlRoomIcon icon={ArrowUpRight01Icon} size={16} />
        </Link>
      </div>
    </header>
  );
}
