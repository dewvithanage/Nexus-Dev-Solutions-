import { describe, expect, it } from "vitest";
import { buildWhatsAppLink, toWhatsAppNumber } from "@/lib/whatsapp";

// wa.me links must use the international number without a leading 0,
// or WhatsApp says the number is invalid.

describe("toWhatsAppNumber", () => {
  it.each([
    ["0740828832", "94740828832"],
    ["074 082 8832", "94740828832"],
    ["074-082-8832", "94740828832"],
    ["740828832", "94740828832"],
    ["+94 74 082 8832", "94740828832"],
    ["94740828832", "94740828832"],
    ["0094740828832", "94740828832"],
    ["+44 7911 123456", "447911123456"],
  ])("%s -> %s", (input, expected) => {
    expect(toWhatsAppNumber(input)).toBe(expected);
  });
});

describe("buildWhatsAppLink", () => {
  it("uses the international number and encodes the message", () => {
    expect(buildWhatsAppLink("0740828832", "Hi! Order #12 & pickup?")).toBe(
      "https://wa.me/94740828832?text=Hi!%20Order%20%2312%20%26%20pickup%3F"
    );
  });
});
