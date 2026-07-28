"use client";

import { useActionState, useEffect } from "react";
import {
  INITIAL_PROFILE_ACTION_STATE,
  updateAccountProfile,
} from "@/app/(storefront)/account/profile/actions";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAccountUi } from "../account-context";
import {
  AcctButton,
  Eyebrow,
  LabeledField,
  panelElevatedClass,
} from "../components/account-primitives";

type ProfileSectionProps = {
  email: string | null;
  firstName: string;
  lastName: string;
  preferredName: string;
  phone: string;
};

export function ProfileSection({
  email,
  firstName,
  lastName,
  preferredName,
  phone,
}: ProfileSectionProps) {
  const { openModal, toast } = useAccountUi();
  const [state, formAction, pending] = useActionState(
    updateAccountProfile,
    INITIAL_PROFILE_ACTION_STATE,
  );

  useEffect(() => {
    if (state.status === "success") toast(state.message);
  }, [state, toast]);

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

      <form action={formAction} className={cn("mt-7 overflow-hidden", panelElevatedClass)}>
        <div className="border-b border-[var(--acc-line)] p-5 sm:p-6">
          <h2 className="font-serif text-3xl font-normal">Personal information</h2>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <LabeledField
            label="First name"
            htmlFor="profile-first-name"
            error={state.fieldErrors?.firstName}
            success={state.status === "success" && !state.fieldErrors?.firstName ? "Saved." : null}
          >
            <Input
              id="profile-first-name"
              aria-invalid={Boolean(state.fieldErrors?.firstName)}
              isValid={state.status === "success" && !state.fieldErrors?.firstName}
              defaultValue={firstName}
              inputSize="lg"
              name="firstName"
              required
            />
          </LabeledField>
          <LabeledField
            label="Last name"
            htmlFor="profile-last-name"
            error={state.fieldErrors?.lastName}
            success={state.status === "success" && !state.fieldErrors?.lastName ? "Saved." : null}
          >
            <Input
              id="profile-last-name"
              aria-invalid={Boolean(state.fieldErrors?.lastName)}
              isValid={state.status === "success" && !state.fieldErrors?.lastName}
              defaultValue={lastName}
              inputSize="lg"
              name="lastName"
              required
            />
          </LabeledField>
          <LabeledField
            label="Preferred name"
            htmlFor="profile-preferred-name"
            hint="Used in account greetings only."
            error={state.fieldErrors?.preferredName}
            success={
              state.status === "success" && !state.fieldErrors?.preferredName ? "Saved." : null
            }
          >
            <Input
              id="profile-preferred-name"
              aria-invalid={Boolean(state.fieldErrors?.preferredName)}
              isValid={state.status === "success" && !state.fieldErrors?.preferredName}
              defaultValue={preferredName}
              inputSize="lg"
              name="preferredName"
            />
          </LabeledField>
          <LabeledField
            label="Phone number"
            htmlFor="profile-phone"
            hint="Used for delivery updates."
            error={state.fieldErrors?.phone}
            success={state.status === "success" && !state.fieldErrors?.phone ? "Saved." : null}
          >
            <Input
              id="profile-phone"
              aria-invalid={Boolean(state.fieldErrors?.phone)}
              isValid={state.status === "success" && !state.fieldErrors?.phone}
              autoComplete="tel"
              defaultValue={phone}
              inputSize="lg"
              name="phone"
              type="tel"
            />
          </LabeledField>
        </div>

        <div className="grid gap-4 border-t border-[var(--acc-line)] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div>
            <p className="text-sm font-semibold">Email address</p>
            <p className="mt-1">{email ?? "No email address available"}</p>
            <p className="mt-2 text-sm text-[var(--acc-muted)]">
              Supabase Auth owns sign-in email verification and protected email changes.
            </p>
          </div>
          <AcctButton variant="secondary" type="button" onClick={() => openModal("email")}>
            Change email
          </AcctButton>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--acc-line)] p-5 sm:p-6">
          <p
            className={cn(
              "text-sm",
              state.status === "error" ? "text-destructive" : "text-[var(--acc-muted)]",
            )}
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
          <AcctButton type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save changes"}
          </AcctButton>
        </div>
      </form>
    </>
  );
}
