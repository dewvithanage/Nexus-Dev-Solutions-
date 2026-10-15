import { PageSkeleton } from "@/components/entrepreneur/PageStates";

// The profile page sits outside the (approved) folder (pending accounts can
// use it too), so it needs its own loading skeleton.
export default function Loading() {
  return <PageSkeleton title="Business Profile Management" />;
}
