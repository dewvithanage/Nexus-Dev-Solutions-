import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../app/api/auth/reset-password/route";
import { hashResetToken } from "../lib/reset-token";

const mocks = vi.hoisted(() => ({ find: vi.fn(), update: vi.fn(), hash: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $disconnect: async () => undefined, user: { findFirst: mocks.find, updateMany: mocks.update } } }));
vi.mock("@/lib/auth", () => ({ hashPassword: mocks.hash }));
const token = "ab".repeat(32);
const submit = (body: unknown) => POST(new NextRequest("http://localhost/api/auth/reset-password", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.find.mockResolvedValue({ id: "test-user" });
  mocks.update.mockResolvedValue({ count: 1 });
  mocks.hash.mockResolvedValue("test-hashed-password");
});
describe("reset password endpoint", () => {
  it("accepts an eight-character strong password and consumes the hashed token", async () => {
    const response = await submit({ token, newPassword: "Abc123!@" });
    expect(response.status).toBe(200);
    expect(mocks.hash).toHaveBeenCalledWith("Abc123!@");
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "test-user", resetToken: hashResetToken(token) }),
      data: { passwordHash: "test-hashed-password", resetToken: null, resetTokenExpiry: null, sessionVersion: { increment: 1 } },
    }));
  });
  it("rejects a weak password without accessing the database", async () => {
    expect((await submit({ token, newPassword: "abcdefgh" })).status).toBe(400);
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects injected account IDs without changing a password", async () => {
    expect((await submit({ token, newPassword: "Abc123!@", userId: "another-user" })).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("returns a recoverable error for an expired or unknown link", async () => {
    mocks.find.mockResolvedValue(null);
    const response = await submit({ token, newPassword: "Abc123!@" });
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_RESET_LINK");
    expect(mocks.hash).not.toHaveBeenCalled();
  });
  it("rejects a token consumed concurrently without reporting success", async () => {
    mocks.update.mockResolvedValue({ count: 0 });
    const response = await submit({ token, newPassword: "Abc123!@" });
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_RESET_LINK");
  });
});
