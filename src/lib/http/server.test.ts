import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError } from "@/lib/errors/api-error";
import { handleApiRequest } from "@/lib/http/server";

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("handleApiRequest", () => {
  it("returns the standard success envelope", async () => {
    const response = await handleApiRequest(async () => ({
      data: { id: "health" },
      meta: { version: "v1" },
      status: 201,
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      data: { id: "health" },
      meta: { version: "v1" },
    });
  });

  it("maps expected API errors without exposing internals", async () => {
    const response = await handleApiRequest(async () => {
      throw new ApiError({
        code: "RESOURCE_NOT_FOUND",
        message: "The requested resource was not found.",
        status: 404,
      });
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "The requested resource was not found.",
      },
    });
  });

  it("maps Zod issues to stable field errors", async () => {
    const response = await handleApiRequest(async () => {
      z.object({ name: z.string().min(1) }).parse({ name: "" });
      return { data: null };
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "The request contains invalid fields.",
        fieldErrors: {
          name: [expect.any(String)],
        },
      },
    });
  });

  it("sanitizes unexpected failures", async () => {
    const response = await handleApiRequest(async () => {
      throw new Error("private database detail");
    });

    expect(response.status).toBe(500);
    const payload = await response.json();
    expect(payload).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed.",
      },
    });
    expect(JSON.stringify(payload)).not.toContain("private database detail");
  });
});
