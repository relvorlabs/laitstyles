import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { StaffSession } from "@/modules/auth/server/session";
import type {
  AddCustomerNoteInput,
  CustomerActionError,
  CustomerNoteActionSuccess,
} from "@/modules/customers/types";

export async function addCustomerNote(
  actor: StaffSession,
  input: AddCustomerNoteInput,
): Promise<Result<CustomerNoteActionSuccess, CustomerActionError>> {
  const body = input.body.trim();
  if (!body) {
    return err({
      code: "empty-note",
      message: "Enter a note before saving.",
      field: "body",
      customerId: input.customerId,
    });
  }
  if (body.length > 2_000) {
    return err({
      code: "note-too-long",
      message: "Keep customer notes to 2,000 characters or fewer.",
      field: "body",
      customerId: input.customerId,
    });
  }

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customers.findUnique({
      where: { id: input.customerId },
      select: { id: true, name: true },
    });
    if (!customer) {
      return err({
        code: "customer-not-found",
        message: "The selected customer could not be found.",
        customerId: input.customerId,
      });
    }
    const row = await tx.customer_notes.create({
      data: {
        customer_id: customer.id,
        body,
        author_profile_id: actor.authUserId,
      },
      include: { profiles: { select: { display_name: true, email: true } } },
    });
    await tx.activity_events.create({
      data: {
        kind: "customer",
        title: `Internal note added for ${customer.name}`,
        detail: body,
        actor_profile_id: actor.authUserId,
        customer_id: customer.id,
      },
    });
    await tx.audit_events.create({
      data: {
        actor_profile_id: actor.authUserId,
        action: "customer.note.created",
        target_table: "customer_notes",
        target_id: row.id,
        metadata: { customerId: customer.id },
      },
    });
    const note = {
      id: row.id,
      body: row.body,
      createdAt: row.created_at.toISOString(),
      author:
        row.profiles?.display_name ?? row.profiles?.email ?? actor.displayName ?? "Store team",
    };
    return ok({
      customerId: customer.id,
      note,
      message: "Internal customer note saved.",
    });
  });
}
