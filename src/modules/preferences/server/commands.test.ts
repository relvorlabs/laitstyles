import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer_preferences: {
      findUnique: mocks.findUnique,
      upsert: mocks.upsert,
    },
  },
}));

import { updateCustomerPreferences } from "@/modules/preferences/server/commands";
import { getCustomerPreferences } from "@/modules/preferences/server/queries";
import { DEFAULT_CUSTOMER_PREFERENCES } from "@/modules/preferences/types";

const identity = { customerId: "11111111-1111-4111-8111-111111111111" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCustomerPreferences", () => {
  it("creates deterministic defaults for a customer without a row", async () => {
    mocks.findUnique.mockResolvedValue(null);

    await expect(getCustomerPreferences(identity)).resolves.toEqual(DEFAULT_CUSTOMER_PREFERENCES);
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { customer_id: identity.customerId },
    });
  });

  it("maps a persisted row instead of the defaults", async () => {
    mocks.findUnique.mockResolvedValue({
      contact_channel: "whatsapp",
      sizing_unit: "imperial",
      marketing_opt_in: true,
      personalization_enabled: false,
      updated_at: new Date("2026-07-01T00:00:00.000Z"),
    });

    await expect(getCustomerPreferences(identity)).resolves.toEqual({
      contactChannel: "whatsapp",
      sizingUnit: "imperial",
      marketingOptIn: true,
      personalizationEnabled: false,
      updatedAt: "2026-07-01T00:00:00.000Z",
    });
  });
});

describe("updateCustomerPreferences", () => {
  it("upserts the customer's own row and returns the mapped result", async () => {
    mocks.upsert.mockResolvedValue({
      contact_channel: "sms",
      sizing_unit: "metric",
      marketing_opt_in: true,
      personalization_enabled: true,
      updated_at: new Date("2026-07-02T00:00:00.000Z"),
    });

    const result = await updateCustomerPreferences(identity, {
      contactChannel: "sms",
      sizingUnit: "metric",
      marketingOptIn: true,
      personalizationEnabled: true,
    });

    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { customer_id: identity.customerId },
      create: {
        customer_id: identity.customerId,
        contact_channel: "sms",
        sizing_unit: "metric",
        marketing_opt_in: true,
        personalization_enabled: true,
      },
      update: {
        contact_channel: "sms",
        sizing_unit: "metric",
        marketing_opt_in: true,
        personalization_enabled: true,
      },
    });
    expect(result.contactChannel).toBe("sms");
    expect(result.updatedAt).toBe("2026-07-02T00:00:00.000Z");
  });
});
