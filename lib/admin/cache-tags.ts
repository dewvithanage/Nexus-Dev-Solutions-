// Cache tags for admin data kept in the Next.js Data Cache.
//
// Reports and Rankings are platform-wide totals over every order, the same
// for every admin, so their results are cached for a short time instead of
// being recomputed on every page view. Access is still checked on every
// request before the cached result is read.
//
// Anything that changes verified sales must call
// revalidateTag(SALES_TOTALS_TAG) so the figures update straight away.
export const SALES_TOTALS_TAG = "admin-sales-totals";

// Upper bound on staleness for changes made outside the admin pages
// (e.g. a new guest order appearing in "Platform Sales Count").
export const SALES_TOTALS_MAX_AGE_SECONDS = 60;
