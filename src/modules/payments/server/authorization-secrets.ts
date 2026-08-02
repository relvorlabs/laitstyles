import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

export class PaymentAuthorizationSecretError extends Error {
  constructor(message = "Payment authorization encryption is not configured.") {
    super(message);
    this.name = "PaymentAuthorizationSecretError";
  }
}

export function encryptAuthorizationCode(value: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptAuthorizationCode(value: string): string {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== VERSION || !ivValue || !tagValue || !encryptedValue) {
    throw new PaymentAuthorizationSecretError("Stored payment authorization is invalid.");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function getKey() {
  const secret =
    process.env.PAYMENT_AUTHORIZATION_SECRET?.trim() ?? process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) throw new PaymentAuthorizationSecretError();
  return createHash("sha256").update(secret).digest();
}
