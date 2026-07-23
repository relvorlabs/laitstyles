import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const failureSchema = z
  .object({
    name: z.string().min(1).max(200),
    source: z.string().max(200).optional(),
    project: z.string().max(200).nullable().optional(),
    command: z.string().max(1_000).optional(),
    exitCode: z.number().int().nullable().optional(),
    timedOut: z.boolean().optional(),
    logTail: z.string().max(20_000).optional(),
  })
  .strict();

export const ciFeedbackPayloadSchema = z
  .object({
    repository: z.string().min(1).max(300).nullable().optional(),
    sha: z.string().min(7).max(100).nullable().optional(),
    pullRequest: z.number().int().positive().nullable().optional(),
    status: z.enum(["failed", "passed", "passed-with-warnings"]).optional(),
    missing: z.array(z.string().max(200)).max(50).optional(),
    failures: z.array(failureSchema).max(30),
    changedFiles: z.array(z.string().max(500)).max(500).optional(),
    diffStat: z.string().max(20_000).optional(),
    commitLog: z.string().max(20_000).optional(),
    patchExcerpt: z.string().max(100_000).optional(),
    instructions: z.string().max(4_000).optional(),
  })
  .strict();

export type CiFeedbackPayload = z.infer<typeof ciFeedbackPayloadSchema>;

type Environment = Record<string, string | undefined>;
type FetchImplementation = typeof fetch;

export class CiFeedbackError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "CiFeedbackError";
  }
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function isCiFeedbackAuthorized(authorization: string | null, expectedToken: string | undefined) {
  if (!expectedToken || !authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice("Bearer ".length).trim();
  if (!supplied) return false;
  return timingSafeEqual(digest(supplied), digest(expectedToken));
}

function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as { output_text?: unknown; output?: unknown };
  if (typeof record.output_text === "string") return record.output_text;
  if (!Array.isArray(record.output)) return "";
  return record.output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .filter(
      (item): item is { type: "output_text"; text: string } =>
        Boolean(item && typeof item === "object" && (item as { type?: unknown }).type === "output_text" && typeof (item as { text?: unknown }).text === "string"),
    )
    .map((item) => item.text)
    .join("\n")
    .trim();
}

export async function analyzeCiFeedback(
  payload: CiFeedbackPayload,
  options: { env?: Environment; fetchImpl?: FetchImplementation } = {},
) {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiKey = env.OPENAI_API_KEY;
  const model = env.OPENAI_CI_MODEL;
  if (!apiKey || !model) {
    throw new CiFeedbackError(
      "CI analysis is not configured. Set OPENAI_API_KEY and OPENAI_CI_MODEL.",
      503,
      "not_configured",
    );
  }

  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions:
        "You are a senior CI and Next.js reviewer. Diagnose only the supplied evidence. Return concise Markdown with observed failure, confidence, likely files, minimal correction, validation commands, and residual risk. Never claim you edited the repository or that a check passed unless the payload proves it.",
      input: JSON.stringify(payload),
      max_output_tokens: 1800,
    }),
  });

  const responseBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const upstreamMessage =
      typeof responseBody.error === "object" && responseBody.error
        ? String((responseBody.error as { message?: unknown }).message ?? "Unknown upstream error")
        : "Unknown upstream error";
    throw new CiFeedbackError(
      `OpenAI analysis failed with status ${response.status}: ${upstreamMessage}`,
      502,
      "upstream_failure",
    );
  }

  const analysis = extractResponseText(responseBody);
  if (!analysis) {
    throw new CiFeedbackError("OpenAI returned no analyzable text.", 502, "empty_response");
  }

  return {
    analysis,
    model,
    responseId: typeof responseBody.id === "string" ? responseBody.id : null,
  };
}
