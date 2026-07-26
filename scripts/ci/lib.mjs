import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export function parseArgs(argv = process.argv.slice(2)) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) values.set(key, true);
    else {
      values.set(key, next);
      index += 1;
    }
  }
  return values;
}

export async function ensureParent(path) {
  await mkdir(dirname(path), { recursive: true });
}

export async function writeJson(path, value) {
  await ensureParent(path);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeText(path, value) {
  await ensureParent(path);
  await writeFile(path, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

export async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

export function commandLabel(command, args = []) {
  return [command, ...args].map((value) => (/\s/.test(value) ? JSON.stringify(value) : value)).join(" ");
}

export function secretValues(env = process.env) {
  return Object.entries(env)
    .filter(([name, value]) => {
      if (!value || value.length < 8) return false;
      return /(TOKEN|KEY|SECRET|PASSWORD|AUTH|COOKIE|DATABASE_URL|DIRECT_URL)/i.test(name);
    })
    .map(([, value]) => value)
    .sort((a, b) => b.length - a.length);
}

export function redact(input, secrets = secretValues()) {
  let value = String(input ?? "");
  for (const secret of secrets) value = value.split(secret).join("[REDACTED]");
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+\/=\-]+/gi, "Bearer [REDACTED]")
    .replace(/\bpostgres(?:ql)?:\/\/[^\s"'`<>\\]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/([?&](?:token|key|secret|signature)=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(
      /\b(DATABASE_URL|DIRECT_URL|password|token|cookie)=[^\s]+/gi,
      "$1[REDACTED_EQUALS][REDACTED]",
    );
}

export function tailLines(input, count = 120) {
  return String(input ?? "").split(/\r?\n/).slice(-count).join("\n");
}

export function truncate(input, max = 120_000) {
  const value = String(input ?? "");
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n\n[TRUNCATED ${value.length - max} CHARACTERS]`;
}

export function sha256(input) {
  return createHash("sha256").update(String(input)).digest("hex");
}

export async function listFiles(root) {
  const output = [];
  async function visit(directory) {
    let entries = [];
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else output.push(absolute);
    }
  }
  await visit(root);
  return output;
}

export async function fetchWithRetry(url, init, options = {}) {
  const attempts = options.attempts ?? 3;
  const timeoutMs = options.timeoutMs ?? 30_000;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (response.status < 500 && response.status !== 429) return response;
      lastError = new Error(`Request failed with status ${response.status}`);
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
  }
  throw lastError ?? new Error("Request failed");
}

export function extractResponseText(payload) {
  if (!payload || typeof payload !== "object") return "";
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .filter((item) => item?.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
}
