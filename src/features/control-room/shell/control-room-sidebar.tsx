import Link from "next/link";
import { LaitstyleSymbol } from "@/components/brand/laitstyle-symbol";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  ControlRoomIcon,
  type ControlRoomIconData,
} from "@/features/control-room/shared/control-room-icon";
import {
  controlRoomExternalLinks,
  controlRoomNavigationGroups,
  type ControlRoomNavigationItem,
} from "@/features/control-room/shell/navigation";
import { cn } from "@/lib/utils";

type ControlRoomSidebarProps = {
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
};

export function ControlRoomSidebar({
  pathname,
  onNavigate,
  compact = false,
}: ControlRoomSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          "shrink-0 border-b border-sidebar-border",
          compact ? "px-5 py-4" : "px-6 py-5",
        )}
      >
        <Link
          className="group flex items-center gap-3 text-sidebar-foreground hover:text-sidebar-foreground"
          href="/admin"
          onClick={onNavigate}
        >
          <span className="grid size-11 place-items-center rounded-xl border border-sidebar-border bg-sidebar-accent text-sidebar-foreground transition-transform group-hover:-rotate-3 motion-reduce:transition-none">
            <LaitstyleSymbol
              aria-hidden="true"
              className="h-8 w-5"
              focusable="false"
            />
          </span>
          <span className="min-w-0">
            <span className="block font-serif text-[24px] font-medium leading-none">
              Laitstyle
            </span>
            <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/60">
              Control room
            </span>
          </span>
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className={cn("flex flex-col gap-7", compact ? "p-4" : "p-5")}>
          <nav aria-label="Control Room" className="flex flex-col gap-5">
            {controlRoomNavigationGroups.map((group) => (
              <div key={group.label}>
                <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/56">
                  {group.label}
                </div>
                <div className="flex flex-col gap-1.5">
                  {group.items.map((item) => (
                    <SidebarLink
                      active={isActive(pathname, item.href)}
                      icon={item.icon}
                      item={item}
                      key={item.href}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <section aria-labelledby="storefront-links-heading">
            <div
              className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/56"
              id="storefront-links-heading"
            >
              Storefront
            </div>
            <div className="flex flex-col gap-1.5">
              {controlRoomExternalLinks.map((item) => (
                <Link
                  className="group flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-[12.5px] font-medium text-sidebar-foreground/74 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring forced-colors:outline"
                  href={item.href}
                  key={item.href}
                  onClick={onNavigate}
                >
                  <span className="grid size-8 place-items-center rounded-[9px] bg-sidebar-accent text-sidebar-foreground/78 group-hover:text-sidebar-foreground">
                    <ControlRoomIcon icon={item.icon} size={16} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div
        className={cn(
          "shrink-0 border-t border-sidebar-border bg-sidebar",
          compact ? "p-4" : "p-5",
        )}
      >
        <div className="flex items-center justify-between gap-3 rounded-[14px] border border-sidebar-border bg-sidebar-accent/70 p-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/64">
              Appearance
            </p>
            <p className="mt-0.5 truncate text-[11px] text-sidebar-foreground/58">
              Light, dark or device
            </p>
          </div>
          <ThemeToggle
            align="start"
            className="shrink-0 border-sidebar-border bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          />
        </div>

        <div className="mt-3 flex items-center gap-3 px-1">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sidebar-selected text-[12px] font-bold text-sidebar-selected-foreground">
            SO
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold">
              Store owner
            </span>
            <span className="mt-0.5 block truncate text-[11.5px] text-sidebar-foreground/62">
              Owner workspace
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-sage-soft">
            <span className="size-1.5 rounded-full bg-brand-sage-soft" />
            Live
          </span>
        </div>
      </div>
    </div>
  );
}

type SidebarLinkProps = {
  active: boolean;
  icon: ControlRoomIconData;
  item: ControlRoomNavigationItem;
  onNavigate?: () => void;
};

function SidebarLink({
  active,
  icon,
  item,
  onNavigate,
}: SidebarLinkProps) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-14 items-center gap-3 rounded-[14px] border border-transparent px-3.5 text-[13.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring forced-colors:border forced-colors:outline",
        active
          ? "border-sidebar-selected/70 bg-sidebar-selected text-sidebar-selected-foreground shadow-laitstyle-sm hover:text-sidebar-selected-foreground"
          : "text-sidebar-foreground/74 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
      href={item.href}
      onClick={onNavigate}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-[11px] transition-colors",
          active
            ? "bg-sidebar-selected-foreground/12 text-sidebar-selected-foreground"
            : "bg-sidebar-accent text-sidebar-foreground/78 group-hover:text-sidebar-foreground",
        )}
      >
        <ControlRoomIcon icon={icon} size={18} />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{item.label}</span>
        <span
          className={cn(
            "mt-0.5 block truncate text-[10.5px]",
            active
              ? "text-sidebar-selected-foreground/72"
              : "text-sidebar-foreground/58",
          )}
        >
          {item.description}
        </span>
      </span>
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
