import { TicketDetailSection } from "@/modules/support/ui/storefront/ticket-detail-section";

export default async function AccountTicketDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ ticketId?: string }>;
}) {
  const { ticketId = "" } = await searchParams;
  return <TicketDetailSection ticketId={ticketId} />;
}
