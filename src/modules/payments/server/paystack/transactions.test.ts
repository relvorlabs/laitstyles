import { afterEach, expect, it, vi } from "vitest";
import { initializeTransaction } from "@/modules/payments/server/paystack/transactions";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("omits callback_url when checkout runs on a local origin", async () => {
  vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        status: true,
        message: "Authorization URL created",
        data: {
          authorization_url: "https://checkout.paystack.com/access123",
          access_code: "access123",
          reference: "pay_1",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);

  await initializeTransaction({
    email: "buyer@example.com",
    amountMinor: 125_000,
    reference: "pay_1",
    metadata: { orderId: "order_1" },
  });

  const [, request] = fetchMock.mock.calls[0] ?? [];
  expect(JSON.parse(String(request?.body))).toEqual({
    email: "buyer@example.com",
    amount: 125_000,
    currency: "NGN",
    reference: "pay_1",
    metadata: JSON.stringify({ orderId: "order_1" }),
  });
});
