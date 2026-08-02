import "server-only";

import { randomBytes } from "node:crypto";
import { ApiError } from "@/lib/errors/api-error";
import { type Prisma, prisma } from "@/lib/prisma";
import type { StaffSession } from "@/modules/auth/server/session";
import {
  type ConfiguredCheckoutCoupon,
  checkoutCouponSettingsSchema,
} from "@/modules/checkout/coupon-schema";
import { normalizeCouponCode } from "@/modules/checkout/server/coupons";
import type {
  CreatePromotionCouponInput,
  PromotionCoupon,
  PromotionCouponList,
  PromotionCouponMutationResult,
  UpdatePromotionCouponInput,
} from "@/modules/promotions/types";

const SETTINGS_ID = 1;
const PROMOTION_LOCK = "laitstyles-promotion-coupons";

export async function listPromotionCoupons(): Promise<PromotionCouponList> {
  return prisma.$transaction(async (tx) => {
    const coupons = await readCoupons(tx);
    const usage = await readCouponUsage(tx);
    return {
      coupons: coupons
        .map((coupon) =>
          toPromotionCoupon(coupon, usage.get(normalizeCouponCode(coupon.code)) ?? 0),
        )
        .sort((left, right) => left.code.localeCompare(right.code)),
    };
  });
}

export async function createPromotionCoupon(
  actor: StaffSession,
  input: CreatePromotionCouponInput,
): Promise<PromotionCouponMutationResult> {
  return prisma.$transaction(async (tx) => {
    await lockCoupons(tx);
    const row = await requireSettings(tx);
    const coupons = parseCoupons(row.selling);
    const code = input.code
      ? normalizeCouponCode(input.code)
      : generateUniqueCode(
          input.prefix,
          new Set(coupons.map((coupon) => normalizeCouponCode(coupon.code))),
        );
    if (coupons.some((coupon) => normalizeCouponCode(coupon.code) === code)) {
      throw new ApiError({
        code: "PROMOTION_CODE_EXISTS",
        message: "A coupon with this code already exists.",
        status: 409,
        fieldErrors: { code: "Choose a different coupon code." },
      });
    }

    const coupon = normalizeConfiguredCoupon(code, input);
    await persistCoupons(
      tx,
      row.selling,
      [...coupons, coupon],
      actor.authUserId,
      "promotion.created",
      code,
    );
    return {
      coupon: toPromotionCoupon(coupon, 0),
      message: `${code} is ready to use.`,
    };
  });
}

export async function updatePromotionCoupon(
  actor: StaffSession,
  input: UpdatePromotionCouponInput,
): Promise<PromotionCouponMutationResult> {
  return prisma.$transaction(async (tx) => {
    await lockCoupons(tx);
    const row = await requireSettings(tx);
    const coupons = parseCoupons(row.selling);
    const currentCode = normalizeCouponCode(input.currentCode);
    const index = coupons.findIndex((coupon) => normalizeCouponCode(coupon.code) === currentCode);
    if (index < 0) {
      throw new ApiError({
        code: "PROMOTION_NOT_FOUND",
        message: "This coupon no longer exists.",
        status: 404,
      });
    }

    const requestedCode = normalizeCouponCode(input.code ?? currentCode);
    if (requestedCode !== currentCode) {
      throw new ApiError({
        code: "PROMOTION_CODE_IMMUTABLE",
        message: "Coupon codes cannot be renamed after creation.",
        status: 409,
        fieldErrors: { code: "Create a new coupon when you need a different code." },
      });
    }

    const coupon = normalizeConfiguredCoupon(currentCode, input);
    const nextCoupons = coupons.map((candidate, candidateIndex) =>
      candidateIndex === index ? coupon : candidate,
    );
    await persistCoupons(
      tx,
      row.selling,
      nextCoupons,
      actor.authUserId,
      "promotion.updated",
      currentCode,
    );
    const usage = await readCouponUsage(tx);
    return {
      coupon: toPromotionCoupon(coupon, usage.get(currentCode) ?? 0),
      message: `${currentCode} was updated.`,
    };
  });
}

async function requireSettings(tx: Prisma.TransactionClient) {
  const row = await tx.store_settings.findUnique({
    where: { id: SETTINGS_ID },
    select: { selling: true },
  });
  if (!row) {
    throw new ApiError({
      code: "SETTINGS_NOT_AVAILABLE",
      message: "Store settings must be initialized before creating coupons.",
      status: 409,
    });
  }
  return row;
}

