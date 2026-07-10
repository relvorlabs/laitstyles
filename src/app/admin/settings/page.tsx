import { isSettingsSection } from "@/features/control-room/settings/settings-config";
import { SettingsWorkspace } from "@/features/control-room/settings/settings-workspace";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const params = await searchParams;
  const requested = Array.isArray(params.section) ? params.section[0] : params.section;

  return (
    <SettingsWorkspace initialSection={isSettingsSection(requested) ? requested : "identity"} />
  );
}
