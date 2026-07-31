import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBalance } from "@/modules/payments/server/paystack/balance";
import { fetchBalanceLedger } from "@/modules/payments/server/paystack/ledger";
import {
  listSettlements,
  listSettlementTransactions,
} from "@/modules/payments/server/paystack/settlements";
import {
  fetchTransactionTimeline,
  fetchTransactionTotals,
  listTransactions,
} from "@/modules/payments/server/paystack/transactions";

function providerResponse(data: unknown, meta?: unknown) {
  return new Response(
    JSON.stringify({
      status: true,
      message: "Successful",
      data,
      ...(meta === undefined ? {} : { meta }),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

const pagination = { total: 1, skipped: 0, perPage: 25, page: 1, pageCount: 1 };

function financeTransaction() {
  return {
    id: 9_000_000_001,
    status: "success",
    reference: "finance_ref_1",
    amount: 125_000,
    currency: "NGN",
    authorization: {
      authorization_code: "AUTH_must_not_leave_list",
      channel: "card",
      reusable: true,
    },
    customer: {
      id: 44,
      email: "buyer@example.com",
      customer_code: "CUS_buyer",
    },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Paystack finance adapters", () => {
  it("normalizes every available balance in minor units", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      providerResponse([
        { currency: "NGN", balance: 1_700_000 },
        { currency: "USD", balance: 28_000 },
      ]),
    );

    await expect(fetchBalance(fetchMock)).resolves.toEqual([
      { currency: "NGN", availableMinor: 1_700_000 },
      { currency: "USD", availableMinor: 28_000 },
    ]);
  });

  it("preserves ledger pagination and classifies debits without losing signed amounts", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      providerResponse(
        [
          {
            id: 149_411_613,
            balance: 2_078_224_968,
            currency: "NGN",
            difference: -50_000,
            reason: "Owner transfer",
            model_responsible: "Transfer",
            model_row: 56_610_600,
            createdAt: "2026-07-30T10:00:00.000Z",
            updatedAt: "2026-07-30T10:00:01.000Z",
          },
        ],
        pagination,
      ),
    );

    const result = await fetchBalanceLedger({ page: 1, perPage: 25 }, fetchMock);
    expect(result.pagination).toEqual(pagination);
    expect(result.entries[0]).toMatchObject({
      id: "149411613",
      differenceMinor: -50_000,
      direction: "debit",
      sourceType: "Transfer",
      sourceId: "56610600",
    });
  });

  it("normalizes settlements and redacts reusable authorization secrets from list projections", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        providerResponse(
          [
            {
              id: 3_090_024,
              status: "success",
              currency: "NGN",
              total_amount: 995,
              effective_amount: 995,
              total_fees: 5,
              total_processed: 1_000,
              settlement_date: "2026-07-30T00:00:00.000Z",
              createdAt: "2026-07-30T01:00:00.000Z",
              updatedAt: "2026-07-30T08:00:00.000Z",
            },
          ],
          pagination,
        ),
      )
      .mockResolvedValueOnce(providerResponse([financeTransaction()], pagination));

    await expect(listSettlements({}, fetchMock)).resolves.toMatchObject({
      settlements: [
        {
          id: "3090024",
          status: "success",
          effectiveAmountMinor: 995,
          totalProcessedMinor: 1_000,
        },
      ],
    });
    const transactions = await listSettlementTransactions("3090024", {}, fetchMock);
    expect(transactions.transactions[0]?.authorization).toBeNull();
    expect(JSON.stringify(transactions)).not.toContain("AUTH_must_not_leave_list");
  });

  it("normalizes transaction totals and timeline without provider-only fields", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        providerResponse({
          total_transactions: 42,
          total_volume: 6_617_829_946,
          total_volume_by_currency: [{ currency: "NGN", amount: 6_617_829_946 }],
          pending_transfers: 100_000,
          pending_transfers_by_currency: [{ currency: "NGN", amount: 100_000 }],
        }),
      )
      .mockResolvedValueOnce(
        providerResponse({
          start_time: 1_724_318_098,
          time_spent: 4,
          attempts: 1,
          errors: 0,
          success: true,
          mobile: false,
          input: [],
          history: [{ type: "success", message: "Successfully paid", time: 4 }],
        }),
      )
      .mockResolvedValueOnce(providerResponse([financeTransaction()], pagination));

    await expect(fetchTransactionTotals({}, fetchMock)).resolves.toMatchObject({
      totalTransactions: 42,
      totalVolumeByCurrency: [{ currency: "NGN", amountMinor: 6_617_829_946 }],
    });
    await expect(fetchTransactionTimeline("finance_ref_1", fetchMock)).resolves.toMatchObject({
      success: true,
      history: [{ type: "success", elapsedSeconds: 4 }],
    });
    const list = await listTransactions({}, fetchMock);
    expect(list.transactions[0]?.authorization).toBeNull();
  });
});
