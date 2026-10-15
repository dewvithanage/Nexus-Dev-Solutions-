import { describe, expect, it } from "vitest";
import { validatePassword } from "../lib/validation";
import { newPasswordField } from "../lib/request-validation";

describe("new password strength", () => {
  it.each([
    ["short", "Abc123!"],
    ["no uppercase", "lowercase123!"],
    ["no lowercase", "UPPERCASE123!"],
    ["no number", "StrongLetters!"],
    ["no symbol", "StrongPassword123"],
    ["spaces are not a symbol", "Strong Password123"],
  ])("rejects %s in both browser and server validation", (_label, password) => {
    expect(validatePassword(password)).not.toBeNull();
    expect(newPasswordField.safeParse(password).success).toBe(false);
  });
  it("accepts exactly eight characters satisfying all rules", () => {
    expect(validatePassword("Abc123!@")).toBeNull();
    expect(newPasswordField.safeParse("Abc123!@").success).toBe(true);
  });
  it("accepts a password satisfying all rules", () => {
    expect(validatePassword("TestOnlyStrong123!")).toBeNull();
    expect(newPasswordField.safeParse("TestOnlyStrong123!").success).toBe(true);
  });
  it("rejects Unicode input exceeding bcrypt's byte limit", () => {
    expect(validatePassword("Aa1!" + "\u00e9".repeat(35))).not.toBeNull();
    expect(newPasswordField.safeParse("Aa1!" + "\u00e9".repeat(35)).success).toBe(false);
  });
  it("accepts exactly 72 ASCII bytes and rejects 73", () => {
    expect(validatePassword("Aa1!" + "x".repeat(68))).toBeNull();
    expect(validatePassword("Aa1!" + "x".repeat(69))).not.toBeNull();
  });
});
