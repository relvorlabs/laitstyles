import { describe, expect, it } from "vitest";
import { prepareMeasurementRows } from "./catalog-measurements";

describe("prepareMeasurementRows", () => {
  it("retains product and variant measurements with independent ordering", () => {
    const rows = [
      {
        id: "019f65c1-74fe-7bd3-8600-000000000001",
        product_id: "019f65c1-74fe-7bd3-8400-000000000001",
        variant_id: null,
        label: "Length",
        value: 68,
        unit: "cm",
      },
      {
        id: "019f65c1-74fe-7bd3-8600-000000000002",
        product_id: "019f65c1-74fe-7bd3-8400-000000000001",
        variant_id: "019f65c1-74fe-7bd3-8500-000000000001",
        label: "Chest",
        value: 54,
        unit: "cm",
      },
      {
        id: "019f65c1-74fe-7bd3-8600-000000000003",
        product_id: "019f65c1-74fe-7bd3-8400-000000000001",
        variant_id: "019f65c1-74fe-7bd3-8500-000000000001",
        label: "Sleeve",
        value: 61,
        unit: "cm",
      },
    ] as const;

    expect(prepareMeasurementRows(rows)).toEqual({
      productMeasurements: [
        {
          id: rows[0].id,
          product_id: rows[0].product_id,
          label: "Length",
          value: "68 cm",
          position: 0,
        },
      ],
      variantMeasurements: [
        {
          id: rows[1].id,
          variant_id: rows[1].variant_id,
          label: "Chest",
          value: "54 cm",
          position: 0,
        },
        {
          id: rows[2].id,
          variant_id: rows[2].variant_id,
          label: "Sleeve",
          value: "61 cm",
          position: 1,
        },
      ],
    });
  });
});
