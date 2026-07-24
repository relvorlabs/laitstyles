import { err, ok, type Result } from "@/lib/errors";
import { apiRequest, ApiClientError } from "@/lib/http/client";
import type {
  AdminProduct,
  ProductLifecycleError,
  ProductLifecycleSuccess,
  ProductMutationError,
  ProductMutationInput,
  ProductMutationIssue,
  ProductMutationSuccess,
  ProductTaxonomyError,
  ProductTaxonomyInput,
  ProductTaxonomyItem,
  ProductTaxonomySuccess,
} from "@/modules/products/types";

const PRODUCTS_URL = "/api/v1/admin/products";
const TAXONOMY_URL = `${PRODUCTS_URL}/taxonomy`;

export async function listAdminProducts(signal?: AbortSignal): Promise<AdminProduct[]> {
  const response = await apiRequest<AdminProduct[]>(`${PRODUCTS_URL}?page=1&pageSize=500`, {
    cache: "no-store",
    signal,
  });
  return response.data;
}

export async function getAdminProduct(
  productId: string,
  signal?: AbortSignal,
): Promise<AdminProduct | null> {
  try {
    const response = await apiRequest<AdminProduct>(`${PRODUCTS_URL}/${encodeURIComponent(productId)}`, {
      cache: "no-store",
      signal,
    });
    return response.data;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) return null;
    throw error;
  }
}

export async function listProductTaxonomy(signal?: AbortSignal): Promise<ProductTaxonomyItem[]> {
  const response = await apiRequest<ProductTaxonomyItem[]>(TAXONOMY_URL, {
    cache: "no-store",
    signal,
  });
  return response.data;
}

export async function saveProductRequest(
  input: ProductMutationInput,
): Promise<Result<ProductMutationSuccess, ProductMutationError>> {
  const productId = input.values.productId;
  const url = productId ? `${PRODUCTS_URL}/${encodeURIComponent(productId)}` : PRODUCTS_URL;

  try {
    const response = await apiRequest<ProductMutationSuccess>(url, {
      method: productId ? "PATCH" : "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(input),
    });
    return ok(response.data);
  } catch (error) {
    if (error instanceof ApiClientError) return err(toProductMutationError(error));
    throw error;
  }
}

export async function archiveProductRequest(
  productId: string,
): Promise<Result<ProductLifecycleSuccess, ProductLifecycleError>> {
  return lifecycleRequest(productId, "archive");
}

export async function restoreProductRequest(
  productId: string,
): Promise<Result<ProductLifecycleSuccess, ProductLifecycleError>> {
  return lifecycleRequest(productId, "restore");
}

export async function deleteProductRequest(
  productId: string,
): Promise<Result<ProductLifecycleSuccess, ProductLifecycleError>> {
  try {
    const response = await apiRequest<ProductLifecycleSuccess>(
      `${PRODUCTS_URL}/${encodeURIComponent(productId)}`,
      { method: "DELETE" },
    );
    return ok(response.data);
  } catch (error) {
    if (error instanceof ApiClientError) return err(toProductLifecycleError(error, productId));
    throw error;
  }
}

export async function createProductTaxonomyRequest(
  input: ProductTaxonomyInput,
): Promise<Result<ProductTaxonomySuccess, ProductTaxonomyError>> {
  try {
    const response = await apiRequest<ProductTaxonomySuccess>(TAXONOMY_URL, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(input),
    });
    return ok(response.data);
  } catch (error) {
    if (error instanceof ApiClientError) return err(toProductTaxonomyError(error));
    throw error;
  }
}

export async function renameProductTaxonomyRequest({
  taxonomyId,
  name,
}: {
  taxonomyId: string;
  name: string;
}): Promise<Result<ProductTaxonomySuccess, ProductTaxonomyError>> {
  try {
    const response = await apiRequest<ProductTaxonomySuccess>(
      `${TAXONOMY_URL}/${encodeURIComponent(taxonomyId)}`,
      {
        method: "PATCH",
        headers: jsonHeaders(),
        body: JSON.stringify({ name }),
      },
    );
    return ok(response.data);
  } catch (error) {
    if (error instanceof ApiClientError) return err(toProductTaxonomyError(error, taxonomyId));
    throw error;
  }
}

export async function deleteProductTaxonomyRequest(
  taxonomyId: string,
): Promise<Result<ProductTaxonomySuccess, ProductTaxonomyError>> {
  try {
    const response = await apiRequest<ProductTaxonomySuccess>(
      `${TAXONOMY_URL}/${encodeURIComponent(taxonomyId)}`,
      { method: "DELETE" },
    );
    return ok(response.data);
  } catch (error) {
    if (error instanceof ApiClientError) return err(toProductTaxonomyError(error, taxonomyId));
    throw error;
  }
}

async function lifecycleRequest(
  productId: string,
  operation: "archive" | "restore",
): Promise<Result<ProductLifecycleSuccess, ProductLifecycleError>> {
  try {
    const response = await apiRequest<ProductLifecycleSuccess>(
      `${PRODUCTS_URL}/${encodeURIComponent(productId)}/${operation}`,
      { method: "POST" },
    );
    return ok(response.data);
  } catch (error) {
    if (error instanceof ApiClientError) return err(toProductLifecycleError(error, productId));
    throw error;
  }
}

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

function toProductMutationError(error: ApiClientError): ProductMutationError {
  const code =
    error.code === "PRODUCT_REFERENCE_CONFLICT"
      ? "duplicate-reference"
      : error.code === "PRODUCT_NOT_FOUND"
        ? "product-not-found"
        : "validation-failed";
  const issues = toProductIssues(error.fieldErrors);
  return {
    code,
    message: error.message,
    ...(issues.length ? { issues } : {}),
  };
}

function toProductIssues(fieldErrors: Record<string, string> | undefined): ProductMutationIssue[] {
  if (!fieldErrors) return [];
  return Object.entries(fieldErrors).map(([path, message]) => ({
    path,
    message,
    step: productEditorStepFor(path),
  }));
}

function productEditorStepFor(path: string): ProductMutationIssue["step"] {
  const root = path.split(".")[0] ?? "";
  if (root === "inventoryMode") return "type";
  if (["name", "category", "brand", "description", "internalReference"].includes(root)) {
    return "identity";
  }
  if (root === "media") return "images";
  if (["stock", "unique", "stocked", "variant"].includes(root)) return "stock";
  if (["sellingPrice", "referencePrice", "cost", "lowStockThreshold"].includes(root)) {
    return "pricing";
  }
  if (root === "fulfilment") return "fulfilment";
  return "review";
}

function toProductLifecycleError(
  error: ApiClientError,
  productId: string,
): ProductLifecycleError {
  return {
    code: error.code === "PRODUCT_IN_USE" ? "product-in-use" : "product-not-found",
    productId,
    message: error.message,
  };
}

function toProductTaxonomyError(
  error: ApiClientError,
  taxonomyId?: string,
): ProductTaxonomyError {
  const code =
    error.code === "TAXONOMY_NAME_REQUIRED"
      ? "empty-name"
      : error.code === "TAXONOMY_NAME_CONFLICT"
        ? "duplicate-name"
        : error.code === "TAXONOMY_IN_USE"
          ? "taxonomy-in-use"
          : "taxonomy-not-found";
  return {
    code,
    message: error.message,
    ...(taxonomyId ? { taxonomyId } : {}),
  };
}
