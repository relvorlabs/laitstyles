"use client";

import { cn } from "@/lib/utils";
import { useAccountUi } from "../account-context";
import type { AccountRoute } from "../account-nav";
import { AcctButton, Eyebrow, panelElevatedClass } from "../components/account-primitives";

const items: {
  title: string;
  detail: string;
  time: string;
  route: AccountRoute;
  unread: boolean;
}[] = [
  {
    title: "Your order has shipped",
    detail: "Order #LS-1048 is on the way.",
    time: "2h",
    route: "order-detail",
    unread: true,
  },
  {
    title: "Return approved",
    detail: "Return #RT-0038 is ready to ship.",
    time: "1d",
    route: "return-detail",
    unread: true,
  },
  {
    title: "New sign-in detected",
    detail: "Chrome on Windows · Lagos",
    time: "2d",
    route: "security",
    unread: true,
  },
  {
    title: "Support replied",
    detail: "Ticket #SP-0119 has a new reply.",
    time: "5d",
    route: "support",
    unread: false,
  },
];

export function NotificationsSection() {
  const { navigate, toast } = useAccountUi();

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Eyebrow className="text-[var(--acc-sage-deep)]">Account inbox</Eyebrow>
          <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
            Notifications.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
            Only transactional, support and security events with real backend records.
          </p>
        </div>
        <AcctButton variant="secondary" onClick={() => toast("All notifications marked as read.")}>
          Mark all read
        </AcctButton>
      </header>

      <div
        className={cn("mt-7 divide-y divide-[var(--acc-line)] overflow-hidden", panelElevatedClass)}
      >
        {items.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => navigate(item.route)}
            className={cn(
              "grid w-full gap-4 p-5 text-left sm:grid-cols-[12px_minmax(0,1fr)_auto]",
              item.unread && "bg-[rgba(233,228,217,.75)]",
            )}
          >
            {item.unread ? (
              <span
                role="img"
                aria-label="Unread"
                className="mt-1.5 size-2.5 rounded-full bg-[var(--acc-oxblood)]"
              />
            ) : (
              <span />
            )}
            <span>
              <strong>{item.title}</strong>
              <span className="mt-1 block text-sm text-[var(--acc-muted)]">{item.detail}</span>
            </span>
            <time className="text-sm text-[var(--acc-muted)]">{item.time}</time>
          </button>
        ))}
      </div>
    </>
  );
}
