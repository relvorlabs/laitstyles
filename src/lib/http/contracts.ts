export type ApiMeta = Record<string, unknown>;

export type ApiFieldErrors = Record<string, string[]>;

export type ApiSuccess<TData, TMeta extends ApiMeta = ApiMeta> = {
  data: TData;
  meta: TMeta;
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

  return typeof value.error.code === "string" && typeof value.error.message === "string";
}

export function isApiSuccess(value: unknown): value is ApiSuccess<unknown> {
  return isRecord(value) && "data" in value && isRecord(value.meta);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
