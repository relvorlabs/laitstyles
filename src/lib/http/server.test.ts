import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError } from "@/lib/errors/api-error";
import { handleApiRequest } from "@/lib/http/server";

const loggerError = vi.hoisted(() => vi.fn());

vi.mock("@/lib/logger", () => ({
  logger: {
    error: loggerError,
  },
}));

afterEach(() => {
  loggerError.mockClear();
});

describe("handleApiRequest", () => {
  it("returns the standard success envelope and request ID", async () => {
    const request = new Request("http://localhost/api/v1/health", {
      headers: { "x-request-id": "phase-3-test" },
    });
    const response = await handleApiRequest(request, async () => ({
      data: { id: "health" },
      meta: { version: "v1" },
      status: 201,
    }));

    expect(response.status).toBe(201);
    expect(response.headers.get("x-request-id")).toBe("phase-3-test");
    await expect(response.json()).resolves.toEqual({
      data: { id: "health" },
      meta: { version: "v1" },
    });
  });

  it("omits meta when the operation does not provide it", async () => {
    const response = await handleApiRequest(async () => ({ data: { id: "health" } }));

    await expect(response.json()).resolves.toEqual({ data: { id: "health" } });
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
    expect(loggerError).not.toHaveBeenCalled();
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
          name: expect.any(String),
        },
      },
    });
    expect(loggerError).not.toHaveBeenCalled();
  });

  it("maps a missing table from a raw Prisma query to schema-not-ready", async () => {
    const request = new Request("http://localhost/api/v1/account/cart", {
      headers: { "x-request-id": "missing-table-test" },
    });
    const response = await handleApiRequest(request, async () => {
      throw Object.assign(new Error("relation customer_cart_lines does not exist"), {
        code: "P2010",
        meta: { code: "42P01", message: "private database detail" },
      });
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "DATABASE_SCHEMA_NOT_READY",
        message: "Store data is temporarily unavailable while an update completes.",
      },
    });
    expect(loggerError).toHaveBeenCalledWith(
      {
        requestId: "missing-table-test",
        method: "GET",
        pathname: "/api/v1/account/cart",
        errorName: "Error",
        errorCode: "P2010",
        databaseCode: "42P01",
      },
      "Database request failed",
    );
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain("customer_cart_lines");
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain("private database detail");
  });

  it("maps a direct PostgreSQL missing-table code to schema-not-ready", async () => {
    const response = await handleApiRequest(async () => {
      throw Object.assign(new Error("private relation name"), { code: "42P01" });
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "DATABASE_SCHEMA_NOT_READY" },
    });
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain("private relation name");
  });

  it("maps Prisma model/column drift to schema-not-ready", async () => {
    const response = await handleApiRequest(async () => {
      throw Object.assign(new Error("column access_code does not exist"), { code: "P2022" });
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "DATABASE_SCHEMA_NOT_READY" },
    });
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain("access_code");
  });

  it("maps database connection failures to a retryable unavailable response", async () => {
    const response = await handleApiRequest(async () => {
      throw Object.assign(new Error("cannot reach private database host"), { code: "P1001" });
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "Store data is temporarily unavailable. Please try again.",
      },
    });
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain("private database host");
  });

  it("maps a direct socket failure code to database-unavailable", async () => {
    const response = await handleApiRequest(async () => {
      throw Object.assign(new Error("private socket detail"), { code: "ECONNREFUSED" });
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "DATABASE_UNAVAILABLE" },
    });
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain("private socket detail");
  });

  it("sanitizes and correlates unexpected failures", async () => {
    const request = new Request("http://localhost/api/v1/products?page=2", {
      method: "POST",
      headers: { "x-request-id": "failure-test" },
    });
    const response = await handleApiRequest(request, async () => {
      throw new Error("private database detail");
    });

    expect(response.status).toBe(500);
    expect(response.headers.get("x-request-id")).toBe("failure-test");
    const payload = await response.json();
    expect(payload).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed.",
      },
    });
    expect(JSON.stringify(payload)).not.toContain("private database detail");
    expect(loggerError).toHaveBeenCalledWith(
      {
        requestId: "failure-test",
        method: "POST",
        pathname: "/api/v1/products",
        errorName: "Error",
      },
      "Unhandled API route failure",
    );
  });
});
