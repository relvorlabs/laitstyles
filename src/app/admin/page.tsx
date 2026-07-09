import { NewStoreOverview } from "@/features/control-room/overview/new-store-overview";
import { OverviewPage } from "@/features/control-room/overview/overview-page";
import { activeControlRoomSeed } from "@/lib/control-room/seed";

type AdminOverviewPageProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

export default async function AdminOverviewPage({
  searchParams,
}: AdminOverviewPageProps) {
  const params = await searchParams;
  const view = Array.isArray(params.view) ? params.view[0] : params.view;

  if (view === "new-store") {
    return <NewStoreOverview />;
  }

  return <OverviewPage state={activeControlRoomSeed} />;
}
