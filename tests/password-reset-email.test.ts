import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendPasswordResetEmail, verifyPasswordResetEmailService } from "../lib/email";

const smtp = vi.hoisted(() => ({ verify: vi.fn(), sendMail: vi.fn(), close: vi.fn(), createTransport: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: smtp.createTransport } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("EMAIL_USER", "sender@example.com");
  vi.stubEnv("EMAIL_APP_PASSWORD", "abcd efgh ijkl mnop");
  smtp.createTransport.mockReturnValue(smtp);
  smtp.verify.mockResolvedValue(true);
  smtp.sendMail.mockResolvedValue({ accepted: ["buyer@example.com"] });
});
afterEach(() => vi.unstubAllEnvs());

describe("password reset SMTP delivery", () => {
  it("normalizes Gmail app password spacing and bounds connection time", async () => {
    await verifyPasswordResetEmailService();
    expect(smtp.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      auth: { user: "sender@example.com", pass: "abcdefghijklmnop" },
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
    }));
    expect(smtp.close).toHaveBeenCalledOnce();
    expect(smtp.sendMail).not.toHaveBeenCalled();
  });
  it("emails the reset link to the requested account and closes its connection", async () => {
    const link = "http://localhost:3000/entrepreneur/reset-password?token=test-only";
    await sendPasswordResetEmail("buyer@example.com", link);
    expect(smtp.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: "buyer@example.com", subject: "StartupSpark - Password Reset",
      text: expect.stringContaining(link), html: expect.stringContaining(link),
    }));
    expect(smtp.close).toHaveBeenCalledOnce();
  });
  it("does not report success when the provider accepts no recipients", async () => {
    smtp.sendMail.mockResolvedValue({ accepted: [], rejected: ["buyer@example.com"] });
    await expect(sendPasswordResetEmail("buyer@example.com", "http://localhost/reset")).rejects.toThrow("did not accept");
    expect(smtp.close).toHaveBeenCalledOnce();
  });
  it("propagates SMTP authentication failure and closes the connection", async () => {
    smtp.verify.mockRejectedValue(new Error("Authentication failed"));
    await expect(verifyPasswordResetEmailService()).rejects.toThrow("Authentication failed");
    expect(smtp.close).toHaveBeenCalledOnce();
  });
});
