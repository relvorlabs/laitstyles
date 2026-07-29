"use client";

import { useQuery } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  notificationPreferencesQueryOptions,
  useUpdateNotificationPreference,
} from "@/modules/notifications/client/hooks";
import type { NotificationCategory } from "@/modules/notifications/types";
import {
  customerPreferencesQueryOptions,
  useUpdateCustomerPreferences,
} from "@/modules/preferences/client/hooks";
import { useAccountUi } from "@/modules/storefront-shell/ui/account-context";
import {
  AcctButton,
  Eyebrow,
  fieldClass,
  panelClass,
  panelElevatedClass,
} from "@/modules/storefront-shell/ui/account-primitives";

const categoryCopy: Record<NotificationCategory, { title: string; detail: string }> = {
  order_updates: { title: "Order and delivery updates", detail: "Required transactional messages" },
  security: { title: "Security alerts", detail: "Required for account protection" },
  promotions: { title: "New-drop notes", detail: "Editorial product updates" },
  support: { title: "Support replies", detail: "Updates from customer support" },
};

export function PreferencesSection() {
  const { toast } = useAccountUi();
  const preferences = useQuery(customerPreferencesQueryOptions());
  const notificationPreferences = useQuery(notificationPreferencesQueryOptions());
  const updatePreferences = useUpdateCustomerPreferences();
  const updateNotification = useUpdateNotificationPreference();
  const [error, setError] = useState<string | null>(null);
  const pending = updatePreferences.isPending || updateNotification.isPending;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preferences.data || !notificationPreferences.data) return;
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await updatePreferences.mutateAsync({
        contactChannel: form.get("contactChannel") as "email" | "sms" | "whatsapp" | "none",
        sizingUnit: form.get("sizingUnit") as "metric" | "imperial",
        marketingOptIn: form.get("marketingOptIn") === "on",
        personalizationEnabled: form.get("personalizationEnabled") === "on",
      });
      await Promise.all(
        notificationPreferences.data.map((item) =>
          updateNotification.mutateAsync({
            ...item,
            emailEnabled:
              item.category === "order_updates" || item.category === "security"
                ? true
                : form.get(`notification-${item.category}`) === "on",
          }),
        ),
      );
      toast("Preferences saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Preferences could not be saved.");
    }
  }

  if (preferences.isPending || notificationPreferences.isPending) {
    return <p role="status">Loading preferences...</p>;
  }
  if (preferences.isError || notificationPreferences.isError || !preferences.data) {
    return <p role="alert">Preferences could not be loaded. Try again.</p>;
  }

  return (
    <>
      <header>
        <Eyebrow className="text-[var(--acc-sage-deep)]">Communication and personalization</Eyebrow>
        <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
          Preferences.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
          Transactional and security messages remain enabled where service operation requires them.
        </p>
      </header>

      <form className="mt-7 space-y-6" onSubmit={onSubmit}>
        <section className={cn("overflow-hidden", panelElevatedClass)}>
          <div className="border-b border-[var(--acc-line)] p-5 sm:p-6">
            <h2 className="font-serif text-3xl font-normal">Communication</h2>
          </div>
          <div className="divide-y divide-[var(--acc-line)]">
            {notificationPreferences.data?.map((item) => {
              const required = item.category === "order_updates" || item.category === "security";
              return (
                <label
                  key={item.category}
                  className="flex min-h-20 items-center justify-between gap-5 p-5 sm:p-6"
                >
                  <span>
                    <strong className="block">{categoryCopy[item.category].title}</strong>
                    <span className="mt-1 block text-sm text-[var(--acc-muted)]">
                      {categoryCopy[item.category].detail}
                    </span>
                  </span>
                  <input
                    name={`notification-${item.category}`}
                    type="checkbox"
                    defaultChecked={item.emailEnabled}
                    disabled={required || pending}
                    className="size-5 accent-[var(--acc-ink)]"
                  />
                </label>
              );
            })}
          </div>
        </section>

        <section className={cn("p-5 sm:p-6", panelClass)}>
          <h2 className="font-serif text-3xl font-normal">Shopping preferences</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Preferred contact channel</span>
              <select
                aria-label="Preferred contact channel"
                className={cn(fieldClass, "mt-2")}
                defaultValue={preferences.data.contactChannel}
                name="contactChannel"
                disabled={pending}
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="none">None</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Sizing units</span>
              <select
                aria-label="Sizing units"
                className={cn(fieldClass, "mt-2")}
                defaultValue={preferences.data.sizingUnit}
                name="sizingUnit"
                disabled={pending}
              >
                <option value="metric">Metric</option>
                <option value="imperial">Imperial</option>
              </select>
            </label>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-3">
              <input
                className="size-5 accent-[var(--acc-ink)]"
                defaultChecked={preferences.data.marketingOptIn}
                disabled={pending}
                name="marketingOptIn"
                type="checkbox"
              />
              Marketing updates
            </label>
            <label className="flex items-center gap-3">
              <input
                className="size-5 accent-[var(--acc-ink)]"
                defaultChecked={preferences.data.personalizationEnabled}
                disabled={pending}
                name="personalizationEnabled"
                type="checkbox"
              />
              Personalized recommendations
            </label>
          </div>
        </section>

        {error ? (
          <p role="alert" className="text-[var(--acc-oxblood)]">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end">
          <AcctButton disabled={pending} type="submit">
            {pending ? "Saving preferences..." : "Save preferences"}
          </AcctButton>
        </div>
      </form>
    </>
  );
}
