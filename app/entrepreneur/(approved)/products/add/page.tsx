import AddProductForm from "@/components/entrepreneur/AddProductForm";
import { getCategoryOptions, requireEntrepreneurPage } from "@/lib/entrepreneur-data";

// Server Component: the categories for the dropdown are read on the server
// and passed to the form, instead of the browser fetching /api/categories
// after the page loads. The form itself stays a Client Component.
export default async function AddProductPage() {
  const { sidebar } = await requireEntrepreneurPage();
  const categories = await getCategoryOptions();

  return <AddProductForm categories={categories} sidebar={sidebar} />;
}
