"use client";

import { cn } from "@/lib/utils";
import { useAccountUi } from "../account-context";
import { type AccountNavItem, type AccountRoute, accountNavItems } from "../account-nav";

const sidebarLinkBase =
  "relative flex min-h-[46px] w-full items-center gap-3 rounded-[10px] px-[.8rem] py-[.7rem] text-left text-[.92rem] font-[560] transition-[background-color,color,transform] duration-200";

export function SidebarLink({
  item,
  active,
  onSelect,
  showMeta = true,
  className,
}: {
  item: AccountNavItem;
  active: boolean;
  onSelect: (route: AccountRoute) => void;
  showMeta?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={() => onSelect(item.route)}
      className={cn(
        // `acc-sidebar-link` carries the colour states (muted / hover-ink /
        // active-bone) via globals.css so they beat home-lab.css's `.lst-lab
        // button { color: inherit }`; bg + translateX slide stay Tailwind.
        sidebarLinkBase,
        "acc-sidebar-link",
        active ? "bg-[var(--acc-ink)]" : "hover:translate-x-0.5 hover:bg-[var(--acc-bone-2)]",
        className,
      )}
    >
      <span>{item.label}</span>
      {showMeta && item.count ? (
        <span className="ml-auto font-mono text-[10px] tabular-nums">{item.count}</span>
      ) : null}
      {showMeta && item.dot ? (
        <span
          role="img"
          aria-label="Unread notifications"
          className="ml-auto size-2 rounded-full bg-[var(--acc-oxblood)]"
        />
      ) : null}
    </button>
  );
}

export function AccountSidebar() {
  const { currentRoute, navigate, toast } = useAccountUi();

  return (
    <aside className="hidden md:block">
      <div className="sticky top-24 overflow-hidden rounded-[14px] border border-[var(--acc-line)] bg-[var(--acc-surface)] shadow-[var(--acc-shadow-sm)]">
        <div className="border-b border-[var(--acc-line)] p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-[var(--acc-sage)] text-sm font-bold text-[var(--acc-sage-deep)]">
              AO
            </span>
            <div className="min-w-0">
              <p className="font-semibold">Ada Okafor</p>
              <p className="mt-1 truncate text-sm text-[var(--acc-muted)]">Customer since 2024</p>
            </div>
          </div>
        </div>

        <nav className="p-2.5" aria-label="Account">
          {accountNavItems.map((item) => (
            <SidebarLink
              key={item.route}
              item={item}
              active={currentRoute === item.route}
              onSelect={navigate}
            />
          ))}
        </nav>

        <div className="border-t border-[var(--acc-line)] p-2.5">
          <button
            type="button"
            onClick={() => toast("Current-session sign-out selected")}
            className={cn(
              sidebarLinkBase,
              "acc-fg-oxblood hover:translate-x-0.5 hover:bg-[var(--acc-bone-2)]",
            )}
          >
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
