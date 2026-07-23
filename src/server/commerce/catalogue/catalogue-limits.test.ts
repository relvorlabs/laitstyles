import { describe, expect, it } from "vitest";
import {
  MAX_STOREFRONT_CATALOGUE_DETAILS,
  normalizePublishedProductDetailLimit,
} from "./catalogue-limits";

describe("normalizePublishedProductDetailLimit", () => {
  it("defaults invalid limits to the bounded full-catalogue ceiling", () => {
    expect(normalizePublishedProductDetailLimit()).toBe(MAX_STOREFRONT_CATALOGUE_DETAILS);
    expect(normalizePublishedProductDetailLimit(Number.NaN)).toBe(MAX_STOREFRONT_CATALOGUE_DETAILS);
    expect(normalizePublishedProductDetailLimit(Number.POSITIVE_INFINITY)).toBe(
      MAX_STOREFRONT_CATALOGUE_DETAILS,
    );
  });

  it("clamps finite limits to an integer between one and 300", () => {
    expect(normalizePublishedProductDetailLimit(-4)).toBe(1);
    expect(normalizePublishedProductDetailLimit(0)).toBe(1);
    expect(normalizePublishedProductDetailLimit(12.9)).toBe(12);
    expect(normalizePublishedProductDetailLimit(999)).toBe(300);
  });
});
