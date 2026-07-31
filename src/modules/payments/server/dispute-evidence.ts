import "server-only";

import { Prisma, prisma } from "@/lib/prisma";
import {
  appendLocalEvidenceMetadata,
  disputeInclude,
  type DisputeRow,
  type LocalEvidenceDescriptor,
} from "@/modules/payments/server/dispute-projection";

export async function appendDisputeEvidenceMetadata(
  disputeId: string,
  item: LocalEvidenceDescriptor,
): Promise<DisputeRow> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.payment_disputes.findUniqueOrThrow({
      where: { id: disputeId },
      include: disputeInclude,
    });
    const updated = await tx.payment_disputes.update({
      where: { id: disputeId },
      data: { metadata: appendLocalEvidenceMetadata(row.metadata, item) },
      include: disputeInclude,
    });
    await tx.audit_events.create({
      data: {
        actor_profile_id: item.submittedByProfileId,
        action: "payments:dispute:evidence-submitted",
        target_table: "payment_disputes",
        target_id: disputeId,
        metadata: item as unknown as Prisma.InputJsonValue,
      },
    });
    return updated;
  });
}
