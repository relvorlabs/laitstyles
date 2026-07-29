"use client";

import { XIcon } from "lucide-react";
import Image from "next/image";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useChangeAccountPassword,
  useCreateMfaChallenge,
  useEnrollTotp,
  useRemoveMfaFactor,
  useRequestAccountEmailChange,
  useSignOutOtherSessions,
  useVerifyMfaChallenge,
} from "@/modules/auth/client/account-security-hooks";
import { accountEmailChangeSchema, accountPasswordChangeSchema } from "@/modules/auth/schema";
import type { MfaEnrollTotpResult, MfaFactorSummary } from "@/modules/auth/types";

export type AccountSecurityModalId =
  | "email"
  | "password"
  | "mfa-enroll"
  | "mfa-remove"
  | "signout-all";

const securityModalIds = new Set<string>([
  "email",
  "password",
  "mfa-enroll",
  "mfa-remove",
  "signout-all",
]);

export function isAccountSecurityModalId(value: string | null): value is AccountSecurityModalId {
  return value !== null && securityModalIds.has(value);
}

export function AccountSecurityModals({
  modal,
  factor = null,
  onClose,
  onNotice,
}: {
  modal: AccountSecurityModalId | null;
  factor?: MfaFactorSummary | null;
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  return (
    <>
      <EmailChangeModal open={modal === "email"} onClose={onClose} />
      <PasswordChangeModal open={modal === "password"} onClose={onClose} onNotice={onNotice} />
      <MfaEnrollModal open={modal === "mfa-enroll"} onClose={onClose} onNotice={onNotice} />
      <MfaRemoveModal
        factor={factor}
        open={modal === "mfa-remove"}
        onClose={onClose}
        onNotice={onNotice}
      />
      <SignOutOthersModal open={modal === "signout-all"} onClose={onClose} onNotice={onNotice} />
    </>
  );
}

function EmailChangeModal({ open, onClose }: ModalProps) {
  const mutation = useRequestAccountEmailChange();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [error, setError] = useState<string>();
  const [resultEmail, setResultEmail] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const parsed = accountEmailChangeSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(parsed.error.flatten().fieldErrors.email?.[0]);
      return;
    }
    setFieldError(undefined);
    setSubmitting(true);
    try {
      const result = await mutation.mutateAsync(parsed.data);
      setResultEmail(result.email);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setEmail("");
    setFieldError(undefined);
    setError(undefined);
    setResultEmail(undefined);
    onClose();
  }

  return (
    <ModalShell open={open} onClose={close} eyebrow="Protected change" title="Change email.">
      {resultEmail ? (
        <div className="mt-6 space-y-5">
          <div className="rounded-[10px] bg-[var(--acc-bone-2)] p-5">
            <p className="font-semibold">Confirmation pending.</p>
            <p className="mt-2 leading-7 text-[var(--acc-muted)]">
              Follow the confirmation link sent to {resultEmail}. Your current address remains
              active until Supabase completes the change.
            </p>
          </div>
          <Footer>
            <Button type="button" onClick={close}>
              Done
            </Button>
          </Footer>
        </div>
      ) : (
        <form className="mt-6 space-y-5" onSubmit={submit}>
          <Field label="New email address" htmlFor="change-email-new-email" error={fieldError}>
            <Input
              id="change-email-new-email"
              aria-invalid={Boolean(fieldError)}
              inputSize="lg"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </Field>
          <p className="rounded-[10px] bg-[var(--acc-bone-2)] p-4 text-sm text-[var(--acc-muted)]">
            The current address remains active until the new address is verified.
          </p>
          <ErrorMessage message={error} />
          <Footer>
            <Button variant="outline" type="button" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending..." : "Continue"}
            </Button>
          </Footer>
        </form>
      )}
    </ModalShell>
  );
}

