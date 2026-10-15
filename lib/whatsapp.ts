// Builds a normal WhatsApp "click to chat" link (wa.me) — this is the free,
// no-API-key mechanism the requirements ask for. It just opens WhatsApp
// with a pre-filled message; no paid WhatsApp Business API involved.

// Sri Lanka. Sellers usually save local numbers ("077 123 4567").
const DEFAULT_COUNTRY_CODE = "94";

// wa.me only accepts the full international number, digits only, with no
// leading 0 or "+" (e.g. 94771234567). A local number like 0771234567 gives
// "The phone number shared via link is invalid" in WhatsApp.
export function toWhatsAppNumber(phoneNumber: string): string {
  let digits = phoneNumber.replace(/\D/g, "");

  // "00" is the international dialling prefix: 0094771234567.
  if (digits.startsWith("00")) digits = digits.slice(2);

  // Local format with the trunk 0: 0771234567 -> 94771234567.
  if (digits.length === 10 && digits.startsWith("0")) {
    return DEFAULT_COUNTRY_CODE + digits.slice(1);
  }

  // Local format without the 0: 771234567 -> 94771234567.
  if (digits.length === 9 && !digits.startsWith("0")) {
    return DEFAULT_COUNTRY_CODE + digits;
  }

  // Already international (94771234567, or another country's number).
  return digits;
}

export function buildWhatsAppLink(phoneNumber: string, message: string): string {
  return `https://wa.me/${toWhatsAppNumber(phoneNumber)}?text=${encodeURIComponent(message)}`;
}
