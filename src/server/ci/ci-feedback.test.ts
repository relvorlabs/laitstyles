import { describe, expect, it, vi } from "vitest";
import {
  analyzeCiFeedback,
  CiFeedbackError,
  isCiFeedbackAuthorized,
  type CiFeedbackPayload,
} from "./ci-feedback";

const payload: CiFeedbackPayload = {
  repository: "relvorlabs/laitstyles",
  sha: "abcdef1234567",
  pullRequest: 31,
  status: "failed",
  missing: [],
  failures: [
    {
      name: "typescript",
      source: "static",
      command: "pnpm typecheck",
      exitCode: 2,
      timedOut: false,
      logTail: "src/example.ts(1,1): error TS2322",
    },
  ],
  changedFiles: ["src/example.ts"],
};

describe("CI feedback authorization", () => {
  it("accepts only the configured bearer token", () => {
    expect(isCiFeedbackAuthorized("Bearer expected-token", "expected-token")).toBe(true);
    expect(isCiFeedbackAuthorized("Bearer wrong-token", "expected-token")).toBe(false);
    expect(isCiFeedbackAuthorized(null, "expected-token")).toBe(false);
    expect(isCiFeedbackAuthorized("Bearer expected-token", undefined)).toBe(false);
  });
});

describe("analyzeCiFeedback", () => {
  it("fails closed when OpenAI is not configured", async () => {
    await expect(analyzeCiFeedback(payload, { env: {} })).rejects.toMatchObject({
      name: "CiFeedbackError",
      status: 503,
      code: "not_configured",
    });
  });

  it("extracts output text from a successful Responses API payload", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "resp_ci_123",
          output: [{ content: [{ type: "output_text", text: "Fix the changed TypeScript contract." }] }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    await expect(
      analyzeCiFeedback(payload, {
        env: { OPENAI_API_KEY: "test-key", OPENAI_CI_MODEL: "test-model" },
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).resolves.toEqual({
      analysis: "Fix the changed TypeScript contract.",
      model: "test-model",
      responseId: "resp_ci_123",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/responses");
  });

  it("converts upstream failures into a safe gateway error", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: "rate limited" } }), {
        status: 429,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      analyzeCiFeedback(payload, {
        env: { OPENAI_API_KEY: "test-key", OPENAI_CI_MODEL: "test-model" },
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ status: 502, code: "upstream_failure" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(CiFeedbackError).toBeDefined();
  });
});
