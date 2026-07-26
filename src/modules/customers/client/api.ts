import { err, ok, type Result } from "@/lib/errors";
import { ApiClientError, apiRequest } from "@/lib/http/client";
import type {
  AdminCustomerListResult,
  CustomerActionError,
  CustomerListInput,
  CustomerNoteActionSuccess,
  CustomerRelationshipProfile,
} from "@/modules/customers/types";

const CUSTOMERS_URL = "/api/v1/admin/customers";

export async function listAdminCustomersRequest(
  input: CustomerListInput,
  signal?: AbortSignal,
): Promise<AdminCustomerListResult> {
  const params = new URLSearchParams({
    search: input.search,
    view: input.view,
    type: input.type,
    sort: input.sort,
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  const response = await apiRequest<CustomerRelationshipProfile[], AdminCustomerListResult["meta"]>(
    `${CUSTOMERS_URL}?${params.toString()}`,
    { cache: "no-store", signal },
  );
  if (!response.meta) {
    throw new ApiClientError({
      code: "INVALID_API_RESPONSE",
      message: "The customers response did not include pagination metadata.",
      status: 200,
    });
  }
  return { data: response.data, meta: response.meta };
}

export async function getAdminCustomerRequest(customerId: string, signal?: AbortSignal) {
  try {
    const response = await apiRequest<CustomerRelationshipProfile>(
      `${CUSTOMERS_URL}/${encodeURIComponent(customerId)}`,
      { cache: "no-store", signal },
    );
    return response.data;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) return null;
    throw error;
  }
}

export async function addCustomerNoteRequest({
  customerId,
  body,
}: {
  customerId: string;
  body: string;
}): Promise<Result<CustomerNoteActionSuccess, CustomerActionError>> {
  try {
    const response = await apiRequest<CustomerNoteActionSuccess>(
      `${CUSTOMERS_URL}/${encodeURIComponent(customerId)}/notes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      },
    );
    return ok(response.data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      const code = error.code.toLocaleLowerCase("en-GB").replaceAll("_", "-");
      return err({
        code:
          code === "customer-not-found" || code === "empty-note" || code === "note-too-long"
            ? code
            : "empty-note",
        message: error.message,
        ...(error.fieldErrors?.body ? { field: "body" } : {}),
        customerId,
      });
    }
    throw error;
  }
}
