import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import { prisma } from "@/lib/prisma";
import type { ConsumerSession } from "@/modules/auth/server/session";
import type {
  CreateOwnedAddressInput,
  OwnedAddress,
  UpdateOwnedAddressInput,
} from "@/modules/customers/types";

type OwnedAddressRow = {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  country: string;
  is_default: boolean;
  delivery_notes: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapOwnedAddress(row: OwnedAddressRow): OwnedAddress {
  return {
    id: row.id,
    label: row.label ?? "Address",
    line1: row.line1,
    line2: row.line2 ?? "",
    city: row.city,
    state: row.state ?? "",
    country: row.country,
    isDefault: row.is_default,
    deliveryNotes: row.delivery_notes ?? "",
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function addressNotFoundError(): ApiError {
  return new ApiError({
    code: "ADDRESS_NOT_FOUND",
    message: "The selected address could not be found.",
    status: 404,
  });
}

export async function listOwnedAddresses(identity: ConsumerSession): Promise<OwnedAddress[]> {
  const rows = await prisma.customer_addresses.findMany({
    where: { customer_id: identity.customerId },
    orderBy: [{ is_default: "desc" }, { created_at: "asc" }],
  });
  return rows.map(mapOwnedAddress);
}

export async function createOwnedAddress(
  identity: ConsumerSession,
  input: CreateOwnedAddressInput,
): Promise<OwnedAddress> {
  const created = await prisma.$transaction(async (tx) => {
    const existingCount = await tx.customer_addresses.count({
      where: { customer_id: identity.customerId },
    });
    const isDefault = existingCount === 0 || Boolean(input.isDefault);

    if (isDefault) {
      await tx.customer_addresses.updateMany({
        where: { customer_id: identity.customerId },
        data: { is_default: false },
      });
    }

    return tx.customer_addresses.create({
      data: {
        customer_id: identity.customerId,
        label: input.label ?? null,
        line1: input.line1,
        line2: input.line2 ?? null,
        city: input.city,
        state: input.state ?? null,
        delivery_notes: input.deliveryNotes ?? null,
        is_default: isDefault,
      },
    });
  });

  return mapOwnedAddress(created);
}

export async function updateOwnedAddress(
  identity: ConsumerSession,
  addressId: string,
  input: UpdateOwnedAddressInput,
): Promise<OwnedAddress> {
  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.customer_addresses.findFirst({
      where: { id: addressId, customer_id: identity.customerId },
    });
    if (!existing) throw addressNotFoundError();

    if (input.isDefault) {
      await tx.customer_addresses.updateMany({
        where: { customer_id: identity.customerId, id: { not: addressId } },
        data: { is_default: false },
      });
    }

    return tx.customer_addresses.update({
      where: { id: addressId },
      data: {
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.line1 !== undefined ? { line1: input.line1 } : {}),
        ...(input.line2 !== undefined ? { line2: input.line2 ?? null } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.state !== undefined ? { state: input.state ?? null } : {}),
        ...(input.deliveryNotes !== undefined ? { delivery_notes: input.deliveryNotes ?? null } : {}),
        ...(input.isDefault !== undefined && (input.isDefault || !existing.is_default)
          ? { is_default: input.isDefault }
          : {}),
      },
    });
  });

  return mapOwnedAddress(updated);
}

export async function deleteOwnedAddress(
  identity: ConsumerSession,
  addressId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.customer_addresses.findFirst({
      where: { id: addressId, customer_id: identity.customerId },
    });
    if (!existing) throw addressNotFoundError();

    await tx.customer_addresses.delete({ where: { id: addressId } });
    if (existing.is_default) {
      const replacement = await tx.customer_addresses.findFirst({
        where: { customer_id: identity.customerId },
        orderBy: { created_at: "asc" },
        select: { id: true },
      });
      if (replacement) {
        await tx.customer_addresses.update({
          where: { id: replacement.id },
          data: { is_default: true },
        });
      }
    }
  });
}
