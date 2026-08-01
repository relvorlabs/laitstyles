import { describe, expect, it } from "vitest";
import { defaultStoreSettingsInput } from "@/lib/admin/settings/settings-defaults";
import {
  parseStoreSettingsInput,
  validateSettingsSection,
} from "@/lib/admin/settings/settings-schema";

function cloneDefaults() {
  return structuredClone(defaultStoreSettingsInput);
}

describe("Store settings validation", () => {
  it("accepts the deterministic prototype defaults", () => {
    const result = parseStoreSettingsInput(cloneDefaults());

    expect(result.ok).toBe(true);
  });

  it("normalizes numeric values captured from HTML controls", () => {
    const input = cloneDefaults() as unknown as Record<string, unknown>;
    const selling = input.selling as Record<string, unknown>;
    const delivery = input.delivery as {
      zones: Array<Record<string, unknown>>;
    };
    const payments = input.payments as Record<string, unknown>;
    selling.holdDurationMinutes = "25";
    selling.lowStockThreshold = "4";
    delivery.zones[0]!.rate = "5000";
    delivery.zones[0]!.estimatedMinDays = "2";
    delivery.zones[0]!.estimatedMaxDays = "3";
    payments.payOnDeliveryDepositPercent = "20";

    const result = parseStoreSettingsInput(input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.selling.holdDurationMinutes).toBe(25);
    expect(result.value.delivery.zones[0]?.rate).toBe(5000);
    expect(result.value.payments.payOnDeliveryDepositPercent).toBe(20);
  });

  it("returns business-language issues for invalid identity and selling values", () => {
    const input = cloneDefaults();
    input.identity.contactEmail = "not-an-email";
    input.selling.holdDurationMinutes = 2;
    input.selling.lowStockThreshold = -1;

    const result = parseStoreSettingsInput(input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "identity.contactEmail",
          section: "identity",
        }),
        expect.objectContaining({
          path: "selling.holdDurationMinutes",
          section: "selling",
        }),
        expect.objectContaining({
          path: "selling.lowStockThreshold",
          section: "selling",
        }),
      ]),
    );
  });

  it("keeps at least one delivery option and payment method available", () => {
    const input = cloneDefaults();
    input.delivery.zones.forEach((zone) => {
      zone.enabled = false;
    });
    input.delivery.pickupLocations.forEach((location) => {
      location.enabled = false;
    });
    input.payments.acceptedMethods = [];

    expect(validateSettingsSection(input, "delivery")).toEqual(
      expect.arrayContaining([expect.objectContaining({ section: "delivery" })]),
    );
    expect(validateSettingsSection(input, "payments")).toEqual(
      expect.arrayContaining([expect.objectContaining({ section: "payments" })]),
    );
  });

  it("requires exactly one enabled nationwide delivery fallback", () => {
    const missingFallback = cloneDefaults();
    missingFallback.delivery.zones.forEach((zone) => {
      zone.isNationwideFallback = false;
    });

    expect(validateSettingsSection(missingFallback, "delivery")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "delivery.zones",
          section: "delivery",
        }),
      ]),
    );

    const duplicateFallback = cloneDefaults();
    duplicateFallback.delivery.zones[0]!.isNationwideFallback = true;

    expect(validateSettingsSection(duplicateFallback, "delivery")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "delivery.zones",
          section: "delivery",
        }),
      ]),
    );
  });

  it("requires pay on delivery to agree across selling and payment settings", () => {
    const input = cloneDefaults();
    input.selling.payOnDeliveryEnabled = true;

    const result = parseStoreSettingsInput(input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "payments.acceptedMethods",
          section: "payments",
        }),
      ]),
    );
  });
});
