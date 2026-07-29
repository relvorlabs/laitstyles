import "server-only";

import type { Prisma } from "@/lib/prisma";

/** Removes or anonymizes every customer-owned identity/preference/notification/
 * saved-item/support record this plan's domains own. Deliberately does not
 * touch `profiles` (Supabase-auth-owned identity — a sibling plan's
 * boundary) or orders/payments/returns/reviews (retained transactional and
 * audit facts per the approved deletion policy; this plan must not claim
 * legal erasure of those records, only anonymize what it owns). */
export async function anonymizeCustomerData(
  tx: Prisma.TransactionClient,
  customerId: string,
): Promise<void> {
  await tx.customers.update({
    where: { id: customerId },
    data: {
      name: "Deleted customer",
      email: null,
      phone: null,
      city: null,
    },
  });

  await tx.customer_addresses.deleteMany({ where: { customer_id: customerId } });
  await tx.customer_saved_products.deleteMany({ where: { customer_id: customerId } });
  await tx.customer_preferences.deleteMany({ where: { customer_id: customerId } });
  await tx.notification_preferences.deleteMany({ where: { customer_id: customerId } });
  await tx.notifications.deleteMany({ where: { customer_id: customerId } });
  await tx.privacy_consents.deleteMany({ where: { customer_id: customerId } });

  // Export artifacts may still carry the customer's raw PII inline
  // (see exports.ts) — they must not outlive the account.
  await tx.data_export_jobs.deleteMany({ where: { customer_id: customerId } });

  const tickets = await tx.support_tickets.findMany({
    where: { customer_id: customerId },
    select: { id: true },
  });
  const ticketIds = tickets.map((ticket) => ticket.id);
  if (ticketIds.length) {
    const messages = await tx.support_messages.findMany({
      where: { ticket_id: { in: ticketIds } },
      select: { id: true },
    });
    const messageIds = messages.map((message) => message.id);
    if (messageIds.length) {
      await tx.support_attachments.deleteMany({ where: { message_id: { in: messageIds } } });
    }
    await tx.support_messages.deleteMany({ where: { ticket_id: { in: ticketIds } } });
    await tx.support_tickets.deleteMany({ where: { id: { in: ticketIds } } });
  }
}
