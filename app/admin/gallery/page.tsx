import GalleryView from "@/components/admin/gallery/GalleryView";
import { readSearchParams, requireAdminPage, type PageSearchParams } from "@/lib/admin/page-auth";
import { galleryQuerySchema, getGalleryList } from "@/lib/admin/content";

// Server Component, rendered on every request (dynamic): admins upload and
// remove images here, so the list is always read fresh from the database.
export default async function AdminGalleryManagementPage({ searchParams }: { searchParams: PageSearchParams }) {
  await requireAdminPage();

  const query = readSearchParams(await searchParams, galleryQuerySchema);
  const data = await getGalleryList(query);

  return <GalleryView data={data} />;
}
