import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { hashResetToken } from "@/lib/reset-token";
import {
  TEST_PASSWORD,
  createAdmin,
  createEntrepreneur,
  jsonRequest,
  prisma,
  resetDatabase,
  signInAs,
  signOut,
} from "./helpers";

// Captures the reset link instead of sending an email, so the tests can
// use the real token the way the account owner would.
// (vi.hoisted because vi.mock runs before the rest of this file.)
const sentEmails = vi.hoisted(() => [] as { to: string; link: string }[]);
vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: async (to: string, link: string) => {
    sentEmails.push({ to, link });
  },
}));

const validRegistration = {
  fullName: "Nimal Perera",
  email: "Nimal.Perera@Example.com",
  phone: "+94 77 123 4567",
  businessName: "Nimal Crafts",
  password: "Secure123",
};

beforeEach(async () => {
  await resetDatabase();
  signOut();
  sentEmails.length = 0;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/auth/register", () => {
  it("creates a PENDING entrepreneur with a hashed password and notifies admins", async () => {
    const admin = await createAdmin();

    const response = await register(jsonRequest("/api/auth/register", "POST", validRegistration));
    expect(response.status).toBe(201);

    const user = await prisma.user.findUnique({
      where: { email: "nimal.perera@example.com" },
      include: { entrepreneurProfile: { include: { business: true } } },
    });
    expect(user).not.toBeNull();
    expect(user!.role).toBe("ENTREPRENEUR");
    expect(user!.passwordHash).not.toContain(validRegistration.password);
    expect(await bcrypt.compare(validRegistration.password, user!.passwordHash)).toBe(true);
    expect(user!.entrepreneurProfile!.status).toBe("PENDING");
    expect(user!.entrepreneurProfile!.business!.businessName).toBe("Nimal Crafts");

    const notifications = await prisma.notification.findMany({ where: { userId: admin.id } });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("REGISTRATION");
  });

  it("never returns the password or its hash", async () => {
    const response = await register(jsonRequest("/api/auth/register", "POST", validRegistration));
    const text = await response.text();
    expect(text).not.toContain(validRegistration.password);
    expect(text).not.toContain("passwordHash");
  });

  it("rejects a duplicate email, ignoring case, with 409", async () => {
    await register(jsonRequest("/api/auth/register", "POST", validRegistration));

    const response = await register(
      jsonRequest("/api/auth/register", "POST", { ...validRegistration, email: "NIMAL.PERERA@example.com" })
    );
    expect(response.status).toBe(409);
    expect(await prisma.user.count()).toBe(1);
  });

  it.each([
    ["a missing name", { ...validRegistration, fullName: "" }],
    ["an invalid email", { ...validRegistration, email: "not-an-email" }],
    ["a short password", { ...validRegistration, password: "abc12" }],
    ["a password without a number", { ...validRegistration, password: "onlyletters" }],
    ["an invalid phone number", { ...validRegistration, phone: "call me" }],
  ])("rejects %s with 400 and creates nothing", async (_label, body) => {
    const response = await register(jsonRequest("/api/auth/register", "POST", body));
    expect(response.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it("rejects an injected role field instead of ignoring it", async () => {
    const response = await register(
      jsonRequest("/api/auth/register", "POST", { ...validRegistration, role: "ADMIN" })
    );
    expect(response.status).toBe(400);
    expect((await response.json()).message).toContain("role");
    expect(await prisma.user.count()).toBe(0);
  });

  it("rejects a body that is not JSON with 400", async () => {
    const response = await register(jsonRequest("/api/auth/register", "POST", "{not json"));
    expect(response.status).toBe(400);
  });
});

describe("POST /api/auth/login and /logout", () => {
  it("signs in with correct credentials and sets an httpOnly session cookie for that user", async () => {
    const { user } = await createEntrepreneur();

    const response = await login(
      jsonRequest("/api/auth/login", "POST", { email: user.email, password: TEST_PASSWORD })
    );
    expect(response.status).toBe(200);

    const cookie = response.cookies.get(SESSION_COOKIE_NAME);
    expect(cookie?.httpOnly).toBe(true);
    const session = await verifySessionToken(cookie!.value);
    expect(session).toMatchObject({ userId: user.id, role: "ENTREPRENEUR" });
  });

  it("accepts the email in any letter case", async () => {
    const { user } = await createEntrepreneur({ email: "mixed.case@example.com" });
    const response = await login(
      jsonRequest("/api/auth/login", "POST", { email: "MIXED.Case@Example.com", password: TEST_PASSWORD })
    );
    expect(response.status).toBe(200);
    expect((await response.json()).entrepreneur.id).toBe(user.id);
  });

  it("rejects a wrong password with 401 and no cookie", async () => {
    const { user } = await createEntrepreneur();
    const response = await login(
      jsonRequest("/api/auth/login", "POST", { email: user.email, password: "WrongPass1" })
    );
    expect(response.status).toBe(401);
    expect(response.cookies.get(SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it("gives an unknown email the same 401 as a wrong password", async () => {
    const response = await login(
      jsonRequest("/api/auth/login", "POST", { email: "nobody@example.com", password: TEST_PASSWORD })
    );
    expect(response.status).toBe(401);
    expect((await response.json()).message).toBe("Invalid email or password.");
  });

  it("does not let an admin account sign in through the entrepreneur login", async () => {
    const admin = await createAdmin();
    const response = await login(
      jsonRequest("/api/auth/login", "POST", { email: admin.email, password: TEST_PASSWORD })
    );
    expect(response.status).toBe(401);
  });

  it("rejects missing fields and unexpected fields with 400", async () => {
    expect((await login(jsonRequest("/api/auth/login", "POST", { email: "a@b.com" }))).status).toBe(400);
    expect(
      (await login(jsonRequest("/api/auth/login", "POST", { email: "a@b.com", password: "x", role: "ADMIN" }))).status
    ).toBe(400);
  });

  it("locks the email for a while after 5 failed attempts (429)", async () => {
    const { user } = await createEntrepreneur({ email: "lockout@example.com" });
    for (let attempt = 0; attempt < 5; attempt++) {
      await login(jsonRequest("/api/auth/login", "POST", { email: user.email, password: "WrongPass1" }));
    }
    // Even the correct password is refused while locked.
    const response = await login(
      jsonRequest("/api/auth/login", "POST", { email: user.email, password: TEST_PASSWORD })
    );
    expect(response.status).toBe(429);
  });

  it("logout clears the session cookie", async () => {
    const response = await logout();
    const cookie = response.cookies.get(SESSION_COOKIE_NAME);
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
  });
});

describe("GET /api/auth/me", () => {
  it("returns null without a session", async () => {
    const response = await me();
    expect((await response.json()).user).toBeNull();
  });

  it("returns only the signed-in user's own basic details", async () => {
    const { user } = await createEntrepreneur();
    await signInAs(user);
    const body = await (await me()).json();
    expect(body.user.id).toBe(user.id);
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });
});

describe("forgot and reset password", () => {
  async function requestResetLink(email: string) {
    const response = await forgotPassword(jsonRequest("/api/auth/forgot-password", "POST", { email }));
    return { response, token: sentEmails.at(-1) ? new URL(sentEmails.at(-1)!.link).searchParams.get("token")! : null };
  }

  it("gives the same reply for registered and unregistered emails", async () => {
    const { user } = await createEntrepreneur();

    const known = await (await requestResetLink(user.email)).response.json();
    const unknown = await (await requestResetLink("nobody@example.com")).response.json();

    expect(known).toEqual(unknown);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe(user.email);
  });

  it("stores only a hash of the reset token, valid for about an hour", async () => {
    const { user } = await createEntrepreneur();
    const { token } = await requestResetLink(user.email);

    const saved = await prisma.user.findUnique({ where: { id: user.id } });
    expect(saved!.resetToken).toBe(hashResetToken(token!));
    expect(saved!.resetToken).not.toBe(token);
    const minutesLeft = (saved!.resetTokenExpiry!.getTime() - Date.now()) / 60_000;
    expect(minutesLeft).toBeGreaterThan(55);
    expect(minutesLeft).toBeLessThanOrEqual(60);
  });

  it("resets the password with a valid link, after which the new password works and the link is used up", async () => {
    const { user } = await createEntrepreneur();
    const { token } = await requestResetLink(user.email);

    const response = await resetPassword(
      jsonRequest("/api/auth/reset-password", "POST", { token, newPassword: "BrandNew456" })
    );
    expect(response.status).toBe(200);

    const saved = await prisma.user.findUnique({ where: { id: user.id } });
    expect(await bcrypt.compare("BrandNew456", saved!.passwordHash)).toBe(true);
    expect(saved!.resetToken).toBeNull();

    const loginResponse = await login(
      jsonRequest("/api/auth/login", "POST", { email: user.email, password: "BrandNew456" })
    );
    expect(loginResponse.status).toBe(200);

    // Same link a second time.
    const reuse = await resetPassword(
      jsonRequest("/api/auth/reset-password", "POST", { token, newPassword: "Another789" })
    );
    expect(reuse.status).toBe(400);
  });

  it("rejects an expired link and leaves the password unchanged", async () => {
    const { user } = await createEntrepreneur();
    const { token } = await requestResetLink(user.email);
    await prisma.user.update({ where: { id: user.id }, data: { resetTokenExpiry: new Date(Date.now() - 1000) } });

    const response = await resetPassword(
      jsonRequest("/api/auth/reset-password", "POST", { token, newPassword: "BrandNew456" })
    );
    expect(response.status).toBe(400);
    const saved = await prisma.user.findUnique({ where: { id: user.id } });
    expect(await bcrypt.compare(TEST_PASSWORD, saved!.passwordHash)).toBe(true);
  });

  it("does not accept the stored hash itself as a token", async () => {
    const { user } = await createEntrepreneur();
    await requestResetLink(user.email);
    const saved = await prisma.user.findUnique({ where: { id: user.id } });

    const response = await resetPassword(
      jsonRequest("/api/auth/reset-password", "POST", { token: saved!.resetToken, newPassword: "BrandNew456" })
    );
    expect(response.status).toBe(400);
  });

  it("applies the password rules and rejects unexpected fields", async () => {
    const { user } = await createEntrepreneur();
    const { token } = await requestResetLink(user.email);

    const weak = await resetPassword(jsonRequest("/api/auth/reset-password", "POST", { token, newPassword: "short" }));
    expect(weak.status).toBe(400);

    const extra = await resetPassword(
      jsonRequest("/api/auth/reset-password", "POST", { token, newPassword: "BrandNew456", userId: "someone-else" })
    );
    expect(extra.status).toBe(400);

    // The valid token is still unused after those failures.
    const saved = await prisma.user.findUnique({ where: { id: user.id } });
    expect(saved!.resetToken).toBe(hashResetToken(token!));
  });
});
