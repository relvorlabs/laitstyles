import { describe, expect, it } from "vitest";
import { classifyFinanceTransaction } from "@/modules/payments/server/reconciliation";

const baseline = {
  providerAmountMinor: 25_000,
  providerCurrency: "NGN",
  providerStatus: "success",
  localAmountMinor: 25_000,
  localCurrency: "NGN",
  localStatus: "success",
};

describe("classifyFinanceTransaction", () => {
  it("reports matched facts only when amount, currency and status agree", () => {
    expect(classifyFinanceTransaction(baseline)).toBe("matched");
  });

  it("prioritizes amount and currency mismatches before status", () => {
    expect(
      classifyFinanceTransaction({
        ...baseline,
        providerAmountMinor: 25_001,
        providerCurrency: "USD",
        providerStatus: "failed",
      }),
    ).toBe("amount_mismatch");
    expect(
      classifyFinanceTransaction({
        ...baseline,
        providerCurrency: "USD",
        providerStatus: "failed",
      }),
    ).toBe("currency_mismatch");
  });

  it("reports provider/local status disagreement without treating it as success", () => {
    expect(classifyFinanceTransaction({ ...baseline, localStatus: "pending" })).toBe(
      "status_mismatch",
    );
    expect(
      classifyFinanceTransaction({
        ...baseline,
        providerStatus: "failed",
        localStatus: "failed",
      }),
    ).toBe("matched");
  });
});
