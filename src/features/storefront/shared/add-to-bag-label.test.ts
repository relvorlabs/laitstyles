import { describe, expect, it } from "vitest";
import { addToBagLabel } from "./catalogue-data";

describe("addToBagLabel", () => {
  const cases: [Parameters<typeof addToBagLabel>[0], string][] = [
    [{ status: "sold", inventory: "one-of-one", stock: 0 }, "Sold"],
    [{ status: "reserved", inventory: "one-of-one", stock: 1 }, "Reserved"],
    [{ status: "available", inventory: "variant", stock: 4 }, "Select size"],
    [{ status: "available", inventory: "one-of-one", stock: 1 }, "Grab it — the only one"],
    [{ status: "available", inventory: "matching-stock", stock: 1 }, "Grab it — last one"],
    [{ status: "available", inventory: "matching-stock", stock: 3 }, "Add to bag · 3 left"],
    [{ status: "available", inventory: "matching-stock", stock: 12 }, "Add to bag"],
  ];

  it.each(cases)("labels %o as %s", (product, expected) => {
    expect(addToBagLabel(product)).toBe(expected);
  });

  it("prioritises sold status over inventory/stock", () => {
    expect(addToBagLabel({ status: "sold", inventory: "matching-stock", stock: 9 })).toBe("Sold");
  });
});
