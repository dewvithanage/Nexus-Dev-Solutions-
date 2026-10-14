// Generic email FORMAT check. Used for registration and Admin Login.
//
// The client has asked that ANY email address can register and log in,
// not just FHSS student addresses (ar#####@fhss.sjp.ac.lk). This is a
// standard "good enough" pattern: not a full RFC 5322 validator (that is
// notoriously overkill and still lets through addresses that don't
// actually work), just enough to catch obviously malformed input like
// "asdf" or "test@" before it reaches the database.
const GENERIC_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(email: string): boolean {
  return GENERIC_EMAIL_PATTERN.test(email.trim());
}

// Password rules, shared by the register form, the register API route,
// and (ideally) the reset-password route, so a weak password can't be
// slipped in through a different door.
export const PASSWORD_MIN_LENGTH = 8;
// bcrypt (used to hash passwords here) ignores everything past 72 bytes,
// so a longer limit would give a false sense of extra strength.
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_RULES_HINT =
  "At least 8 characters, with at least one letter and one number.";

// Returns an error message if the password is not acceptable, or null if
// it is fine.
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}

// ---------------------------------------------------------------------
// LEGACY: the old FHSS-only rule. Registration no longer uses it (the
// client opened registration to any email), but it is still exported so
// any other file that imports it does not break. If nothing else uses
// it, these two exports can be deleted.
// ---------------------------------------------------------------------
const UNIVERSITY_EMAIL_PATTERN = /^ar\d+@fhss\.sjp\.ac\.lk$/i;

export function isUniversityEmail(email: string): boolean {
  return UNIVERSITY_EMAIL_PATTERN.test(email.trim());
}

export const UNIVERSITY_EMAIL_EXAMPLE = "ar118533@fhss.sjp.ac.lk";
