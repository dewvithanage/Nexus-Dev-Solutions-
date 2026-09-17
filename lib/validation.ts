// Only students at the Faculty of Humanities and Social Sciences (FHSS)
// are allowed to register right now, per the client's request. Their
// university email addresses follow the pattern "ar" + digits, e.g.
// ar118533@fhss.sjp.ac.lk.
//
// This is deliberately narrower than a general "any sjp.ac.lk email"
// check — it's scoped to exactly this one faculty's email format, since
// that's what was actually asked for. If the client later opens
// registration to other faculties, this pattern will need to be
 Himasha
// loosened — see the comment below for where.
=======
// loosened (e.g. to accept any prefix before @fhss.sjp.ac.lk, or any
// faculty subdomain of sjp.ac.lk) — see the comment below for where.
 Dev

const UNIVERSITY_EMAIL_PATTERN = /^ar\d+@fhss\.sjp\.ac\.lk$/i;

export function isUniversityEmail(email: string): boolean {
  return UNIVERSITY_EMAIL_PATTERN.test(email.trim());
}

 Himasha

// Shown in error messages and form hints, so it's defined once here
// instead of repeated as a string in multiple files.
 Dev
export const UNIVERSITY_EMAIL_EXAMPLE = "ar118533@fhss.sjp.ac.lk";

// TO LOOSEN THIS LATER (e.g. once other faculties are allowed), replace
// the pattern above with something like:
//   /^[a-zA-Z0-9._-]+@([a-zA-Z0-9-]+\.)*sjp\.ac\.lk$/i
// which accepts any username at any subdomain of sjp.ac.lk.