function PasswordChangeModal({ open, onClose, onNotice }: NoticeModalProps) {
  const mutation = useChangeAccountPassword();
  const [values, setValues] = useState({ currentPassword: "", password: "", confirmPassword: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const parsed = accountPasswordChangeSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(firstFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await mutation.mutateAsync(parsed.data);
      onNotice("Password changed");
      close();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setValues({ currentPassword: "", password: "", confirmPassword: "" });
    setFieldErrors({});
    setError(undefined);
    onClose();
  }

  return (
    <ModalShell open={open} onClose={close} eyebrow="Protected change" title="Change password.">
      <form className="mt-6 space-y-5" onSubmit={submit}>
        <PasswordField
          id="change-password-current"
          label="Current password"
          error={fieldErrors.currentPassword}
          value={values.currentPassword}
          onChange={(currentPassword) => setValues((current) => ({ ...current, currentPassword }))}
        />
        <PasswordField
          id="change-password-new"
          label="New password"
          error={fieldErrors.password}
          value={values.password}
          onChange={(password) => setValues((current) => ({ ...current, password }))}
        />
        <PasswordField
          id="change-password-confirm"
          label="Confirm new password"
          error={fieldErrors.confirmPassword}
          value={values.confirmPassword}
          onChange={(confirmPassword) => setValues((current) => ({ ...current, confirmPassword }))}
        />
        <ErrorMessage message={error} />
        <Footer>
          <Button variant="outline" type="button" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Updating..." : "Update password"}
          </Button>
        </Footer>
      </form>
    </ModalShell>
  );
}

function MfaEnrollModal({ open, onClose, onNotice }: NoticeModalProps) {
  const enroll = useEnrollTotp();
  const challenge = useCreateMfaChallenge();
  const verify = useVerifyMfaChallenge();
  const [friendlyName, setFriendlyName] = useState("");
  const [enrollment, setEnrollment] = useState<MfaEnrollTotpResult>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      setEnrollment(
        await enroll.mutateAsync(friendlyName.trim() ? { friendlyName: friendlyName.trim() } : {}),
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function complete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment) return;
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      const created = await challenge.mutateAsync({ factorId: enrollment.factorId });
      await verify.mutateAsync({
        challengeId: created.challengeId,
        factorId: enrollment.factorId,
        code,
      });
      onNotice("Two-factor authentication enabled");
      close();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setFriendlyName("");
    setEnrollment(undefined);
    setCode("");
    setError(undefined);
    onClose();
  }

  return (
    <ModalShell open={open} onClose={close} eyebrow="Authenticator app" title="Enable 2FA.">
      {enrollment ? (
        <form className="mt-6 space-y-5" onSubmit={complete}>
          <div className="rounded-[10px] bg-[var(--acc-bone-2)] p-5">
            <p className="font-semibold">Verification pending.</p>
            <p className="mt-2 text-sm leading-6 text-[var(--acc-muted)]">
              Scan this QR code, or enter the secret manually. This factor is not active until the
              six-digit code verifies successfully.
            </p>
            <Image
              alt="Authenticator QR code"
              className="mt-4 size-44 rounded-lg bg-white p-2"
              height={176}
              src={enrollment.totp.qrCode}
              unoptimized
              width={176}
            />
            <code className="mt-4 block break-all font-mono text-sm">{enrollment.totp.secret}</code>
          </div>
          <Field label="6-digit code" htmlFor="mfa-enroll-code">
            <Input
              id="mfa-enroll-code"
              autoComplete="one-time-code"
              inputMode="numeric"
              inputSize="lg"
              maxLength={6}
              onChange={(event) => setCode(event.target.value)}
              value={code}
            />
          </Field>
          <ErrorMessage message={error} />
          <Footer>
            <Button variant="outline" type="button" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Verifying..." : "Verify authenticator"}
            </Button>
          </Footer>
        </form>
      ) : (
        <form className="mt-6 space-y-5" onSubmit={start}>
          <Field label="Authenticator name" htmlFor="mfa-friendly-name">
            <Input
              id="mfa-friendly-name"
              inputSize="lg"
              maxLength={60}
              onChange={(event) => setFriendlyName(event.target.value)}
              placeholder="My phone"
              value={friendlyName}
            />
          </Field>
          <ErrorMessage message={error} />
          <Footer>
            <Button variant="outline" type="button" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Preparing..." : "Continue"}
            </Button>
          </Footer>
        </form>
      )}
    </ModalShell>
  );
}

function MfaRemoveModal({
  factor,
  open,
  onClose,
  onNotice,
}: NoticeModalProps & {
  factor: MfaFactorSummary | null;
}) {
  const challenge = useCreateMfaChallenge();
  const verify = useVerifyMfaChallenge();
  const remove = useRemoveMfaFactor();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factor) return;
    if (factor.status === "verified" && !/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      if (factor.status === "verified") {
        const created = await challenge.mutateAsync({ factorId: factor.id });
        await verify.mutateAsync({ challengeId: created.challengeId, factorId: factor.id, code });
      }
      await remove.mutateAsync(factor.id);
      onNotice("Authenticator removed");
      close();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setCode("");
    setError(undefined);
    onClose();
  }

  return (
    <ModalShell open={open} onClose={close} title="Remove this authenticator?" showClose={false}>
      <form className="mt-5 space-y-5" onSubmit={submit}>
        <p className="leading-7 text-[var(--acc-muted)]">
          {factor?.status === "verified"
            ? "Enter a current code before removing this verified factor."
            : "This pending authenticator has not been verified and can be removed directly."}
        </p>
        {factor?.status === "verified" ? (
          <Field label="6-digit code" htmlFor="mfa-remove-code">
            <Input
              id="mfa-remove-code"
              autoComplete="one-time-code"
              inputMode="numeric"
              inputSize="lg"
              maxLength={6}
              onChange={(event) => setCode(event.target.value)}
              value={code}
            />
          </Field>
        ) : null}
        <ErrorMessage message={error} />
        <Footer>
          <Button variant="outline" type="button" onClick={close}>
            Keep authenticator
          </Button>
          <Button variant="destructive" type="submit" disabled={submitting || !factor}>
            {submitting ? "Removing..." : "Remove authenticator"}
          </Button>
        </Footer>
      </form>
    </ModalShell>
  );
}

