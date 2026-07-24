import "server-only";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export type ApiRequestContext = {
  requestId: string;
  method: string | null;
  pathname: string | null;
};

export function createApiRequestContext(request?: Request): ApiRequestContext {
  return {
    requestId: readRequestId(request),
    method: request?.method ?? null,
    pathname: readPathname(request),
  };
}

export function withRequestId(headers: HeadersInit | undefined, requestId: string): Headers {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("x-request-id", requestId);
  return responseHeaders;
}

function readRequestId(request?: Request): string {
  const incomingRequestId = request?.headers.get("x-request-id")?.trim();
  if (incomingRequestId && REQUEST_ID_PATTERN.test(incomingRequestId)) {
    return incomingRequestId;
  }

  return crypto.randomUUID();
}

function readPathname(request?: Request): string | null {
  if (!request) return null;

  try {
    return new URL(request.url).pathname;
  } catch {
    return null;
  }
}
