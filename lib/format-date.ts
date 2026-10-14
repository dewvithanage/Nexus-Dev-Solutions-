// Dates on server-rendered pages are formatted with a fixed locale and time
// zone, so the HTML from the server and the first render in the browser
// show exactly the same text (otherwise React reports a hydration
// mismatch whenever the server's time zone differs from the visitor's).
const TIME_ZONE = "Asia/Colombo";

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: TIME_ZONE });
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: TIME_ZONE,
});

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));
