"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_INPUT_CLASS_NAME,
  AUTH_PRIMARY_BUTTON_CLASS_NAME,
  AuthField,
  AuthPageShell,
  AuthStatusNotice,
} from "@/modules/auth/ui/auth-page-shell";

export default function ManagerInviteSetupPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", password: "", confirmPassword: "" });

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      const supabase = createClient();
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (accessToken && refreshToken) {
        const sessionResult = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionResult.error) {
          if (!cancelled) setMessage("This invitation is invalid or has expired. Ask the store owner for a new invitation.");
          return;
        }
        window.history.replaceState(window.history.state, "", window.location.pathname);
      }

      const userResult = await supabase.auth.getUser();
      if (userResult.error || !userResult.data.user) {
        if (!cancelled) setMessage("This invitation session is missing or has expired. Ask the store owner for a new invitation.");
        return;
      }

      const metadata = userResult.data.user.user_metadata ?? {};
      if (!cancelled) {
        setForm((current) => ({
          ...current,
          firstName: typeof metadata.first_name === "string" ? metadata.first_name : "",
          lastName: typeof metadata.last_name === "string" ? metadata.last_name : "",
        }));
        setReady(true);
      }
    }
    void initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  async function completeSetup() {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/auth/invite/finalize", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { ok: boolean; message: string };
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      router.replace("/admin");
    } catch {
      setMessage("Your manager account could not be completed. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthPageShell
      description="Create your password and confirm your profile. This invitation gives you store-manager access, not owner permissions."
      eyebrow="Store manager invitation"
      highlights={[
        "Manager-level operational access",
        "No store-owner or team-invitation permissions",
        "Password and profile completed by you",
      ]}
      sideDescription="The store owner invited this email through Supabase Auth. Your role was assigned on the server before this link was sent and cannot be changed from this form."
      sideTitle="Join the Laitstyle store team."
      staff
      title="Complete your manager account"
    >
      <div className="grid gap-6">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/35 p-4 text-sm leading-6 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          You will enter Admin as a store manager. Only the existing owner can invite staff or change ownership-level access.
        </div>

        {message ? <AuthStatusNotice tone="error">{message}</AuthStatusNotice> : null}

        {!ready && !message ? (
          <div className="rounded-2xl border border-border bg-muted/30 px-5 py-8 text-center text-sm text-muted-foreground" role="status">
            Verifying your invitation…
          </div>
        ) : null}

        {ready ? (
          <div className="grid gap-[18px]">
            <div className="grid gap-[18px] sm:grid-cols-2">
              <AuthField htmlFor="manager-first" label="First name">
                <Input
                  autoComplete="given-name"
                  className={AUTH_INPUT_CLASS_NAME}
                  disabled={pending}
                  id="manager-first"
                  onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                  value={form.firstName}
                />
              </AuthField>
              <AuthField htmlFor="manager-last" label="Last name">
                <Input
                  autoComplete="family-name"
                  className={AUTH_INPUT_CLASS_NAME}
                  disabled={pending}
                  id="manager-last"
                  onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                  value={form.lastName}
                />
              </AuthField>
            </div>
            <AuthField hint="At least 8 characters" htmlFor="manager-password" label="Create password">
              <Input
                autoComplete="new-password"
                className={AUTH_INPUT_CLASS_NAME}
                disabled={pending}
                id="manager-password"
                minLength={8}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                type="password"
                value={form.password}
              />
            </AuthField>
            <AuthField htmlFor="manager-confirm-password" label="Confirm password">
              <Input
                autoComplete="new-password"
                className={AUTH_INPUT_CLASS_NAME}
                disabled={pending}
                id="manager-confirm-password"
                minLength={8}
                onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                type="password"
                value={form.confirmPassword}
              />
            </AuthField>
            <Button
              className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`}
              disabled={pending}
              onClick={completeSetup}
              size="lg"
              type="button"
            >
              {pending ? "Completing account…" : "Join as store manager"}
              {!pending ? <ArrowRight className="size-4" /> : null}
            </Button>
          </div>
        ) : null}
      </div>
    </AuthPageShell>
  );
}
