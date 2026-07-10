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
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          "border-b border-sidebar-border",
          compact ? "p-5" : "p-6",
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

      <div className={cn("flex flex-1 flex-col", compact ? "p-4" : "p-5")}>
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

        <div className="mt-auto flex flex-col gap-5 pt-8">
          <div className="flex items-center justify-between gap-3 rounded-[16px] border border-sidebar-border bg-sidebar-accent/70 p-3.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/68">
                Appearance
              </p>
              <p className="mt-1 text-[11px] leading-4 text-sidebar-foreground/58">
                Light, dark or device setting
              </p>
            </div>
            <ThemeToggle
              className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            />
          </div>

          <div className="rounded-[18px] border border-sidebar-border bg-sidebar-accent/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/64">
                Storefront
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-sage-soft">
                <span className="size-1.5 rounded-full bg-brand-sage-soft" />
                Live
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-5 text-sidebar-foreground/72">
              Customers can browse the current catalogue while you work here.
            </p>
            <div className="mt-4 flex flex-col gap-1">
              {controlRoomExternalLinks.map((item) => (
                <Link
                  className="flex min-h-10 items-center gap-2 rounded-[10px] px-2 text-[12.5px] font-medium text-sidebar-foreground/78 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  href={item.href}
                  key={item.href}
                  onClick={onNavigate}
                >
                  <ControlRoomIcon icon={item.icon} size={16} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-sidebar-border px-1 pt-5">
            <span className="grid size-10 place-items-center rounded-full bg-brand-sage-soft text-[12px] font-bold text-brand-ink">
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
          </div>
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
        "group flex min-h-14 items-center gap-3 rounded-[14px] px-3.5 text-[13.5px] transition-colors",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg hover:text-sidebar-primary-foreground"
          : "text-sidebar-foreground/74 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
      href={item.href}
      onClick={onNavigate}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-[11px]",
          active
            ? "bg-accent text-accent-foreground"
            : "bg-sidebar-accent text-sidebar-foreground/78",
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
              ? "text-sidebar-primary-foreground/62"
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
