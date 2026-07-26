import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assertDisposableAcceptanceDatabase,
  runFreshProcessProbe,
} from "@/test/persistence-harness";

describe("acceptance database guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects an unmarked database", () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://acceptance:secret@127.0.0.1:5432/laitstyles_acceptance",
    );
    vi.stubEnv("LAITSTYLES_ACCEPTANCE_DATABASE", "0");

    expect(() => assertDisposableAcceptanceDatabase()).toThrow("Refusing non-disposable database");
  });

  it("accepts a marked local disposable database", () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://acceptance:secret@127.0.0.1:5432/laitstyles_acceptance",
    );
    vi.stubEnv("LAITSTYLES_ACCEPTANCE_DATABASE", "1");

    expect(assertDisposableAcceptanceDatabase().hostname).toBe("127.0.0.1");
  });

  it("accepts a marked remote database with an explicit disposable host and name", () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://acceptance:secret@phase45-test.db.example.invalid:5432/laitstyles_acceptance",
    );
    vi.stubEnv("LAITSTYLES_ACCEPTANCE_DATABASE", "1");
    vi.stubEnv("LAITSTYLES_ACCEPTANCE_DATABASE_HOSTS", "phase45-test.db.example.invalid");

    expect(assertDisposableAcceptanceDatabase().hostname).toBe("phase45-test.db.example.invalid");
  });

  it("rejects a marked database on a host that was not explicitly allowed", () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://acceptance:secret@shared.db.example.invalid:5432/laitstyles_acceptance",
    );
    vi.stubEnv("LAITSTYLES_ACCEPTANCE_DATABASE", "1");
    vi.stubEnv("LAITSTYLES_ACCEPTANCE_DATABASE_HOSTS", "phase45-test.db.example.invalid");

    expect(() => assertDisposableAcceptanceDatabase()).toThrow("Refusing non-disposable database");
  });

  it("rejects an unsafe Prisma direct URL even when the runtime URL is disposable", () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://acceptance:secret@127.0.0.1:5432/laitstyles_acceptance",
    );
    vi.stubEnv(
      "DIRECT_URL",
      "postgresql://acceptance:secret@shared.db.example.invalid:5432/laitstyles_acceptance",
    );
    vi.stubEnv("LAITSTYLES_ACCEPTANCE_DATABASE", "1");

    expect(() => assertDisposableAcceptanceDatabase()).toThrow("Refusing non-disposable database");
  });

  it("rejects a marked database without a disposable database name", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://acceptance:secret@127.0.0.1:5432/laitstyles");
    vi.stubEnv("LAITSTYLES_ACCEPTANCE_DATABASE", "1");

    expect(() => assertDisposableAcceptanceDatabase()).toThrow("Refusing non-disposable database");
  });

  it("rejects malformed URLs without echoing credentials", () => {
    const secret = "do-not-leak-this-password";
    vi.stubEnv("DATABASE_URL", `not-a-url:${secret}`);
    vi.stubEnv("LAITSTYLES_ACCEPTANCE_DATABASE", "1");

    let message = "";
    try {
      assertDisposableAcceptanceDatabase();
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toBe("Refusing non-disposable database: invalid DATABASE_URL");
    expect(message).not.toContain(secret);
  });

  it("rejects a fresh-process probe before spawning when the marker is absent", async () => {
    vi.stubEnv("LAITSTYLES_ACCEPTANCE_DATABASE", "0");
    vi.stubEnv("DATABASE_URL", "postgresql://acceptance:secret@127.0.0.1/test_acceptance");

    await expect(runFreshProcessProbe("products", { productId: "safe-id" })).rejects.toThrow(
      "Refusing non-disposable database",
    );
  });
});

describe("persistence CLI", () => {
  it("fails safely before connecting when the disposable marker is absent", () => {
    const secret = "cli-must-not-leak-this";
    const result = spawnSync(
      process.execPath,
      [
        "node_modules/tsx/dist/cli.mjs",
        "scripts/checks/phase-1-6-persistence.ts",
        "--probe",
        "products",
        "--ids",
        JSON.stringify({ productId: "safe-id" }),
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          DATABASE_URL: `postgresql://acceptance:${secret}@127.0.0.1/test_acceptance`,
          LAITSTYLES_ACCEPTANCE_DATABASE: "0",
        },
      },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Refusing non-disposable database");
    expect(`${result.stdout}${result.stderr}`).not.toContain(secret);
  }, 15_000);
});
