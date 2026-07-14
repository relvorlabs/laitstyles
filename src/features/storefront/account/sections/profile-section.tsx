"use client";

import { type FormEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAccountUi } from "../account-context";
import {
  AcctButton,
  Eyebrow,
  fieldClass,
  LabeledField,
  monoClass,
  panelElevatedClass,
} from "../components/account-primitives";

export function ProfileSection() {
  const { openModal, toast } = useAccountUi();
  const [changed, setChanged] = useState(false);
  const [stateText, setStateText] = useState("No unsaved changes.");

  function onInput() {
    setChanged(true);
    setStateText("Unsaved changes.");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    setChanged(false);
    setStateText("Changes saved.");
    toast("Profile updated");
  }

  return (
    <>
      <header>
        <Eyebrow className="text-[var(--acc-sage-deep)]">Identity and contact</Eyebrow>
        <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93] tracking-[-.03em]">
          Profile.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
          Keep the personal information used for sign-in, delivery updates and account communication
          accurate.
        </p>
      </header>

      <form
        className={cn("mt-7 overflow-hidden", panelElevatedClass)}
        onInput={onInput}
        onSubmit={onSubmit}
      >
        <div className="border-b border-[var(--acc-line)] p-5 sm:p-6">
          <h2 className="font-serif text-3xl font-normal">Personal information</h2>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <LabeledField label="First name">
            <Input name="firstName" defaultValue="Ada" required className={fieldClass} />
          </LabeledField>
          <LabeledField label="Last name">
            <Input name="lastName" defaultValue="Okafor" required className={fieldClass} />
          </LabeledField>
          <LabeledField
            label="Preferred name"
            className="sm:col-span-2"
            hint="Used in account greetings only."
          >
            <Input name="preferredName" defaultValue="Ada" className={fieldClass} />
          </LabeledField>
        </div>

        <div className="grid gap-4 border-t border-[var(--acc-line)] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div>
            <p className="text-sm font-semibold">Email address</p>
            <p className="mt-1">ada@example.com</p>
            <p className="mt-2 text-sm text-[var(--acc-muted)]">
              Verified · Used for sign-in and order updates
            </p>
          </div>
          <AcctButton variant="secondary" type="button" onClick={() => openModal("email")}>
            Change email
          </AcctButton>
        </div>

        <div className="grid gap-4 border-t border-[var(--acc-line)] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div>
            <p className="text-sm font-semibold">Phone number</p>
            <p className={cn("mt-1", monoClass)}>+234 801 234 5678</p>
            <p className="mt-2 text-sm text-[var(--acc-muted)]">
              Verified · Used for delivery updates
            </p>
          </div>
          <AcctButton
            variant="secondary"
            type="button"
            onClick={() => toast("Phone verification flow would open.")}
          >
            Change phone
          </AcctButton>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--acc-line)] p-5 sm:p-6">
          <p className="text-sm text-[var(--acc-muted)]">{stateText}</p>
          <AcctButton type="submit" disabled={!changed}>
            Save changes
          </AcctButton>
        </div>
      </form>
    </>
  );
}
