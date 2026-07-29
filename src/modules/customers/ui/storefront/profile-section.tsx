"use client";

import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUpdateOwnedProfile } from "@/modules/customers/client/account-hooks";
import { updateOwnedProfileSchema } from "@/modules/customers/schema";
import {
  Eyebrow,
  LabeledField,
  panelElevatedClass,
} from "@/modules/storefront-shell/ui/account-primitives";

export type ProfileSectionProps = {
  email: string | null;
  firstName: string;
  lastName: string;
  preferredName: string;
  phone: string;
};

type FieldErrors = Partial<Record<"firstName" | "lastName" | "preferredName" | "phone", string>>;

export function ProfileSection(props: ProfileSectionProps) {
  const mutation = useUpdateOwnedProfile();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("No unsaved changes.");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = updateOwnedProfileSchema.safeParse({
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      preferredName: form.get("preferredName"),
      phone: form.get("phone"),
    });
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        firstName: flattened.firstName?.[0],
        lastName: flattened.lastName?.[0],
        preferredName: flattened.preferredName?.[0],
        phone: flattened.phone?.[0],
      });
      setMessage("Check the highlighted fields and try again.");
      return;
    }

    setPending(true);
    setFieldErrors({});
    setMessage("Saving your profile...");
    try {
      await mutation.mutateAsync(parsed.data);
      setMessage("Profile updated.");
      toast.success("Profile updated.");
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "We could not update your profile.";
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setPending(false);
    }
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

      <form className={cn("mt-7 overflow-hidden", panelElevatedClass)} onSubmit={submit}>
        <div className="border-b border-[var(--acc-line)] p-5 sm:p-6">
          <h2 className="font-serif text-3xl font-normal">Personal information</h2>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <LabeledField
            label="First name"
            htmlFor="profile-first-name"
            error={fieldErrors.firstName}
          >
            <Input
              defaultValue={props.firstName}
              id="profile-first-name"
              inputSize="lg"
              name="firstName"
              required
            />
          </LabeledField>
          <LabeledField label="Last name" htmlFor="profile-last-name" error={fieldErrors.lastName}>
            <Input
              defaultValue={props.lastName}
              id="profile-last-name"
              inputSize="lg"
              name="lastName"
              required
            />
          </LabeledField>
          <LabeledField
            label="Preferred name"
            htmlFor="profile-preferred-name"
            hint="Used in account greetings only."
            error={fieldErrors.preferredName}
          >
            <Input
              defaultValue={props.preferredName}
              id="profile-preferred-name"
              inputSize="lg"
              name="preferredName"
            />
          </LabeledField>
          <LabeledField
            label="Phone number"
            htmlFor="profile-phone"
            hint="Used for delivery updates."
            error={fieldErrors.phone}
          >
            <Input
              autoComplete="tel"
              defaultValue={props.phone}
              id="profile-phone"
              inputSize="lg"
              name="phone"
              type="tel"
            />
          </LabeledField>
        </div>

        <div className="grid gap-4 border-t border-[var(--acc-line)] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div>
            <p className="text-sm font-semibold">Email address</p>
            <p className="mt-1">{props.email ?? "No email address available"}</p>
            <p className="mt-2 text-sm text-[var(--acc-muted)]">
              Protected email changes are managed in account security.
            </p>
          </div>
          <Button
            render={<a href="/account/security" data-slot="button" />}
            size="lg"
            type="button"
            variant="outline"
          >
            Change email
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--acc-line)] p-5 sm:p-6">
          <p
            className={cn(
              "text-sm",
              Object.keys(fieldErrors).length ? "text-destructive" : "text-[var(--acc-muted)]",
            )}
            role={Object.keys(fieldErrors).length ? "alert" : "status"}
          >
            {message}
          </p>
          <Button disabled={pending} size="lg" type="submit">
            {pending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </>
  );
}
