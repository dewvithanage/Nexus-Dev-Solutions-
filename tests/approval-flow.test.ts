import { beforeEach, describe, expect, it, vi } from "vitest";
import ApprovedEntrepreneurLayout from "@/app/entrepreneur/(approved)/layout";
import ApplicationStatusPage from "@/app/entrepreneur/application-status/page";
import { PATCH as approveEntrepreneur } from "@/app/api/admin/entrepreneurs/[id]/approve/route";
import { PATCH as rejectEntrepreneur } from "@/app/api/admin/entrepreneurs/[id]/reject/route";
import { prisma } from "@/lib/prisma";
import { createAdmin, createEntrepreneur, jsonRequest, resetDatabase, routeParams, signInAs, signOut } from "./helpers";

// Registration approval flow: unapproved entrepreneurs wait on the
// application status page, and are emailed when an admin decides.

const email = vi.hoisted(() => ({
  sendApplicationApprovedEmail: vi.fn(),
  sendApplicationRejectedEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));
vi.mock("@/lib/email", () => email);

beforeEach(async () => {
  await resetDatabase();
  for (const fn of Object.values(email)) fn.mockReset().mockResolvedValue(undefined);
});

// next/navigation's redirect() works by throwing; this returns where to.
async function redirectTarget(render: () => Promise<unknown>) {
  try {
    await render();
    return null;
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? "";
    if (!digest.startsWith("NEXT_REDIRECT")) throw error;
    return digest.split(";")[2];
  }
}

const seller = () => ApprovedEntrepreneurLayout({ children: "seller page" });

describe("seller pages (dashboard, products, orders...)", () => {
  it("send a pending entrepreneur to the application status page", async () => {
    await signInAs(await createEntrepreneur("PENDING"));
    expect(await redirectTarget(seller)).toBe("/entrepreneur/application-status");
  });

  it("let an approved entrepreneur in", async () => {
    await signInAs(await createEntrepreneur("APPROVED"));
    expect(await redirectTarget(seller)).toBeNull();
    expect(await seller()).toBe("seller page");
  });

  it("send visitors without a session, and admins, to the entrepreneur login", async () => {
    signOut();
    expect(await redirectTarget(seller)).toBe("/entrepreneur/login");

    await signInAs(await createAdmin());
    expect(await redirectTarget(seller)).toBe("/entrepreneur/login");
  });

  it("open as soon as an admin approves, without signing in again", async () => {
    const pending = await createEntrepreneur("PENDING");
    await signInAs(pending);
    expect(await redirectTarget(seller)).toBe("/entrepreneur/application-status");

    await prisma.entrepreneurProfile.update({ where: { id: pending.entrepreneurProfile!.id }, data: { status: "APPROVED" } });

    expect(await redirectTarget(seller)).toBeNull();
  });
});

describe("application status page", () => {
  it("is shown to a pending entrepreneur and sends an approved one to the dashboard", async () => {
    const pending = await createEntrepreneur("PENDING");
    await signInAs(pending);
    expect(await redirectTarget(ApplicationStatusPage)).toBeNull();

    await signInAs(await createEntrepreneur("APPROVED"));
    expect(await redirectTarget(ApplicationStatusPage)).toBe("/entrepreneur/dashboard");
  });
});

describe("decision emails", () => {
  it("approving emails the entrepreneur", async () => {
    const pending = await createEntrepreneur("PENDING");
    await signInAs(await createAdmin());

    const response = await approveEntrepreneur(jsonRequest("/x", "PATCH"), routeParams({ id: pending.entrepreneurProfile!.id }));

    expect(response.status).toBe(200);
    expect((await response.json()).emailSent).toBe(true);
    expect(email.sendApplicationApprovedEmail).toHaveBeenCalledWith(pending.email, pending.name);
  });

  it("still approves when the email can't be sent, and says so", async () => {
    const pending = await createEntrepreneur("PENDING");
    email.sendApplicationApprovedEmail.mockRejectedValue(new Error("SMTP down"));
    await signInAs(await createAdmin());

    const response = await approveEntrepreneur(jsonRequest("/x", "PATCH"), routeParams({ id: pending.entrepreneurProfile!.id }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.emailSent).toBe(false);
    const profile = await prisma.entrepreneurProfile.findUniqueOrThrow({ where: { id: pending.entrepreneurProfile!.id } });
    expect(profile.status).toBe("APPROVED");
    // The in-app notification is there for when they next sign in.
    expect(await prisma.notification.count({ where: { userId: pending.id } })).toBe(1);
  });

  it("rejecting emails the entrepreneur with the reason", async () => {
    const pending = await createEntrepreneur("PENDING");
    await signInAs(await createAdmin());

    await rejectEntrepreneur(
      jsonRequest("/x", "PATCH", { rejectionReason: "Not a registered student" }),
      routeParams({ id: pending.entrepreneurProfile!.id })
    );

    expect(email.sendApplicationRejectedEmail).toHaveBeenCalledWith(pending.email, pending.name, "Not a registered student");
  });

  it("sends no email when the admin action is refused", async () => {
    const approved = await createEntrepreneur("APPROVED");
    await signInAs(await createAdmin());

    const response = await approveEntrepreneur(jsonRequest("/x", "PATCH"), routeParams({ id: approved.entrepreneurProfile!.id }));

    expect(response.status).toBe(409);
    expect(email.sendApplicationApprovedEmail).not.toHaveBeenCalled();
  });
});
