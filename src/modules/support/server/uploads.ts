import "server-only";

import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";
import { assertAttachmentSize, mimeTypeForAssetFormat } from "@/modules/support/server/policy";
import type {
  CompleteSupportAttachmentInput,
  CustomerIdentity,
  SupportAttachmentUploadGrant,
  ValidatedTicketAttachment,
} from "@/modules/support/types";
import { SupportActionError } from "@/modules/support/types";

type CloudinaryResource = {
  public_id: string;
  secure_url: string;
  resource_type: string;
  format?: string;
  version?: number;
  width?: number;
  height?: number;
  bytes?: number;
  context?: { custom?: Record<string, string> };
};

function configureCloudinary() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";
  if (!cloudName || !apiKey || !apiSecret) {
    throw new SupportActionError(
      "SUPPORT_ATTACHMENT_PROVIDER_UNAVAILABLE",
      "Support attachment uploads are not configured.",
    );
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return { cloudName, apiKey, apiSecret };
}

function ownershipSignature(
  publicId: string,
  authUserId: string,
  timestamp: number,
  secret: string,
) {
  return cloudinary.utils.api_sign_request(
    { public_id: publicId, account_owner: authUserId, issued_at: timestamp },
    secret,
  );
}

export function issueSupportAttachmentUpload(
  identity: CustomerIdentity,
  now: Date = new Date(),
): SupportAttachmentUploadGrant {
  const { cloudName, apiKey, apiSecret } = configureCloudinary();
  const timestamp = Math.floor(now.getTime() / 1_000);
  const folder = `laitstyles/support/${identity.authUserId}`;
  const leafId = randomUUID();
  const publicId = `${folder}/${leafId}`;
  const context = `account_owner=${identity.authUserId}`;
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder, public_id: leafId, context },
    apiSecret,
  );

  return {
    publicId,
    ownershipToken: `${timestamp}.${ownershipSignature(
      publicId,
      identity.authUserId,
      timestamp,
      apiSecret,
    )}`,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    apiKey,
    params: { timestamp, folder, publicId: leafId, context, signature },
  };
}

export async function completeSupportAttachmentUpload(
  identity: CustomerIdentity,
  input: CompleteSupportAttachmentInput,
  now: Date = new Date(),
): Promise<ValidatedTicketAttachment> {
  const { apiSecret } = configureCloudinary();
  const prefix = `laitstyles/support/${identity.authUserId}/`;
  if (!input.publicId.startsWith(prefix)) {
    throw new SupportActionError(
      "SUPPORT_ATTACHMENT_NOT_OWNED",
      "This attachment does not belong to your upload session.",
    );
  }

  const issuedAt = Number(input.ownershipToken.split(".")[0]);
  const token = input.ownershipToken.includes(".")
    ? input.ownershipToken.slice(input.ownershipToken.indexOf(".") + 1)
    : "";
  if (
    !Number.isSafeInteger(issuedAt) ||
    Math.abs(Math.floor(now.getTime() / 1_000) - issuedAt) > 15 * 60 ||
    token !== ownershipSignature(input.publicId, identity.authUserId, issuedAt, apiSecret)
  ) {
    throw new SupportActionError(
      "SUPPORT_ATTACHMENT_NOT_OWNED",
      "This attachment upload token is invalid or expired.",
    );
  }

  const existing = await prisma.cloudinary_assets.findUnique({
    where: { public_id: input.publicId },
    select: { id: true, kind: true, created_by_profile_id: true, format: true, bytes: true },
  });
  if (
    existing &&
    (existing.kind !== "support_attachment" ||
      existing.created_by_profile_id !== identity.authUserId)
  ) {
    throw new SupportActionError(
      "SUPPORT_ATTACHMENT_NOT_OWNED",
      "This uploaded asset is already owned by another purpose or account.",
    );
  }

  let resource: CloudinaryResource;
  try {
    resource = (await cloudinary.api.resource(input.publicId, {
      resource_type: input.resourceType,
      type: "upload",
    })) as CloudinaryResource;
  } catch {
    throw new SupportActionError(
      "SUPPORT_ATTACHMENT_INCOMPLETE",
      "The attachment upload has not completed.",
    );
  }
  if (
    resource.public_id !== input.publicId ||
    resource.context?.custom?.account_owner !== identity.authUserId
  ) {
    throw new SupportActionError(
      "SUPPORT_ATTACHMENT_NOT_OWNED",
      "The completed upload does not belong to this account.",
    );
  }

  const format = resource.format ?? null;
  const sizeBytes = resource.bytes ?? 0;
  const mimeType = mimeTypeForAssetFormat(format);
  assertAttachmentSize(sizeBytes);
  const asset = await prisma.cloudinary_assets.upsert({
    where: { public_id: input.publicId },
    update: {},
    create: {
      kind: "support_attachment",
      public_id: input.publicId,
      secure_url: resource.secure_url,
      resource_type: resource.resource_type,
      format,
      version: resource.version ? BigInt(resource.version) : null,
      width: resource.width ?? null,
      height: resource.height ?? null,
      bytes: sizeBytes,
      alt: input.fileName,
      created_by_profile_id: identity.authUserId,
    },
    select: { id: true },
  });

  return { assetId: asset.id, fileName: input.fileName, mimeType, sizeBytes };
}
