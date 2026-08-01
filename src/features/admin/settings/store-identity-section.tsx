"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { LaitstyleSymbol } from "@/components/brand/laitstyle-symbol";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CloudImage } from "@/components/ui/cloud-image";
import { CloudUploadButton } from "@/components/ui/cloud-upload-button";
import { FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  SettingsTextareaField,
  SettingsTextField,
} from "@/features/admin/settings/settings-fields";
import { SettingsSectionFrame } from "@/features/admin/settings/settings-section-frame";
import type { SaveStoreSettingsInput } from "@/lib/admin/shared/types";
import type { UploadedCloudinaryAsset } from "@/lib/assets/client/cloudinary-upload";

export function StoreIdentitySection() {
  const { control, setValue } = useFormContext<SaveStoreSettingsInput>();
  const identity = useWatch({
    control,
    name: "identity",
  }) as SaveStoreSettingsInput["identity"];

  function handleLogoUpload(image: UploadedCloudinaryAsset) {
    setValue(
      "identity.logo",
      {
        publicId: image.publicId,
        url: image.url,
        width: image.width,
        height: image.height,
        format: image.format,
        bytes: image.bytes,
      },
      { shouldDirty: true },
    );
  }

  function removeLogo() {
    setValue("identity.logo", null, { shouldDirty: true });
  }

  return (
    <SettingsSectionFrame
      aside={<StorefrontIdentityPreview identity={identity} />}
      section="identity"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <SettingsTextField
            autoComplete="off"
            description="This appears in Admin and the customer-facing store preview."
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
        <div className="space-y-2 sm:col-span-2">
          <FieldLabel>Logo image</FieldLabel>
          <FieldDescription>
            The approved woven mark is used by default. Upload a custom logo to use it in
            transactional emails and other branded surfaces instead.
          </FieldDescription>
          {identity?.logo ? (
            <div className="flex items-center gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
                <CloudImage
                  alt="Store logo"
                  className="object-contain p-1"
                  fill
                  sizes="56px"
                  src={identity.logo.url}
                />
              </div>
              <Button onClick={removeLogo} size="sm" type="button" variant="outline">
                Remove logo
              </Button>
            </div>
          ) : (
            <CloudUploadButton
              folder="laitstyles/brand"
              label="Upload logo"
              multiple={false}
              onAsset={handleLogoUpload}
              variant="outline"
            />
          )}
        </div>
      </div>
    </SettingsSectionFrame>
  );
}

function StorefrontIdentityPreview({ identity }: { identity: SaveStoreSettingsInput["identity"] }) {
  const name = identity?.storeName?.trim() || "Your store";
  const description =
    identity?.description?.trim() || "Your store description will appear here as customers browse.";
  const logo = identity?.logo;
  const contact =
    identity?.contactEmail?.trim() ||
    identity?.contactPhone?.trim() ||
    "Customer contact not added";

  return (
    <Card aria-label="Storefront identity preview" className="overflow-hidden p-0">
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
          <div className="relative flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground">
            {logo ? (
              <CloudImage alt="" className="object-contain p-1" fill sizes="56px" src={logo.url} />
            ) : (
              <LaitstyleSymbol aria-hidden="true" className="h-10 w-7" focusable="false" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-serif text-xl font-medium">{name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {identity?.instagramHandle || "Fashion store"}
            </p>
          </div>
        </div>
        <p className="mt-5 line-clamp-5 text-sm leading-6 text-muted-foreground">{description}</p>
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
          Logo: {logo ? logo.publicId : "Using the approved woven mark"}
        </p>
      </div>
    </Card>
  );
}
