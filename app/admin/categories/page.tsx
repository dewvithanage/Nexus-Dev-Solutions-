import CategoriesView from "@/components/admin/categories/CategoriesView";
import { readSearchParams, requireAdminPage, type PageSearchParams } from "@/lib/admin/page-auth";
import { categoriesQuerySchema, getCategoriesList } from "@/lib/admin/content";

// Server Component, rendered on every request (dynamic): admins add and
// delete categories here, so the list (and product counts, which decide
// whether a category can be deleted) must always be current.
export default async function CategoryManagementPage({ searchParams }: { searchParams: PageSearchParams }) {
  await requireAdminPage();

  const query = readSearchParams(await searchParams, categoriesQuerySchema);
  const data = await getCategoriesList(query);

  return <CategoriesView data={data} />;
}
