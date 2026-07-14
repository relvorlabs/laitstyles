import { AccountWorkspace } from "@/features/storefront/account/account-workspace";
// The shared storefront chrome (SiteHeader/SiteFooter/overlays/brand marks from
// SiteChrome) is styled by the prototype's route-scoped `.lst-lab` stylesheet.
// /account renders that same chrome, so it must load the stylesheet too, or the
// header/footer/overlays render unstyled (giant brand marks, overlays dumped into
// page flow). The account content itself uses its own scoped `.lst-account` vars.
import "@/features/storefront/home-lab/home-lab.css";

// The consumer account workspace, migrated from
// docs/storefront-v2/card-lab/account-workspace.html into real components.
// Prototype data + interactions (Phase 2-3N track); real data wiring lands with
// the storefront-v2 account phase. The root SiteChrome supplies the shared
// header/footer; this prototype renders dummy data without an auth gate.
export default function AccountPage() {
  return <AccountWorkspace />;
}
