import "server-only";

import { z } from "zod";
import { ApiError } from "@/lib/errors/api-error";

export async function parseJsonBody<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<z.output<TSchema>> {
  const contentType = request.headers.get("content-type")?.toLowerCase();
  if (!contentType?.includes("application/json")) {
    throw new ApiError({
      code: "INVALID_CONTENT_TYPE",
      message: "Send the request body as application/json.",
      status: 400,
    });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch (cause) {
    throw new ApiError({
      code: "INVALID_JSON",
      message: "The request body contains invalid JSON.",
      status: 400,
      cause,
    });
  }

  return schema.parse(input) as z.output<TSchema>;
}

export function parseSearchParams<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): z.output<TSchema> {
  return schema.parse(searchParamsToObject(new URL(request.url).searchParams)) as z.output<TSchema>;
}

function searchParamsToObject(searchParams: URLSearchParams): Record<string, string | string[]> {
  const input: Record<string, string | string[]> = {};

  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    input[key] = values.length === 1 ? values[0] : values;
  }

  return input;
}
