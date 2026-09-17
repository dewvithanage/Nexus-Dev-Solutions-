// Builds a normal WhatsApp "click to chat" link (wa.me) — this is the free,
// no-API-key mechanism the requirements ask for. It just opens WhatsApp
// with a pre-filled message; no paid WhatsApp Business API involved.
export function buildWhatsAppLink(phoneNumber: string, message: string): string {
  // wa.me needs digits only (no +, spaces, or dashes).
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${digitsOnly}?text=${encodedMessage}`;
}
