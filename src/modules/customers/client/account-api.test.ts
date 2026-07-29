import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOwnedAddressRequest,
  deleteOwnedAddressRequest,
  getOwnedProfileRequest,
  listOwnedAddressesRequest,
  listSavedProductIdsRequest,
  removeSavedProductRequest,
  saveProductRequest,
  updateOwnedAddressRequest,
  updateOwnedProfileRequest,
} from "@/modules/customers/client/account-api";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("account customer API client", () => {
  it("reads the owned profile from the account profile endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({}));

    await getOwnedProfileRequest();

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/account/profile",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("sends a PATCH to update the owned profile", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({}));

    await updateOwnedProfileRequest({ firstName: "Ada", lastName: "Okafor" });

    const [, init] = fetchSpy.mock.calls[0] as [RequestInfo, RequestInit];
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({ firstName: "Ada", lastName: "Okafor" }));
  });

  it("lists owned addresses from the account addresses endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse([]));

    await listOwnedAddressesRequest();

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/account/addresses",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("creates an owned address with a POST", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({}));

    await createOwnedAddressRequest({ line1: "18 Example Road", city: "Lagos" });

    const [url, init] = fetchSpy.mock.calls[0] as [RequestInfo, RequestInit];
    expect(url).toBe("/api/v1/account/addresses");
    expect(init.method).toBe("POST");
  });

  it("updates an owned address by id with a PATCH", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({}));

    await updateOwnedAddressRequest({ addressId: "address-1", input: { city: "Abuja" } });

    const [url, init] = fetchSpy.mock.calls[0] as [RequestInfo, RequestInit];
    expect(url).toBe("/api/v1/account/addresses/address-1");
    expect(init.method).toBe("PATCH");
  });

  it("deletes an owned address by id", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({}));

    await deleteOwnedAddressRequest("address-1");

    const [url, init] = fetchSpy.mock.calls[0] as [RequestInfo, RequestInit];
    expect(url).toBe("/api/v1/account/addresses/address-1");
    expect(init.method).toBe("DELETE");
  });

  it("lists saved product ids from the account saved-products endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse([]));

    await listSavedProductIdsRequest();

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/account/saved-products",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("saves a product with a POST body of { productId }", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({}));

    await saveProductRequest("product-a");

    const [url, init] = fetchSpy.mock.calls[0] as [RequestInfo, RequestInit];
    expect(url).toBe("/api/v1/account/saved-products");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ productId: "product-a" }));
  });

  it("removes a saved product by id", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({}));

    await removeSavedProductRequest("product-a");

    const [url, init] = fetchSpy.mock.calls[0] as [RequestInfo, RequestInit];
    expect(url).toBe("/api/v1/account/saved-products/product-a");
    expect(init.method).toBe("DELETE");
  });
});
