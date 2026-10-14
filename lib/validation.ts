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

// New passwords use the same policy in registration/reset forms and APIs.
// Existing passwords remain usable through login until the owner changes them.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_RULES_HINT =
  "At least 8 characters, including uppercase and lowercase letters, a number, and a symbol.";

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  // bcrypt limits input to 72 UTF-8 bytes, not 72 JavaScript characters.
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_LENGTH) {
    return "Password must be at most 72 UTF-8 bytes. Use fewer characters if you include emoji or accented letters.";
  }
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/\d/.test(password)) return "Password must include a number.";
  if (!/[^A-Za-z0-9\s]/.test(password)) return "Password must include a symbol, such as !, @, or #.";
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
