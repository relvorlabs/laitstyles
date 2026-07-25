import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import type {
  ProductLifecycleError,
  ProductMutationError,
  ProductTaxonomyError,
} from "@/modules/products/types";

export function throwProductMutationError(error: ProductMutationError): never {
  const fieldErrors = error.issues?.reduce<Record<string, string>>((current, issue) => {
    current[issue.path] ??= issue.message;
    return current;
  }, {});

  const code =
    error.code === "duplicate-reference"
      ? "PRODUCT_REFERENCE_CONFLICT"
      : error.code === "product-not-found"
        ? "PRODUCT_NOT_FOUND"
        : "PRODUCT_VALIDATION_FAILED";
  const status =
    error.code === "duplicate-reference" ? 409 : error.code === "product-not-found" ? 404 : 422;

  throw new ApiError({
    code,
    message: error.message,
    status,
    ...(fieldErrors && Object.keys(fieldErrors).length ? { fieldErrors } : {}),
  });
}

export function throwProductLifecycleError(error: ProductLifecycleError): never {
  throw new ApiError({
    code: error.code === "product-in-use" ? "PRODUCT_IN_USE" : "PRODUCT_NOT_FOUND",
    message: error.message,
    status: error.code === "product-in-use" ? 409 : 404,
  });
}

export function throwProductTaxonomyError(error: ProductTaxonomyError): never {
  const mapping = {
    "empty-name": ["TAXONOMY_NAME_REQUIRED", 422],
    "duplicate-name": ["TAXONOMY_NAME_CONFLICT", 409],
    "taxonomy-not-found": ["TAXONOMY_NOT_FOUND", 404],
    "taxonomy-in-use": ["TAXONOMY_IN_USE", 409],
  } as const;
  const [code, status] = mapping[error.code];
  throw new ApiError({ code, message: error.message, status });
}
