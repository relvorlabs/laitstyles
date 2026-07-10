"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  SettingsTextField,
  SettingsTextareaField,
} from "@/features/control-room/settings/settings-fields";
import { SettingsSectionFrame } from "@/features/control-room/settings/settings-section-frame";
import type { SaveStoreSettingsInput } from "@/lib/control-room/types";

export function StoreIdentitySection() {
  const { control } = useFormContext<SaveStoreSettingsInput>();
  const identity = useWatch({
    control,
    name: "identity",
  }) as SaveStoreSettingsInput["identity"];

  return (
    <SettingsSectionFrame
      aside={<StorefrontIdentityPreview identity={identity} />}
      section="identity"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <SettingsTextField
            autoComplete="organization"
            description="This appears in the Control Room and customer-facing store preview."
            label="Store name"
            name="identity.storeName"
            placeholder="Laitstyle"
          />
        </div>
        <div className="sm:col-span-2">
          <SettingsTextareaField
            description="Explain what makes the store distinctive in plain customer language."
            label="Store description"
            name="identity.description"
            placeholder="A considered fashion store for…"
            rows={5}
          />
        </div>
        <SettingsTextField
          autoComplete="email"
          label="Customer email"
          name="identity.contactEmail"
          placeholder="hello@example.com"
          type="email"
        />
        <SettingsTextField
          autoComplete="tel"
          label="Customer phone"
          name="identity.contactPhone"
          placeholder="+234…"
          type="tel"
        />
        <SettingsTextField
          autoComplete="tel"
          description="Shown with the store contact details customers can use."
          label="WhatsApp number"
          name="identity.whatsappNumber"
          placeholder="+234…"
          type="tel"
        />
        <SettingsTextField
          label="Instagram handle"
          name="identity.instagramHandle"
          placeholder="@laitstyle"
        />
        <SettingsTextField
          autoComplete="url"
          label="Website"
          name="identity.websiteUrl"
          placeholder="https://example.com"
          type="url"
        />
        <SettingsTextField
          description="Use a known image address for the preview. Direct logo upload is not available yet."
          label="Logo image"
          name="identity.logoPreviewUrl"
          placeholder="/logo.svg"
        />
      </div>
    </SettingsSectionFrame>
  );
}

function StorefrontIdentityPreview({
  identity,
}: {
  identity: SaveStoreSettingsInput["identity"];
}) {
  const name = identity?.storeName?.trim() || "Your store";
  const description =
    identity?.description?.trim() ||
    "Your store description will appear here as customers browse.";
  const initial = name.slice(0, 1).toUpperCase();
  const contact =
    identity?.contactEmail?.trim() ||
    identity?.contactPhone?.trim() ||
    "Customer contact not added";

  return (
    <Card
      aria-label="Storefront identity preview"
      className="overflow-hidden p-0"
    >
      <div className="border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Storefront preview
          </p>
          <Badge variant="outline">Updates as you type</Badge>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-background font-serif text-xl">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate font-serif text-xl font-medium">{name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {identity?.instagramHandle || "Fashion store"}
            </p>
          </div>
        </div>
        <p className="mt-5 line-clamp-5 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="aspect-[4/5] rounded-xl border border-border bg-muted/50" />
          <div className="aspect-[4/5] rounded-xl border border-border bg-muted/30" />
        </div>
        <div className="mt-5 rounded-xl border border-border px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Customer contact
          </p>
          <p className="mt-1 break-words text-xs leading-5">{contact}</p>
        </div>
        <p className="mt-4 break-all text-[10px] leading-4 text-muted-foreground">
          Logo image: {identity?.logoPreviewUrl || "Not set"}
        </p>
      </div>
    </Card>
  );
}
