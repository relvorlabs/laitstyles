import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  fileURLToPath(new URL("./storefront-fonts.ts", import.meta.url)),
  "utf8",
);

describe("storefront font contract", () => {
  it("loads only the handoff font families", () => {
    expect(source).toContain("Manrope");
    expect(source).toContain("Newsreader");
    expect(source).not.toMatch(/Geist|Instrument_Serif/);
  });
});