async function readCoupons(tx: Prisma.TransactionClient): Promise<ConfiguredCheckoutCoupon[]> {
  const row = await tx.store_settings.findUnique({
    where: { id: SETTINGS_ID },
    select: { selling: true },
  });
  return parseCoupons(row?.selling);
}

function parseCoupons(value: Prisma.JsonValue | undefined): ConfiguredCheckoutCoupon[] {
  const parsed = checkoutCouponSettingsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data.coupons : [];
}

async function persistCoupons(
  tx: Prisma.TransactionClient,
  existingSelling: Prisma.JsonValue,
  coupons: ConfiguredCheckoutCoupon[],
  actorProfileId: string,
  action: string,
  code: string,
): Promise<void> {
  const selling = asJsonRecord(existingSelling);
  await tx.store_settings.update({
    where: { id: SETTINGS_ID },
    data: {
      selling: { ...selling, coupons } as Prisma.InputJsonObject,
      updated_by_profile_id: actorProfileId,
    },
  });
  await tx.audit_events.create({
    data: {
      actor_profile_id: actorProfileId,
      action,
      target_table: "store_settings",
      metadata: { code },
    },
  });
}

async function readCouponUsage(tx: Prisma.TransactionClient): Promise<Map<string, number>> {
  const rows = await tx.$queryRaw<Array<{ code: string; count: bigint }>>`
    SELECT
      UPPER(COALESCE(e.metadata ->> 'couponCode', '')) AS code,
      COUNT(DISTINCT o.id)::bigint AS count
    FROM public.orders AS o
    INNER JOIN public.order_payment_events AS e ON e.order_id = o.id
    WHERE o.payment_status::text = 'paid'
      AND e.kind::text = 'attempt_created'
      AND COALESCE(e.metadata ->> 'couponCode', '') <> ''
    GROUP BY UPPER(COALESCE(e.metadata ->> 'couponCode', ''))
  `;
  return new Map(rows.map((row) => [normalizeCouponCode(row.code), Number(row.count)]));
}

function normalizeConfiguredCoupon(
  code: string,
  input: CreatePromotionCouponInput,
): ConfiguredCheckoutCoupon {
  return {
    code,
    enabled: input.enabled,
    kind: input.kind,
    value: input.value,
    ...(input.minimumSubtotalMinor !== undefined
      ? { minimumSubtotalMinor: input.minimumSubtotalMinor }
      : {}),
    ...(input.maximumDiscountMinor !== undefined
      ? { maximumDiscountMinor: input.maximumDiscountMinor }
      : {}),
    ...(input.startsAt ? { startsAt: input.startsAt } : {}),
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    ...(input.usageLimit !== undefined ? { usageLimit: input.usageLimit } : {}),
  };
}

function toPromotionCoupon(coupon: ConfiguredCheckoutCoupon, usedCount: number): PromotionCoupon {
  return {
    code: normalizeCouponCode(coupon.code),
    enabled: coupon.enabled,
    kind: coupon.kind,
    value: coupon.value,
    minimumSubtotalMinor: coupon.minimumSubtotalMinor ?? null,
    maximumDiscountMinor: coupon.maximumDiscountMinor ?? null,
    startsAt: coupon.startsAt ?? null,
    expiresAt: coupon.expiresAt ?? null,
    usageLimit: coupon.usageLimit ?? null,
    usedCount,
  };
}

function generateUniqueCode(prefix: string | undefined, existing: Set<string>): string {
  const normalizedPrefix = normalizeCouponCode(prefix || "LAIT").replaceAll(/[^A-Z0-9-]/g, "");
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `${normalizedPrefix || "LAIT"}-${randomBytes(3).toString("hex").toUpperCase()}`;
    if (!existing.has(candidate)) return candidate;
  }
  throw new ApiError({
    code: "PROMOTION_CODE_GENERATION_FAILED",
    message: "A unique coupon code could not be generated. Enter a custom code and try again.",
    status: 409,
  });
}

function asJsonRecord(value: Prisma.JsonValue): Record<string, Prisma.JsonValue> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

async function lockCoupons(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${PROMOTION_LOCK}, 0))`;
}
