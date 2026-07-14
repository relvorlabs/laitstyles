import { redirect } from "next/navigation";

/**
 * Backward-compatible route for bookmarks created before the Admin rename.
 * This is the only intentional application reference to the retired route segment.
 */
export default async function LegacyAdminRedirect({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  const suffix = path.length > 0 ? `/${path.map(encodeURIComponent).join("/")}` : "";
  redirect(`/admin${suffix}`);
}
