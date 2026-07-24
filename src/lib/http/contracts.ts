export type ApiMeta = Record<string, unknown>;

export type ApiFieldErrors = Record<string, string>;

export type ApiPaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type ApiSuccess<TData, TMeta extends ApiMeta = ApiMeta> = {
  data: TData;
  meta?: TMeta;
};

export type ApiErrorPayload = {
  code: string;
  message: string;
  fieldErrors?: ApiFieldErrors;
};

export type ApiFailure = {
  error: ApiErrorPayload;
};

export type ApiResponse<TData, TMeta extends ApiMeta = ApiMeta> =
  | ApiSuccess<TData, TMeta>
  | ApiFailure;

export function isApiFailure(value: unknown): value is ApiFailure {
  if (!isRecord(value) || !isRecord(value.error)) return false;
  if (typeof value.error.code !== "string" || typeof value.error.message !== "string") return false;

  return value.error.fieldErrors === undefined || isStringRecord(value.error.fieldErrors);
}

export function isApiSuccess(value: unknown): value is ApiSuccess<unknown> {
  if (!isRecord(value) || !("data" in value)) return false;

  return value.meta === undefined || isRecord(value.meta);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
