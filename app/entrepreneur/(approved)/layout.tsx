import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/entrepreneur-data";

// Every page in this folder (dashboard, products, orders, sales,
// notifications) is for approved sellers only. The "(approved)" folder name
// isn't part of the URL; it just lets these pages share this check.
//
// Runs on the server for each page in the group, and reads the account's
// current status from the database, so an entrepreneur gets in as soon as
// an admin approves them (no need to sign in again). Pending accounts are
// sent to their application status page. The API routes refuse unapproved
// accounts as well, so this isn't the only line of defence.
//
// getSessionUser is request-cached, so the page below reuses this lookup
// instead of reading the session from the database again.
export default async function ApprovedEntrepreneurLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user || user.role !== "ENTREPRENEUR" || !user.entrepreneurProfile) {
    redirect("/entrepreneur/login");
  }

  if (user.entrepreneurProfile.status !== "APPROVED") {
    redirect("/entrepreneur/application-status");
  }

  return children;
}
