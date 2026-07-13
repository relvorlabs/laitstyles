import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { getSettingsSectionDefinition } from "@/features/control-room/settings/settings-config";
import type { SettingsSection } from "@/lib/control-room/types";

export function SettingsSectionFrame({
  section,
  children,
  aside,
}: {
  section: SettingsSection;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const definition = getSettingsSectionDefinition(section);

  return (
    <section aria-labelledby={`settings-${section}-heading`} className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {definition.outcome}
          </p>
          <h2
            className="mt-2 text-balance font-serif text-[30px] font-medium leading-tight sm:text-[34px]"
            id={`settings-${section}-heading`}
          >
            {definition.label}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {definition.description}
          </p>
        </div>
      </div>

      <div className={aside ? "grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]" : undefined}>
        <Card className="gap-6 p-5 sm:p-6">{children}</Card>
        {aside ? <div className="xl:sticky xl:top-6 xl:self-start">{aside}</div> : null}
      </div>
    </section>
  );
}