function SignOutOthersModal({ open, onClose, onNotice }: NoticeModalProps) {
  const mutation = useSignOutOtherSessions();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function confirm() {
    setError(undefined);
    setSubmitting(true);
    try {
      await mutation.mutateAsync();
      onNotice("Other sessions signed out");
      close();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setError(undefined);
    onClose();
  }

  return (
    <ModalShell open={open} onClose={close} title="Sign out other sessions?" showClose={false}>
      <p className="mt-4 leading-7 text-[var(--acc-muted)]">
        Supabase will end every other session it can revoke. This current session remains active.
      </p>
      <ErrorMessage message={error} />
      <Footer>
        <Button variant="outline" type="button" onClick={close}>
          Cancel
        </Button>
        <Button variant="destructive" type="button" onClick={confirm} disabled={submitting}>
          {submitting ? "Signing out..." : "Confirm sign out"}
        </Button>
      </Footer>
    </ModalShell>
  );
}

type ModalProps = { open: boolean; onClose: () => void };
type NoticeModalProps = ModalProps & { onNotice: (message: string) => void };

function ModalShell({
  open,
  onClose,
  title,
  eyebrow,
  showClose = true,
  children,
}: ModalProps & {
  title: string;
  eyebrow?: string;
  showClose?: boolean;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="lst-account block gap-0 rounded-[18px] bg-[var(--acc-surface)] p-5 text-[var(--acc-ink)] shadow-[var(--acc-shadow-md)] ring-0 sm:max-w-xl sm:p-7"
      >
        <div className={showClose ? "flex items-start justify-between gap-4" : undefined}>
          <div>
            {eyebrow ? (
              <p className="font-mono text-[.69rem] font-semibold uppercase leading-none tracking-[.13em] text-[var(--acc-oxblood)]">
                {eyebrow}
              </p>
            ) : null}
            <DialogTitle className={`font-serif text-4xl font-normal ${eyebrow ? "mt-3" : ""}`}>
              {title}
            </DialogTitle>
          </div>
          {showClose ? (
            <Button size="icon-lg" variant="outline" onClick={onClose} aria-label="Close">
              <XIcon className="size-[18px]" />
            </Button>
          ) : null}
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function PasswordField({
  id,
  label,
  error,
  value,
  onChange,
}: {
  id: string;
  label: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} htmlFor={id} error={error}>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        inputSize="lg"
        onChange={(event) => onChange(event.target.value)}
        required
        type="password"
        value={value}
      />
    </Field>
  );
}

function ErrorMessage({ message }: { message?: string }) {
  return message ? (
    <p className="mt-4 text-sm text-destructive" role="alert">
      {message}
    </p>
  ) : null;
}

function Footer({ children }: { children: ReactNode }) {
  return (
    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{children}</div>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "We could not complete that request. Please try again.";
}

function firstFieldErrors(errors: Record<string, string[] | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(errors).flatMap(([field, messages]) =>
      typeof messages?.[0] === "string" ? [[field, messages[0]]] : [],
    ),
  );
}
