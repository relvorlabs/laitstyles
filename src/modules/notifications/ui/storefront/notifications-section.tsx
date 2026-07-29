"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AcctButton,
  Eyebrow,
  panelElevatedClass,
} from "@/features/storefront/account/components/account-primitives";
import { cn } from "@/lib/utils";
import {
  notificationsQueryOptions,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/modules/notifications/client/hooks";

const listInput = { page: 1, pageSize: 25, unreadOnly: false } as const;

export function NotificationsSection() {
  const notifications = useQuery(notificationsQueryOptions(listInput));
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Eyebrow className="text-[var(--acc-sage-deep)]">Account inbox</Eyebrow>
          <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
            Notifications.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
            Transactional, support and security events saved to your account.
          </p>
        </div>
        <AcctButton
          variant="secondary"
          disabled={markAll.isPending || !notifications.data?.meta.unreadCount}
          onClick={() => markAll.mutate()}
        >
          {markAll.isPending ? "Marking read..." : "Mark all read"}
        </AcctButton>
      </header>

      {markAll.isError || markRead.isError ? (
        <p className="mt-5 text-[var(--acc-oxblood)]" role="alert">
          Notification state could not be updated. Try again.
        </p>
      ) : null}
      {notifications.isPending ? (
        <p className="mt-7" role="status">
          Loading notifications...
        </p>
      ) : null}
      {notifications.isError ? (
        <p className="mt-7" role="alert">
          Notifications could not be loaded. Try again.
        </p>
      ) : null}
      {notifications.data && notifications.data.data.length === 0 ? (
        <p className={cn("mt-7 p-6 text-[var(--acc-muted)]", panelElevatedClass)}>
          You have no notifications yet.
        </p>
      ) : null}

      {notifications.data?.data.length ? (
        <div
          className={cn(
            "mt-7 divide-y divide-[var(--acc-line)] overflow-hidden",
            panelElevatedClass,
          )}
        >
          {notifications.data.data.map((item) => (
            <Button
              key={item.id}
              type="button"
              disabled={Boolean(item.readAt) || markRead.isPending}
              onClick={() => markRead.mutate(item.id)}
              variant="ghost"
              className="grid w-full justify-stretch gap-4 text-left sm:grid-cols-[12px_minmax(0,1fr)_auto]"
            >
              {item.readAt ? (
                <span />
              ) : (
                <span
                  role="img"
                  aria-label="Unread"
                  className="mt-1.5 size-2.5 rounded-full bg-[var(--acc-oxblood)]"
                />
              )}
              <span>
                <strong>{item.title}</strong>
                {item.body ? (
                  <span className="mt-1 block text-sm text-[var(--acc-muted)]">{item.body}</span>
                ) : null}
              </span>
              <time className="text-sm text-[var(--acc-muted)]" dateTime={item.createdAt}>
                {new Date(item.createdAt).toLocaleDateString()}
              </time>
            </Button>
          ))}
        </div>
      ) : null}
    </>
  );
}
