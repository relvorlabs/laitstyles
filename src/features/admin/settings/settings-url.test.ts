import { describe, expect, it } from "vitest";
import { buildSettingsHref } from "@/features/admin/settings/settings-url";

describe("buildSettingsHref", () => {
  it("keeps Store identity at the clean route", () => {
    expect(buildSettingsHref("/admin/settings", "identity")).toBe("/admin/settings");
  });

  it("writes another section into the query string", () => {
    expect(buildSettingsHref("/admin/settings", "payments")).toBe("/admin/settings?section=payments");
  });
});
