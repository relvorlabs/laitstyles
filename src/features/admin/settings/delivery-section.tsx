"use client";

import { useFormContext } from "react-hook-form";
import { Field, FieldError } from "@/components/ui/field";
import { DeliveryPreview } from "@/features/admin/settings/delivery-preview";
import { DeliveryZoneList } from "@/features/admin/settings/delivery-zone-list";
import { PickupLocationList } from "@/features/admin/settings/pickup-location-list";
import { getSettingsFieldError } from "@/features/admin/settings/settings-errors";
import { SettingsSectionFrame } from "@/features/admin/settings/settings-section-frame";
import type { SaveStoreSettingsInput } from "@/lib/admin/types";

export function DeliverySection() {
  const {
    formState: { errors },
  } = useFormContext<SaveStoreSettingsInput>();
  const deliveryError = getSettingsFieldError(errors, "delivery.zones");

  return (
    <SettingsSectionFrame aside={<DeliveryPreview />} section="delivery">
      <DeliveryZoneList />
      <PickupLocationList />
      <Field data-invalid={Boolean(deliveryError)}>
        <FieldError>{deliveryError}</FieldError>
      </Field>
    </SettingsSectionFrame>
  );
}
