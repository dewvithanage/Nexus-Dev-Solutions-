import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../app/api/auth/forgot-password/route";

const mocks = vi.hoisted(() => ({ verify: vi.fn(), send: vi.fn(), find: vi.fn(), update: vi.fn(), cleanup: vi.fn() }));
vi.mock("@/lib/email", () => ({ verifyPasswordResetEmailService: mocks.verify, sendPasswordResetEmail: mocks.send }));
vi.mock("@/lib/prisma", () => ({ prisma: { $disconnect: async () => undefined, user: { findFirst: mocks.find, update: mocks.update, updateMany: mocks.cleanup } } }));
const request = (email: string) => new NextRequest("http://localhost/api/auth/forgot-password", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
});
beforeEach(() => {
  vi.resetAllMocks();
  mocks.verify.mockResolvedValue(undefined);
  mocks.send.mockResolvedValue(undefined);
  mocks.update.mockResolvedValue({});
  mocks.cleanup.mockResolvedValue({ count: 1 });
});
describe("password reset service failures", () => {
  it("shows the same service error for every address before looking up an account", async () => {
    mocks.verify.mockRejectedValue(new Error("SMTP unavailable"));
    const first = await POST(request("registered@example.com"));
    const second = await POST(request("unknown@example.com"));
    expect(first.status).toBe(503);
    expect(second.status).toBe(503);
    expect(await first.json()).toEqual(await second.json());
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("does not create or send a reset token for an unregistered address", async () => {
    mocks.find.mockResolvedValue(null);
    const response = await POST(request("unknown@example.com"));
    expect(response.status).toBe(200);
    expect((await response.json()).resetLink).toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("removes only the failed request's token when sending fails", async () => {
    mocks.find.mockResolvedValue({ id: "test-user", email: "registered@example.com" });
    mocks.send.mockRejectedValue(new Error("Recipient rejected"));
    const response = await POST(request("registered@example.com"));
    expect(response.status).toBe(200);
    expect((await response.json()).resetLink).toBeNull();
    const savedHash = mocks.update.mock.calls[0][0].data.resetToken;
    expect(mocks.cleanup).toHaveBeenCalledWith({
      where: { id: "test-user", resetToken: savedHash }, data: { resetToken: null, resetTokenExpiry: null },
    });
  });
});
