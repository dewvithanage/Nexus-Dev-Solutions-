import BusinessProfileForm from "@/components/entrepreneur/BusinessProfileForm";
import { requireEntrepreneurPage } from "@/lib/entrepreneur-data";

// Server Component: the saved profile is read on the server and the form
// opens already filled, instead of fetching /api/entrepreneurs/me in the
// browser after the page loads. The session lookup already loads the
// entrepreneur's profile and business, so this page needs no extra query.
//
// Open to pending accounts too (they may edit their profile while they wait
// for approval), so it isn't inside the (approved) folder.
export default async function BusinessProfilePage() {
  const { profile, business, sidebar } = await requireEntrepreneurPage({ approvedOnly: false });

  return (
    <BusinessProfileForm
      businessId={business.id}
      initialLogoUrl={business.logoUrl}
      sidebar={sidebar}
      initialForm={{
        businessName: business.businessName ?? "",
        description: business.description ?? "",
        businessCategory: business.businessCategory ?? "",
        instagramHandle: business.instagramHandle ?? "",
        websiteUrl: business.websiteUrl ?? "",
        businessHours: business.businessHours ?? "",
        pickupLocationNotes: business.pickupLocationNotes ?? "",
        university: profile.university ?? "",
        whatsappNumber: profile.whatsappNumber ?? "",
        bio: profile.bio ?? "",
      }}
    />
  );
}
