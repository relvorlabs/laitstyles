import Link from "next/link";
import { Store01Icon } from "@hugeicons/core-free-icons";
import {
  ControlRoomIcon,
  type ControlRoomIconData,
} from "@/features/control-room/shared/control-room-icon";
import {
  controlRoomExternalLinks,
  controlRoomNavigation,
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
    <div className="flex h-full flex-col bg-primary text-primary-foreground">
      <div
        className={cn(
          "border-b border-white/10",
          compact ? "p-5" : "p-6",
        )}
      >
        <Link
          className="group flex items-center gap-3 text-primary-foreground hover:text-primary-foreground"
          href="/admin"
          onClick={onNavigate}
        >
          <span className="grid size-11 place-items-center rounded-full border border-white/[0.15] bg-white/[0.08] text-[#D9E1C9] transition-transform group-hover:-rotate-3">
            <ControlRoomIcon icon={Store01Icon} size={21} />
          </span>
          <span className="min-w-0">
            <span className="block font-serif text-[24px] font-medium leading-none">
              Laitstyle
            </span>
            <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/[0.62]">
              Control room
            </span>
          </span>
        </Link>
      </div>

      <div className={cn("flex flex-1 flex-col", compact ? "p-4" : "p-5")}>
        <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/[0.58]">
          Today
        </div>
        <nav aria-label="Control Room" className="flex flex-col gap-1.5">
          {controlRoomNavigation.map((item) => (
            <SidebarLink
              active={pathname === item.href}
              icon={item.icon}
              item={item}
              key={item.href}
              onNavigate={onNavigate}
            />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-5 pt-8">
          <div className="rounded-[18px] border border-white/[0.12] bg-white/[0.07] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/[0.64]">
                Storefront
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#D9E1C9]">
                <span className="size-1.5 rounded-full bg-[#AFC48A]" />
                Live
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-5 text-white/[0.72]">
              Customers can browse the current catalogue while you work here.
            </p>
            <div className="mt-4 flex flex-col gap-1">
              {controlRoomExternalLinks.map((item) => (
                <Link
                  className="flex min-h-10 items-center gap-2 rounded-[10px] px-2 text-[12.5px] font-medium text-white/[0.78] transition-colors hover:bg-white/[0.08] hover:text-white"
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

          <div className="flex items-center gap-3 border-t border-white/10 px-1 pt-5">
            <span className="grid size-10 place-items-center rounded-full bg-[#D9E1C9] text-[12px] font-bold text-primary">
              SO
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">
                Store owner
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] text-white/[0.62]">
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
  item: (typeof controlRoomNavigation)[number];
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
          ? "bg-[#F6F5F1] text-primary shadow-[0_12px_28px_rgba(0,0,0,.16)] hover:text-primary"
          : "text-white/[0.74] hover:bg-white/[0.08] hover:text-white",
      )}
      href={item.href}
      onClick={onNavigate}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-[11px]",
          active
            ? "bg-[#E7EBDD] text-[#4A5540]"
            : "bg-white/[0.07] text-white/[0.76]",
        )}
      >
        <ControlRoomIcon icon={icon} size={18} />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{item.label}</span>
        <span
          className={cn(
            "mt-0.5 block truncate text-[10.5px]",
            active ? "text-muted-foreground" : "text-white/[0.58]",
          )}
        >
          {item.description}
        </span>
      </span>
    </Link>
  );
}
