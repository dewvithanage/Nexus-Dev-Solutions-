import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { hashResetToken } from "@/lib/reset-token";
import { createEntrepreneur, jsonRequest, resetDatabase, TEST_PASSWORD, userWithSecrets } from "./helpers";

// POST /api/auth/forgot-password and POST /api/auth/reset-password

// Never send real email from tests.
const { sendPasswordResetEmail, verifyPasswordResetEmailService } = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn(), verifyPasswordResetEmailService: vi.fn(),
}));
vi.mock("@/lib/email", () => ({ sendPasswordResetEmail, verifyPasswordResetEmailService }));

const forgot = (body: unknown) => forgotPassword(jsonRequest("/api/auth/forgot-password", "POST", body));
const reset = (body: unknown) => resetPassword(jsonRequest("/api/auth/reset-password", "POST", body));

beforeEach(async () => {
  await resetDatabase();
  sendPasswordResetEmail.mockReset().mockResolvedValue(undefined);
  verifyPasswordResetEmailService.mockReset().mockResolvedValue(undefined);
});

describe("POST /api/auth/forgot-password", () => {
  // The token as the account owner receives it, taken from the emailed link.
  function tokenFromEmail() {
    const link: string = sendPasswordResetEmail.mock.calls.at(-1)![1];
    return new URL(link).searchParams.get("token")!;
  }

  it("emails the link only to that address and stores only a hash of the token", async () => {
    const user = await createEntrepreneur();

    const response = await forgot({ email: user.email });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.resetLink).toBeNull();
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(user.email, expect.any(String));
    const token = tokenFromEmail();
    expect(token).toMatch(/^[a-f0-9]{64}$/);

    const saved = await userWithSecrets(user.id);
    expect(saved.resetToken).toBe(hashResetToken(token));
    expect(saved.resetToken).not.toBe(token);
    expect(saved.resetTokenExpiry!.getTime()).toBeGreaterThan(Date.now());
  });

  it("finds the account whatever letter case the email is typed in", async () => {
    const user = await createEntrepreneur();

    await forgot({ email: user.email.toUpperCase() });

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(user.email, expect.any(String));
  });

  it("answers a registered and an unknown email with exactly the same reply", async () => {
    const user = await createEntrepreneur();

    const known = await (await forgot({ email: user.email })).json();
    const unknown = await (await forgot({ email: "nobody@example.com" })).json();

    expect(known).toEqual(unknown);
  });

  it("the emailed link resets the password; the stored hash itself does not", async () => {
    const user = await createEntrepreneur();
    await forgot({ email: user.email });
    const saved = await userWithSecrets(user.id);

    // Someone who can read the database only sees the hash.
    expect((await reset({ token: saved.resetToken, newPassword: "TestOnlyBrandNew456!" })).status).toBe(400);

    expect((await reset({ token: tokenFromEmail(), newPassword: "TestOnlyBrandNew456!" })).status).toBe(200);
    expect(await verifyPassword("TestOnlyBrandNew456!", (await userWithSecrets(user.id)).passwordHash)).toBe(true);
  });

  it("gives the same answer for an unknown email and sends nothing", async () => {
    const response = await forgot({ email: "nobody@example.com" });

    expect(response.status).toBe(200);
    expect((await response.json()).resetLink).toBeNull();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("does not reveal the link when sending fails outside development", async () => {
    const user = await createEntrepreneur();
    sendPasswordResetEmail.mockRejectedValue(new Error("SMTP down"));

    const response = await forgot({ email: user.email });

    expect((await response.json()).resetLink).toBeNull();
  });

  it("never reveals a reset link when email delivery fails in development", async () => {
    const user = await createEntrepreneur();
    sendPasswordResetEmail.mockRejectedValue(new Error("SMTP down"));
    vi.stubEnv("NODE_ENV", "development");
    try {
      const known = await (await forgot({ email: user.email })).json();
      const unknown = await (await forgot({ email: "missing@example.com" })).json();
      expect(known).toEqual(unknown);
      expect(known.resetLink).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("reports an SMTP outage identically for known and unknown accounts", async () => {
    const user = await createEntrepreneur();
    verifyPasswordResetEmailService.mockRejectedValue(Object.assign(new Error("Authentication failed"), { code: "EAUTH" }));
    const known = await forgot({ email: user.email });
    const unknown = await forgot({ email: "missing@example.com" });
    expect(known.status).toBe(503);
    expect(unknown.status).toBe(503);
    expect(await known.json()).toEqual(await unknown.json());
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect((await userWithSecrets(user.id)).resetToken).toBeNull();
  });

  it("clears an undelivered token without exposing it", async () => {
    const user = await createEntrepreneur();
    sendPasswordResetEmail.mockRejectedValue(new Error("Recipient rejected"));
    const response = await forgot({ email: user.email });
    expect((await response.json()).resetLink).toBeNull();
    expect((await userWithSecrets(user.id)).resetToken).toBeNull();
  });

  it("rejects unknown fields with 400", async () => {
    const user = await createEntrepreneur();

    const response = await forgot({ email: user.email, resetToken: "a".repeat(64) });

    expect(response.status).toBe(400);
    const saved = await userWithSecrets(user.id);
    expect(saved.resetToken).toBeNull();
  });
});

describe("POST /api/auth/reset-password", () => {
  async function userWithToken(expiresInMs: number) {
    const user = await createEntrepreneur();
    const token = "ab".repeat(32);
    // Stored the way forgot-password stores it: hashed.
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashResetToken(token), resetTokenExpiry: new Date(Date.now() + expiresInMs) },
    });
    return { user, token };
  }

  it("changes the password with a valid token and then clears the token", async () => {
    const { user, token } = await userWithToken(60_000);

    const response = await reset({ token, newPassword: "TestOnlyBrandNew456!" });

    expect(response.status).toBe(200);
    const saved = await userWithSecrets(user.id);
    expect(await verifyPassword("TestOnlyBrandNew456!", saved.passwordHash)).toBe(true);
    expect(saved.resetToken).toBeNull();
    expect(saved.resetTokenExpiry).toBeNull();
  });

  it("consumes a reset token once even when two requests arrive together", async () => {
    const { user, token } = await userWithToken(60_000);
    const passwords = ["TestConcurrent123!", "TestConcurrent456!"];
    const responses = await Promise.all(passwords.map((newPassword) => reset({ token, newPassword })));
    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
    const winner = responses.findIndex((response) => response.status === 200);
    const saved = await userWithSecrets(user.id);
    expect(await verifyPassword(passwords[winner], saved.passwordHash)).toBe(true);
    expect(saved.resetToken).toBeNull();
    expect(saved.sessionVersion).toBe(1);
  });

  it("refuses to reuse a token after it has been used", async () => {
    const { token } = await userWithToken(60_000);
    await reset({ token, newPassword: "TestOnlyBrandNew456!" });

    const response = await reset({ token, newPassword: "TestOnlyAnother789!" });

    expect(response.status).toBe(400);
  });

  it("rejects an expired token and leaves the password unchanged", async () => {
    const { user, token } = await userWithToken(-1_000);

    const response = await reset({ token, newPassword: "TestOnlyBrandNew456!" });

    expect(response.status).toBe(400);
    const saved = await userWithSecrets(user.id);
    expect(await verifyPassword(TEST_PASSWORD, saved.passwordHash)).toBe(true);
  });

  it("rejects a wrong token and leaves the password unchanged", async () => {
    const { user } = await userWithToken(60_000);

    const response = await reset({ token: "cd".repeat(32), newPassword: "TestOnlyBrandNew456!" });

    expect(response.status).toBe(400);
    const saved = await userWithSecrets(user.id);
    expect(await verifyPassword(TEST_PASSWORD, saved.passwordHash)).toBe(true);
  });

  it("rejects a weak new password and leaves the password unchanged", async () => {
    const { user, token } = await userWithToken(60_000);

    const response = await reset({ token, newPassword: "short" });

    expect(response.status).toBe(400);
    const saved = await userWithSecrets(user.id);
    expect(await verifyPassword(TEST_PASSWORD, saved.passwordHash)).toBe(true);
    expect(saved.resetToken).toBe(hashResetToken(token));
  });

  it("rejects extra fields such as userId with 400", async () => {
    const { user, token } = await userWithToken(60_000);
    const other = await createEntrepreneur();

    const response = await reset({ token, newPassword: "TestOnlyBrandNew456!", userId: other.id });

    expect(response.status).toBe(400);
    const saved = await userWithSecrets(user.id);
    expect(await verifyPassword(TEST_PASSWORD, saved.passwordHash)).toBe(true);
  });
});
