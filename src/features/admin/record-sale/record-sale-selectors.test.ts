import { describe, expect, it } from "vitest";
import {
  createRecordSaleDefaults,
  getAvailableForSale,
  getSaleUnitPrice,
  getSelectedSaleProduct,
  getSellableProducts,
} from "@/features/admin/record-sale/record-sale-selectors";
import { activeAdminSeed } from "@/lib/admin/shared/admin-seed";

describe("Record Sale selectors", () => {
  it("starts from an available published product and existing customer", () => {
    const defaults = createRecordSaleDefaults(activeAdminSeed);
    const product = getSelectedSaleProduct(activeAdminSeed, defaults.productId);

    expect(product).not.toBeNull();
    expect(defaults.quantity).toBe(1);
    expect(defaults.customerId).toBe("customer-amara");
    expect(defaults.paymentStatus).toBe("paid");
    expect(defaults.channel).toBe("physical-store");
  });

  it("excludes unavailable and unpublished catalogue records", () => {
    const products = getSellableProducts(activeAdminSeed);
    const ids = products.map((product) => product.id);

    expect(ids).toContain("botanical-jeans");
    expect(ids).not.toContain("sage-field-vest");
    expect(ids).not.toContain("ivory-wrap-skirt");
    expect(ids).not.toContain("bloom-belted-coat");
  });

  it("uses the selected variant availability and optional price", () => {
    const product = getSelectedSaleProduct(activeAdminSeed, "ribbed-studio-tank");

    expect(getAvailableForSale(product!, "tank-s-cream")).toBe(2);
    expect(getAvailableForSale(product!, "tank-l-ink")).toBe(1);
    expect(getSaleUnitPrice(product, "tank-l-ink")).toBe(15500);
    expect(getSaleUnitPrice(product, "tank-s-cream")).toBe(14500);
  });
});
