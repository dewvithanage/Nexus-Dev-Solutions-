import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createEntrepreneur, jsonRequest, resetDatabase, TEST_PASSWORD, userWithSecrets } from "./helpers";

// POST /api/auth/forgot-password and POST /api/auth/reset-password

// Never send real email from tests.
const sendPasswordResetEmail = vi.hoisted(() => vi.fn());
vi.mock("@/lib/email", () => ({ sendPasswordResetEmail }));

const forgot = (body: unknown) => forgotPassword(jsonRequest("/api/auth/forgot-password", "POST", body));
const reset = (body: unknown) => resetPassword(jsonRequest("/api/auth/reset-password", "POST", body));

beforeEach(async () => {
  await resetDatabase();
  sendPasswordResetEmail.mockReset().mockResolvedValue(undefined);
});

describe("POST /api/auth/forgot-password", () => {
  it("stores a reset token for a registered email and emails the link only to that address", async () => {
    const user = await createEntrepreneur();

    const response = await forgot({ email: user.email });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.resetLink).toBeNull();
    const saved = await userWithSecrets(user.id);
    expect(saved.resetToken).toMatch(/^[a-f0-9]{64}$/);
    expect(saved.resetTokenExpiry!.getTime()).toBeGreaterThan(Date.now());
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(user.email, expect.stringContaining(saved.resetToken!));
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
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: new Date(Date.now() + expiresInMs) },
    });
    return { user, token };
  }

  it("changes the password with a valid token and then clears the token", async () => {
    const { user, token } = await userWithToken(60_000);

    const response = await reset({ token, newPassword: "BrandNew456" });

    expect(response.status).toBe(200);
    const saved = await userWithSecrets(user.id);
    expect(await verifyPassword("BrandNew456", saved.passwordHash)).toBe(true);
    expect(saved.resetToken).toBeNull();
    expect(saved.resetTokenExpiry).toBeNull();
  });

  it("refuses to reuse a token after it has been used", async () => {
    const { token } = await userWithToken(60_000);
    await reset({ token, newPassword: "BrandNew456" });

    const response = await reset({ token, newPassword: "Another789" });

    expect(response.status).toBe(400);
  });

  it("rejects an expired token and leaves the password unchanged", async () => {
    const { user, token } = await userWithToken(-1_000);

    const response = await reset({ token, newPassword: "BrandNew456" });

    expect(response.status).toBe(400);
    const saved = await userWithSecrets(user.id);
    expect(await verifyPassword(TEST_PASSWORD, saved.passwordHash)).toBe(true);
  });

  it("rejects a wrong token and leaves the password unchanged", async () => {
    const { user } = await userWithToken(60_000);

    const response = await reset({ token: "cd".repeat(32), newPassword: "BrandNew456" });

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
    expect(saved.resetToken).toBe(token);
  });

  it("rejects extra fields such as userId with 400", async () => {
    const { user, token } = await userWithToken(60_000);
    const other = await createEntrepreneur();

    const response = await reset({ token, newPassword: "BrandNew456", userId: other.id });

    expect(response.status).toBe(400);
    const saved = await userWithSecrets(user.id);
    expect(await verifyPassword(TEST_PASSWORD, saved.passwordHash)).toBe(true);
  });
});
