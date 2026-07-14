import { AccountWorkspace } from "@/features/storefront/account/account-workspace";

// The consumer account workspace, migrated from
// docs/storefront-v2/card-lab/account-workspace.html into real components.
// Prototype data + interactions (Phase 2-3N track); real data wiring lands with
// the storefront-v2 account phase. The root SiteChrome supplies the shared
// header/footer and the `.lst-lab` style scope; this prototype renders dummy data
// without an auth gate.
export default function AccountPage() {
  return <AccountWorkspace />;
}
