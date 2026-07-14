"use client";

import type { FormEvent } from "react";
import { cn } from "@/lib/utils";
import { useAccountUi } from "../account-context";
import {
  AcctButton,
  Eyebrow,
  fieldClass,
  panelClass,
  panelElevatedClass,
} from "../components/account-primitives";

const communication = [
  {
    title: "Order and delivery updates",
    detail: "Required transactional messages",
    checked: true,
    disabled: true,
  },
  {
    title: "Security alerts",
    detail: "Required for account protection",
    checked: true,
    disabled: true,
  },
  { title: "New-drop notes", detail: "Editorial product updates", checked: false, disabled: false },
  {
    title: "Saved-product changes",
    detail: "Availability or price changes",
    checked: true,
    disabled: false,
  },
];

export function PreferencesSection() {
  const { toast } = useAccountUi();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    toast("Preferences saved");
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
            {communication.map((row) => (
              <label
                key={row.title}
                className="flex min-h-20 items-center justify-between gap-5 p-5 sm:p-6"
              >
                <span>
                  <strong className="block">{row.title}</strong>
                  <span className="mt-1 block text-sm text-[var(--acc-muted)]">{row.detail}</span>
                </span>
                <input
                  type="checkbox"
                  defaultChecked={row.checked}
                  disabled={row.disabled}
                  className="size-5 accent-[var(--acc-ink)]"
                />
              </label>
            ))}
          </div>
        </section>

        <section className={cn("p-5 sm:p-6", panelClass)}>
          <h2 className="font-serif text-3xl font-normal">Shopping preferences</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Preferred department</span>
              <select className={cn(fieldClass, "mt-2")}>
                <option>All departments</option>
                <option>Women</option>
                <option>Men</option>
                <option>Unisex</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Typical size</span>
              <select className={cn(fieldClass, "mt-2")} defaultValue="Medium">
                <option>Not set</option>
                <option>Medium</option>
                <option>Large</option>
              </select>
            </label>
          </div>
        </section>

        <div className="flex justify-end">
          <AcctButton type="submit">Save preferences</AcctButton>
        </div>
      </form>
    </>
  );
}
