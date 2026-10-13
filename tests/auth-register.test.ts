import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createAdmin, jsonRequest, resetDatabase } from "./helpers";

// POST /api/auth/register (entrepreneur sign-up)

const register = (body: unknown) => POST(jsonRequest("/api/auth/register", "POST", body));

const validBody = {
  fullName: "Nimal Perera",
  email: "nimal@example.com",
  phone: "0771234567",
  businessName: "Nimal's Crafts",
  password: "Secret123",
};

beforeEach(resetDatabase);

describe("POST /api/auth/register", () => {
  it("creates a PENDING entrepreneur with a hashed password and notifies admins", async () => {
    const admin = await createAdmin();

    const response = await register(validBody);

    expect(response.status).toBe(201);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: validBody.email },
      include: { entrepreneurProfile: { include: { business: true } } },
    });
    expect(user.role).toBe("ENTREPRENEUR");
    expect(user.entrepreneurProfile?.status).toBe("PENDING");
    expect(user.entrepreneurProfile?.business?.businessName).toBe("Nimal's Crafts");
    expect(user.passwordHash).not.toContain(validBody.password);
    expect(await verifyPassword(validBody.password, user.passwordHash)).toBe(true);
    expect(await prisma.notification.count({ where: { userId: admin.id } })).toBe(1);
  });

  it("never returns the password hash", async () => {
    const response = await register(validBody);
    expect(JSON.stringify(await response.json())).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it("rejects a role field with 400 and creates no account", async () => {
    const response = await register({ ...validBody, role: "ADMIN" });

    expect(response.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it("rejects a status field with 400, so nobody can approve themselves", async () => {
    const response = await register({ ...validBody, status: "APPROVED" });

    expect(response.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it("rejects a duplicate email, ignoring case, with 409", async () => {
    await register(validBody);

    const response = await register({ ...validBody, email: "NIMAL@Example.com" });

    expect(response.status).toBe(409);
    expect(await prisma.user.count()).toBe(1);
  });

  it.each([
    ["too short", "Ab1"],
    ["no number", "OnlyLetters"],
    ["no letter", "12345678"],
  ])("rejects a weak password (%s) with 400", async (_label, password) => {
    const response = await register({ ...validBody, password });

    expect(response.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it("rejects a malformed email with 400", async () => {
    const response = await register({ ...validBody, email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it("rejects a non-text name with 400", async () => {
    const response = await register({ ...validBody, fullName: { $ne: null } });

    expect(response.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });
});
