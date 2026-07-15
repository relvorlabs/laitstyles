import { Card } from "@/components/ui/card";
import { settingsSections } from "@/features/admin/settings/settings-config";
import type { SettingsSection } from "@/lib/admin/types";

export function SettingsStatusStrip({
  activeSection,
  dirty,
  updatedAt,
}: {
  activeSection: SettingsSection;
  dirty: boolean;
  updatedAt: string;
}) {
  const active = settingsSections.find((section) => section.value === activeSection);

  return (
    <Card className="grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
      <StatusItem label="Current section" value={active?.label ?? "Store identity"} />
      <StatusItem label="Form state" value={dirty ? "Unsaved changes" : "All changes saved"} />
      <StatusItem label="Last changed" value={formatUpdatedAt(updatedAt)} />
    </Card>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}
