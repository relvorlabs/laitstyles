"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { settingsSections } from "@/features/admin/settings/settings-config";
import type { SettingsSection } from "@/lib/control-room/types";

export function SettingsNavigation({
  activeSection,
  dirtySections,
  errorCounts,
  onChange,
}: {
  activeSection: SettingsSection;
  dirtySections: Partial<Record<SettingsSection, boolean>>;
  errorCounts: Record<SettingsSection, number>;
  onChange: (section: SettingsSection) => void;
}) {
  return (
    <>
      <div className="lg:hidden">
        <label
          className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          htmlFor="settings-section-select"
        >
          Settings section
        </label>
        <Select
          onValueChange={(value) => onChange((value ?? "identity") as SettingsSection)}
          value={activeSection}
        >
          <SelectTrigger
            aria-label="Choose settings section"
            className="h-12 w-full bg-card"
            id="settings-section-select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {settingsSections.map((section) => (
                <SelectItem key={section.value} value={section.value}>
                  {section.label}
                  {errorCounts[section.value]
                    ? ` · ${errorCounts[section.value]} issue${errorCounts[section.value] === 1 ? "" : "s"}`
                    : dirtySections[section.value]
                      ? " · unsaved"
                      : ""}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Card className="sticky top-6 hidden gap-2 p-3 lg:flex">
        <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Store settings
        </p>
        <nav aria-label="Store settings sections" className="mt-1 flex flex-col gap-1">
          {settingsSections.map((section, index) => {
            const active = section.value === activeSection;
            const issues = errorCounts[section.value];
            const dirty = dirtySections[section.value];
            return (
              <Button
                aria-current={active ? "page" : undefined}
                className="h-auto min-h-16 justify-start rounded-xl px-3 py-3 text-left"
                key={section.value}
                onClick={() => onChange(section.value)}
                type="button"
                variant={active ? "secondary" : "ghost"}
              >
                <span className="mr-3 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[10px] font-semibold tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{section.label}</span>
                  <span className="mt-1 block text-wrap text-[11px] font-normal leading-4 text-muted-foreground">
                    {issues
                      ? `${issues} issue${issues === 1 ? "" : "s"} to review`
                      : dirty
                        ? "Unsaved changes"
                        : section.description}
                  </span>
                </span>
              </Button>
            );
          })}
        </nav>
        <div className="mx-3 mt-2 border-t border-border pt-4 text-[11px] leading-5 text-muted-foreground">
          Changes remain until the page is refreshed.
        </div>
      </Card>
    </>
  );
}
