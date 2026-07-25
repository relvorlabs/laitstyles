import { afterEach, describe, expect, it, vi } from "vitest";
import {
  initializePaystackTransaction,
  PaystackConfigurationError,
  PaystackInitializationError,
} from "@/modules/payments/server/paystack";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("initializePaystackTransaction", () => {
  it("fails before making a request when the secret key is absent", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
    const fetchImplementation = vi.fn<typeof fetch>();

    await expect(
      initializePaystackTransaction(
        {
          email: "customer@example.com",
          amountKobo: 250_000,
          reference: "LS-INPERSON-test",
          metadata: { orderId: "order-1" },
        },
        fetchImplementation,
      ),
    ).rejects.toBeInstanceOf(PaystackConfigurationError);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("initializes from the server and returns the persisted checkout fields", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_example");
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: true,
          message: "Authorization URL created",
          data: {
            authorization_url: "https://checkout.paystack.com/access123",
            access_code: "access123",
            reference: "LS-INPERSON-test",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await initializePaystackTransaction(
      {
        email: "customer@example.com",
        amountKobo: 250_000,
        reference: "LS-INPERSON-test",
        metadata: { orderId: "order-1", source: "in-person-admin-sale" },
      },
      fetchImplementation,
    );

    expect(result).toMatchObject({
      authorizationUrl: "https://checkout.paystack.com/access123",
      accessCode: "access123",
      reference: "LS-INPERSON-test",
    });
    expect(fetchImplementation).toHaveBeenCalledOnce();
    const [, init] = fetchImplementation.mock.calls[0] ?? [];
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer sk_test_example");
    expect(JSON.parse(String(init?.body))).toEqual({
      email: "customer@example.com",
      amount: "250000",
      currency: "NGN",
      reference: "LS-INPERSON-test",
      metadata: JSON.stringify({ orderId: "order-1", source: "in-person-admin-sale" }),
    });
  });

  it("surfaces a stable initialization failure for an upstream rejection", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_example");
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: false, message: "Duplicate reference" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      initializePaystackTransaction(
        {
          email: "customer@example.com",
          amountKobo: 250_000,
          reference: "LS-INPERSON-test",
          metadata: { orderId: "order-1" },
        },
        fetchImplementation,
      ),
    ).rejects.toMatchObject<PaystackInitializationError>({
      name: "PaystackInitializationError",
      message: "Duplicate reference",
    });
  });
});
