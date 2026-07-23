import { describe, expect, it } from "vitest";
import { groupVariantMeasurements } from "./variant-measurements";

describe("groupVariantMeasurements", () => {
  it("groups ordered measurements by variant", () => {
    expect(
      groupVariantMeasurements([
        { variant_id: "variant-a", label: "Chest", value: "54 cm", position: 0 },
        { variant_id: "variant-a", label: "Sleeve", value: "61 cm", position: 1 },
        { variant_id: "variant-b", label: "Chest", value: "58 cm", position: 0 },
      ]),
    ).toEqual({
      "variant-a": [
        { label: "Chest", value: "54 cm", position: 0 },
        { label: "Sleeve", value: "61 cm", position: 1 },
      ],
      "variant-b": [{ label: "Chest", value: "58 cm", position: 0 }],
    });
  });
});
