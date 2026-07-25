import "server-only";

import { prisma } from "@/lib/prisma";
import type { AdminOrderCustomer } from "@/modules/orders/types";

export async function listPaystackReadySaleCustomers(): Promise<AdminOrderCustomer[]> {
  const rows = await prisma.customers.findMany({
    where: { email: { not: null } },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true, email: true, phone: true, city: true },
  });

  return rows.flatMap((row) => {
    const email = row.email?.trim();
    if (!email) return [];
    return [
      {
        id: row.id,
        name: row.name,
        email,
        phone: row.phone ?? "",
        city: row.city ?? "",
      },
    ];
  });
}
