import { DeliverySection } from "@/features/admin/settings/delivery-section";
import { NotificationsSection } from "@/features/admin/settings/notifications-section";
import { PaymentsSection } from "@/features/admin/settings/payments-section";
import { SellingPreferencesSection } from "@/features/admin/settings/selling-preferences-section";
import { StoreIdentitySection } from "@/features/admin/settings/store-identity-section";
import { TeamSection } from "@/features/admin/settings/team-section";
import type { SettingsSection } from "@/lib/control-room/types";

export function SettingsSectionContent({ section }: { section: SettingsSection }) {
  switch (section) {
    case "identity":
      return <StoreIdentitySection />;
    case "selling":
      return <SellingPreferencesSection />;
    case "delivery":
      return <DeliverySection />;
    case "payments":
      return <PaymentsSection />;
    case "notifications":
      return <NotificationsSection />;
    case "team":
      return <TeamSection />;
  }
}
