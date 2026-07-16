import { NewStoreOverview } from "@/features/admin/overview/new-store-overview";
import { OverviewPage } from "@/features/admin/overview/overview-page";
import { activeAdminSeed, newStoreAdminSeed } from "@/lib/admin/shared/admin-seed";

type AdminOverviewPageProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

export default async function AdminOverviewPage({ searchParams }: AdminOverviewPageProps) {
  const params = await searchParams;
  const view = Array.isArray(params.view) ? params.view[0] : params.view;

  if (view === "new-store") {
    return <NewStoreOverview state={newStoreAdminSeed} />;
  }

  return <OverviewPage state={activeAdminSeed} />;
}
