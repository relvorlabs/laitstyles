"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  FormProvider,
  useForm,
  type FieldErrors,
  type FieldPath,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingsSections } from "@/features/control-room/settings/settings-config";
import {
  countSettingsSectionErrors,
  getFirstSettingsErrorSection,
} from "@/features/control-room/settings/settings-errors";
import { SettingsHeader } from "@/features/control-room/settings/settings-header";
import { SettingsNavigation } from "@/features/control-room/settings/settings-navigation";
import {
  SettingsSaveBar,
  type SettingsFeedback,
} from "@/features/control-room/settings/settings-save-bar";
import { SettingsSectionContent } from "@/features/control-room/settings/settings-section-content";
import { SettingsStatusStrip } from "@/features/control-room/settings/settings-status-strip";
import { buildSettingsHref } from "@/features/control-room/settings/settings-url";
import { useControlRoom } from "@/features/control-room/state/control-room-provider";
import { createDefaultStoreSettings } from "@/lib/control-room/settings-defaults";
import { storeSettingsInputSchema } from "@/lib/control-room/settings-schema";
import type {
  SaveStoreSettingsInput,
  SettingsSection,
  StoreSettings,
} from "@/lib/control-room/types";

export function SettingsWorkspace({
  initialSection,
}: {
  initialSection: SettingsSection;
}) {
  const pathname = usePathname();
  const { state, saveStoreSettings } = useControlRoom();
  const persistedSettings =
    state.settings ?? createDefaultStoreSettings(state.asOf);
  const [activeSection, setActiveSection] =
    useState<SettingsSection>(initialSection);
  const [feedback, setFeedback] = useState<SettingsFeedback | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const methods = useForm<SaveStoreSettingsInput>({
    defaultValues: createSettingsInput(persistedSettings),
    mode: "onBlur",
    shouldUnregister: false,
    resolver: zodResolver(
      storeSettingsInputSchema,
    ) as Resolver<SaveStoreSettingsInput>,
  });

  const errorCounts = useMemo(
    () =>
      Object.fromEntries(
        settingsSections.map((section) => [
          section.value,
          countSettingsSectionErrors(methods.formState.errors, section.value),
        ]),
      ) as Record<SettingsSection, number>,
    [methods.formState.errors],
  );
  const dirtySections = useMemo(
    () =>
      Object.fromEntries(
        settingsSections.map((section) => [
          section.value,
          Boolean(methods.formState.dirtyFields[section.value]),
        ]),
      ) as Partial<Record<SettingsSection, boolean>>,
    [methods.formState.dirtyFields],
  );

  useEffect(() => {
    if (!methods.formState.isDirty) return;
    const protectUnsavedChanges = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectUnsavedChanges);
    return () => window.removeEventListener("beforeunload", protectUnsavedChanges);
  }, [methods.formState.isDirty]);

  useEffect(() => {
    const subscription = methods.watch(() => {
      if (feedback) setFeedback(null);
    });
    return () => subscription.unsubscribe();
  }, [feedback, methods]);

  function changeSection(section: SettingsSection) {
    setActiveSection(section);
    window.history.replaceState(
      null,
      "",
      buildSettingsHref(pathname, section),
    );
  }

  function applyIssues(
    issues: Array<{ path: string; message: string; section: SettingsSection }>,
  ) {
    for (const issue of issues) {
      methods.setError(issue.path as FieldPath<SaveStoreSettingsInput>, {
        type: "server",
        message: issue.message,
      });
    }
  }

  async function save(values: SaveStoreSettingsInput) {
    setFeedback(null);
    const result = saveStoreSettings(values);
    if (!result.ok) {
      const issues = result.error.issues ?? [];
      applyIssues(issues);
      const firstSection = issues[0]?.section;
      if (firstSection) changeSection(firstSection);
      setFeedback({
        tone: "error",
        title: "Store settings could not be saved",
        message: result.error.message,
      });
      return;
    }

    methods.reset(createSettingsInput(result.value.settings));
    setFeedback({
      tone: "success",
      title: "Store settings saved",
      message: result.value.message,
    });
  }

  function handleInvalid(errors: FieldErrors<SaveStoreSettingsInput>) {
    const firstSection = getFirstSettingsErrorSection(errors);
    if (firstSection) changeSection(firstSection);
    setFeedback({
      tone: "error",
      title: "Review the highlighted settings",
      message:
        "At least one section contains information that is missing or inconsistent.",
    });
  }

  function discardChanges() {
    methods.reset(createSettingsInput(persistedSettings));
    setFeedback({
      tone: "success",
      title: "Unsaved changes discarded",
      message: "The form has returned to the last saved values.",
    });
    setDiscardOpen(false);
  }

  return (
    <FormProvider {...methods}>
      <form
        className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
        noValidate
        onSubmit={methods.handleSubmit(save, handleInvalid)}
      >
        <SettingsHeader />
        <SettingsStatusStrip
          activeSection={activeSection}
          dirty={methods.formState.isDirty}
          updatedAt={persistedSettings.updatedAt}
        />

        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SettingsNavigation
            activeSection={activeSection}
            dirtySections={dirtySections}
            errorCounts={errorCounts}
            onChange={changeSection}
          />
          <div className="min-w-0">
            <SettingsSectionContent section={activeSection} />
            <SettingsSaveBar
              dirty={methods.formState.isDirty}
              discardOpen={discardOpen}
              feedback={feedback}
              onDiscard={discardChanges}
              onDiscardOpenChange={setDiscardOpen}
              submitting={methods.formState.isSubmitting}
            />
          </div>
        </div>
      </form>
    </FormProvider>
  );
}

function createSettingsInput(settings: StoreSettings): SaveStoreSettingsInput {
  return structuredClone({
    identity: settings.identity,
    selling: settings.selling,
    delivery: settings.delivery,
    payments: settings.payments,
    notifications: settings.notifications,
    team: settings.team,
  });
}
