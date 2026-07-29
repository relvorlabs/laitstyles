import { AdminAccessDenied } from "@/features/admin/shell/admin-access-denied";
import { getStaffAccess } from "@/modules/auth/server/session";
import { CatalogueStructureWorkspace } from "@/modules/products/ui/admin/catalogue/catalogue-structure-workspace";

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const access = await getStaffAccess("inventory:read");
  if (!access.ok) return <AdminAccessDenied reason={access.reason} />;

  const { tab } = await searchParams;
  return (
    <CatalogueStructureWorkspace
      initialTab={tab === "collections" ? "collections" : "categories"}
    />
  );
}
