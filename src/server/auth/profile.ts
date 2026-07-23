import "server-only";

import { prisma } from "@/lib/prisma";

export async function ensureConsumerProfile(authUserId: string, email: string | null) {
  return prisma.profiles.upsert({
    where: { id: authUserId },
    update: { email },
    create: { id: authUserId, email, role: "consumer" },
    select: { id: true, role: true, status: true },
  });
}
