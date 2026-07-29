import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/server/session";
import { getAccountReturn } from "@/modules/returns/server/account-returns";
import { ReturnDetailSection } from "@/modules/returns/ui/storefront/return-detail-section";

export default async function AccountReturnDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ returnId?: string | string[] }>;
}) {
  const rawReturnId = (await searchParams).returnId;
  if (typeof rawReturnId !== "string") notFound();
  const session = await getCurrentSession();
  const returnPath = `/account/returns/detail?returnId=${encodeURIComponent(rawReturnId)}`;
  if (session.kind !== "consumer") {
    redirect(`/auth/sign-in?next=${encodeURIComponent(returnPath)}`);
  }
  const record = await getAccountReturn(session.customerId, rawReturnId);
  if (!record) notFound();
  return <ReturnDetailSection record={record} />;
}
