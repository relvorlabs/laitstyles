import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

const VERSION = "v1";

export class PayoutAccountSecretError extends Error {
  constructor(message = "Payout account encryption is not configured.") {
    super(message);
    this.name = "PayoutAccountSecretError";
  }
}

export function normalizeAccountNumber(value: string): string {
  const normalized = value.replace(/\s+/g, "");
  if (!/^\d{6,20}$/.test(normalized)) {
    throw new TypeError("Payout account number must contain 6 to 20 digits.");
  }
  return normalized;
}

export function encryptPayoutAccountNumber(value: string): string {
  const normalized = normalizeAccountNumber(value);
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptPayoutAccountNumber(value: string): string {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== VERSION || !ivValue || !tagValue || !encryptedValue) {
    throw new PayoutAccountSecretError("Stored payout account data is invalid.");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function fingerprintPayoutAccount(input: {
  accountNumber: string;
  bankCode: string;
  currency: string;
}): string {
  const normalized = normalizeAccountNumber(input.accountNumber);
  return createHmac("sha256", getKey())
    .update(`${input.currency.toUpperCase()}:${input.bankCode}:${normalized}`)
    .digest("hex");
}

export function maskPayoutAccountNumber(value: string): string {
  const normalized = normalizeAccountNumber(value);
  return `****${normalized.slice(-4)}`;
}

function getKey(): Buffer {
  const secret =
    process.env.PAYOUT_ACCOUNT_SECRET?.trim() ??
    process.env.PAYMENT_AUTHORIZATION_SECRET?.trim() ??
    process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) throw new PayoutAccountSecretError();
  return createHash("sha256").update(secret).digest();
}
