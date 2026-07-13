import { describe, expect, it } from "vitest";
import { buildSettingsHref } from "@/features/control-room/settings/settings-url";

describe("buildSettingsHref", () => {
  it("keeps Store identity at the clean route", () => {
    expect(buildSettingsHref("/admin/settings", "identity")).toBe("/admin/settings");
  });

  it("writes another section into the query string", () => {
    expect(buildSettingsHref("/admin/settings", "team")).toBe("/admin/settings?section=team");
  });
});
