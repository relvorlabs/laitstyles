"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { accountExportDownloadUrl } from "@/modules/account-lifecycle/client/api";
import {
  accountDeletionRequestQueryOptions,
  accountExportsQueryOptions,
  useCancelAccountDeletion,
  useRequestAccountDeletion,
  useRequestAccountExport,
} from "@/modules/account-lifecycle/client/hooks";
import {
  privacyPreferencesQueryOptions,
  useUpdatePrivacyPreferences,
} from "@/modules/privacy/client/hooks";
import { useAccountUi } from "@/modules/storefront-shell/ui/account-context";
import {
  AcctButton,
  Eyebrow,
  panelClass,
  panelElevatedClass,
} from "@/modules/storefront-shell/ui/account-primitives";
import { selectRecentIds, useStorefrontUiStore } from "@/stores/storefront-ui.store";

export function PrivacySection() {
  const { toast } = useAccountUi();
  const preferences = useQuery(privacyPreferencesQueryOptions());
  const exportsQuery = useQuery(accountExportsQueryOptions());
  const deletion = useQuery(accountDeletionRequestQueryOptions());
  const updatePrivacy = useUpdatePrivacyPreferences();
  const requestExport = useRequestAccountExport();
  const requestDeletion = useRequestAccountDeletion();
  const cancelDeletion = useCancelAccountDeletion();
  const recentIds = useStorefrontUiStore(selectRecentIds);
  const clearRecent = useStorefrontUiStore((state) => state.clearRecent);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function updateConsent(key: "personalization" | "analytics", granted: boolean) {
    setError(null);
    try {
      await updatePrivacy.mutateAsync({ [key]: granted });
      toast("Privacy preference saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Privacy preferences could not be saved.");
    }
  }

  async function startExport() {
    setError(null);
    try {
      await requestExport.mutateAsync();
      toast("Account export requested");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The export could not be requested.");
    }
  }

  async function startDeletion() {
    setError(null);
    try {
      await requestDeletion.mutateAsync({ reason: "Requested from account privacy controls" });
      setConfirmation("");
      toast("Account deletion scheduled");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The deletion request could not be created.",
      );
    }
  }

  async function cancelScheduledDeletion() {
    setError(null);
    try {
      await cancelDeletion.mutateAsync();
      toast("Account deletion cancelled");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The deletion request could not be cancelled.",
      );
    }
  }

  return (
    <>
      <header>
        <Eyebrow className="text-[var(--acc-sage-deep)]">Data and account control</Eyebrow>
        <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
          Privacy.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
          Make data controls explicit, honest and separate from marketing preferences.
        </p>
      </header>
      {error ? (
        <p className="mt-5 text-[var(--acc-oxblood)]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-7 space-y-5">
        <section className={cn("overflow-hidden", panelElevatedClass)}>
          <div className="border-b border-[var(--acc-line)] p-5 sm:p-6">
            <h2 className="font-serif text-3xl font-normal">Privacy controls</h2>
          </div>
          {preferences.isPending ? (
            <p className="p-5" role="status">
              Loading privacy controls...
            </p>
          ) : null}
          {preferences.isError ? (
            <p className="p-5" role="alert">
              Privacy controls could not be loaded.
            </p>
          ) : null}
          {preferences.data ? (
            <div className="divide-y divide-[var(--acc-line)]">
              <label className="flex min-h-20 items-center justify-between gap-5 p-5 sm:p-6">
                <span>
                  <strong className="block">Personalized recommendations</strong>
                  <span className="mt-1 block text-sm text-[var(--acc-muted)]">
                    Use account activity to improve suggestions
                  </span>
                </span>
                <input
                  aria-label="Personalized recommendations"
                  type="checkbox"
                  checked={preferences.data.consents.personalization}
                  disabled={updatePrivacy.isPending}
                  onChange={(event) =>
                    updateConsent("personalization", event.currentTarget.checked)
                  }
                  className="size-5 accent-[var(--acc-ink)]"
                />
              </label>
              <label className="flex min-h-20 items-center justify-between gap-5 p-5 sm:p-6">
                <span>
                  <strong className="block">Analytics consent</strong>
                  <span className="mt-1 block text-sm text-[var(--acc-muted)]">
                    Allow privacy-controlled analytics
                  </span>
                </span>
                <input
                  aria-label="Analytics consent"
                  type="checkbox"
                  checked={preferences.data.consents.analytics}
                  disabled={updatePrivacy.isPending}
                  onChange={(event) => updateConsent("analytics", event.currentTarget.checked)}
                  className="size-5 accent-[var(--acc-ink)]"
                />
              </label>
              <div className="flex min-h-20 items-center justify-between gap-5 p-5 sm:p-6">
                <span>
                  <strong className="block">Recently viewed history</strong>
                  <span className="mt-1 block text-sm text-[var(--acc-muted)]">
                    {recentIds.length} products stored in this browser
                  </span>
                </span>
                <Button
                  size="lg"
                  type="button"
                  disabled={!recentIds.length}
                  onClick={() => {
                    clearRecent();
                    toast("Recently viewed history cleared");
                  }}
                  variant="link"
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <section className={cn("p-5 sm:p-6", panelClass)}>
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Eyebrow className="text-[var(--acc-muted)]">Data export</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-normal">
                Download a copy of your account data.
              </h2>
              <p className="mt-3 max-w-2xl text-[var(--acc-muted)]">
                Completed exports expire after seven days and remain private to your account.
              </p>
            </div>
            <AcctButton
              variant="secondary"
              disabled={requestExport.isPending}
              onClick={startExport}
            >
              {requestExport.isPending ? "Preparing export..." : "Request export"}
            </AcctButton>
          </div>
          {exportsQuery.isPending ? (
            <p className="mt-4" role="status">
              Loading export history...
            </p>
          ) : null}
          {exportsQuery.isError ? (
            <p className="mt-4" role="alert">
              Export history could not be loaded.
            </p>
          ) : null}
          {exportsQuery.data?.length ? (
            <ul className="mt-5 space-y-3">
              {exportsQuery.data.map((item) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--acc-line)] pt-3"
                  key={item.id}
                >
                  <span>
                    Export requested {new Date(item.requestedAt).toLocaleDateString()} -{" "}
                    {item.status}
                  </span>
                  {item.status === "ready" ? (
                    <a
                      data-slot="button"
                      className="font-semibold underline underline-offset-4"
                      href={accountExportDownloadUrl(item.id)}
                    >
                      Download
                    </a>
                  ) : item.status === "expired" ? (
                    <span className="text-sm text-[var(--acc-muted)]">Expired</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section
          className={cn("border-l-[5px] border-l-[var(--acc-oxblood)] p-5 sm:p-6", panelClass)}
        >
          <Eyebrow className="text-[var(--acc-oxblood)]">Danger zone</Eyebrow>
          <h2 className="mt-3 font-serif text-3xl font-normal">Delete account.</h2>
          <p className="mt-3 max-w-2xl text-[var(--acc-muted)]">
            Active orders, returns, refunds, disputes or payouts block execution. Approved
            transaction and audit facts are retained and anonymized under store policy.
          </p>
          {deletion.isPending ? (
            <p className="mt-4" role="status">
              Checking deletion status...
            </p>
          ) : null}
          {deletion.data ? (
            <div className="mt-5">
              <p>
                Status: <strong>{deletion.data.status}</strong>
                {deletion.data.scheduledFor
                  ? ` - scheduled for ${new Date(deletion.data.scheduledFor).toLocaleDateString()}`
                  : ""}
              </p>
              <AcctButton
                className="mt-4"
                variant="secondary"
                disabled={cancelDeletion.isPending}
                onClick={cancelScheduledDeletion}
              >
                {cancelDeletion.isPending ? "Cancelling..." : "Cancel deletion request"}
              </AcctButton>
            </div>
          ) : (
            <div className="mt-5 max-w-md">
              <label className="block text-sm font-semibold" htmlFor="delete-confirmation">
                Type DELETE to confirm
              </label>
              <input
                id="delete-confirmation"
                className="mt-2 h-11 w-full rounded-md border border-[var(--acc-line)] bg-transparent px-3"
                value={confirmation}
                onChange={(event) => setConfirmation(event.currentTarget.value)}
              />
              <AcctButton
                className="mt-4"
                variant="danger"
                disabled={confirmation !== "DELETE" || requestDeletion.isPending}
                onClick={startDeletion}
              >
                {requestDeletion.isPending ? "Scheduling deletion..." : "Request account deletion"}
              </AcctButton>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
