"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SettingsCheckboxField } from "@/features/control-room/settings/settings-fields";
import { SettingsSectionFrame } from "@/features/control-room/settings/settings-section-frame";
import type { SaveStoreSettingsInput } from "@/lib/control-room/types";

const notificationOptions = [
  {
    name: "notifications.newOrders" as const,
    key: "newOrders" as const,
    label: "New orders",
    description:
      "Surface new customer and offline orders that need payment or fulfilment work.",
  },
  {
    name: "notifications.expiringHolds" as const,
    key: "expiringHolds" as const,
    label: "Expiring holds",
    description:
      "Flag reservations that are close to release or need a customer decision.",
  },
  {
    name: "notifications.lowStock" as const,
    key: "lowStock" as const,
    label: "Low stock",
    description:
      "Highlight stocked products that reach the store warning threshold.",
  },
  {
    name: "notifications.paymentIssues" as const,
    key: "paymentIssues" as const,
    label: "Payment issues",
    description:
      "Surface pending, failed or disputed payment states that need review.",
  },
  {
    name: "notifications.deliveryExceptions" as const,
    key: "deliveryExceptions" as const,
    label: "Delivery exceptions",
    description: "Flag delayed, failed or otherwise at-risk delivery work.",
  },
] as const;

export function NotificationsSection() {
  const { control } = useFormContext<SaveStoreSettingsInput>();
  const notifications = useWatch({
    control,
    name: "notifications",
  }) as SaveStoreSettingsInput["notifications"];

  return (
    <SettingsSectionFrame
      aside={<NotificationPreview notifications={notifications} />}
      section="notifications"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {notificationOptions.map((option) => (
          <SettingsCheckboxField
            description={option.description}
            key={option.name}
            label={option.label}
            name={option.name}
          />
        ))}
      </div>
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs leading-5 text-muted-foreground">
        These choices decide what should appear inside the Control Room. They do not send email, SMS, push or WhatsApp messages.
      </div>
    </SettingsSectionFrame>
  );
}

function NotificationPreview({
  notifications,
}: {
  notifications: SaveStoreSettingsInput["notifications"];
}) {
  const enabled = notificationOptions.filter(
    (option) => notifications?.[option.key],
  );

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Attention coverage
        </p>
        <Badge variant="outline">{enabled.length} active</Badge>
      </div>
      <div className="space-y-2">
        {notificationOptions.map((option) => {
          const active = Boolean(notifications?.[option.key]);
          return (
            <div
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3"
              key={option.key}
            >
              <p className="text-sm">{option.label}</p>
              <Badge variant={active ? "secondary" : "outline"}>
                {active ? "On" : "Off"}
              </Badge>
            </div>
          );
        })}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Keep routine work calm while still surfacing sales and fulfilment risks that need attention.
      </p>
    </Card>
  );
}
