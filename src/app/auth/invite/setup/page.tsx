"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError } from "@/lib/http/client";
import { createClient } from "@/lib/supabase/client";
import { completeManagerSetupRequest } from "@/modules/auth/client/staff-invitation-api";
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
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      const authClient = createClient();
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (accessToken && refreshToken) {
        const signInResult = await authClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (signInResult.error) {
          if (!cancelled) {
            setMessage(
              "This invitation is no longer available. Ask the store owner for a new invitation.",
            );
          }
          return;
        }
        window.history.replaceState(window.history.state, "", window.location.pathname);
      }

      const userResult = await authClient.auth.getUser();
      if (userResult.error || !userResult.data.user) {
        if (!cancelled) {
          setMessage(
            "This invitation is no longer available. Ask the store owner for a new invitation.",
          );
        }
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
      await completeManagerSetupRequest(form);
      router.replace("/admin");
    } catch (error: unknown) {
      setMessage(
        error instanceof ApiClientError || error instanceof Error
          ? error.message
          : "Your manager account could not be completed. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthPageShell
      description="Create your password and confirm your name to join the Laitstyle store team."
      eyebrow="Store manager invitation"
      highlights={[
        "Manage daily store operations",
        "Work with inventory, orders and customers",
        "Store ownership remains with the owner",
      ]}
      sideDescription="The store owner invited this email to join the team. Complete your details to open your workspace."
      sideTitle="Join the Laitstyle store team."
      staff
      title="Complete your manager account"
    >
      <div className="grid gap-6">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/35 p-4 text-sm leading-6 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          You will join as a store manager. Only the store owner can invite other team members or
          change ownership access.
        </div>

        {message ? <AuthStatusNotice tone="error">{message}</AuthStatusNotice> : null}

        {!ready && !message ? (
          <div
            className="rounded-2xl border border-border bg-muted/30 px-5 py-8 text-center text-sm text-muted-foreground"
            role="status"
          >
            Checking your invitation…
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
                  onChange={(event) =>
                    setForm((current) => ({ ...current, firstName: event.target.value }))
                  }
                  value={form.firstName}
                />
              </AuthField>
              <AuthField htmlFor="manager-last" label="Last name">
                <Input
                  autoComplete="family-name"
                  className={AUTH_INPUT_CLASS_NAME}
                  disabled={pending}
                  id="manager-last"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, lastName: event.target.value }))
                  }
                  value={form.lastName}
                />
              </AuthField>
            </div>
            <AuthField
              hint="At least 8 characters"
              htmlFor="manager-password"
              label="Create password"
            >
              <Input
                autoComplete="new-password"
                className={AUTH_INPUT_CLASS_NAME}
                disabled={pending}
                id="manager-password"
                minLength={8}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
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
                onChange={(event) =>
                  setForm((current) => ({ ...current, confirmPassword: event.target.value }))
                }
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
              {pending ? "Finishing your account…" : "Join the store team"}
              {!pending ? <ArrowRight className="size-4" /> : null}
            </Button>
          </div>
        ) : null}
      </div>
    </AuthPageShell>
  );
}
