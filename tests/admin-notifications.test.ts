import { beforeEach, describe, expect, it } from "vitest";
import { GET as listNotifications, PATCH as markAllRead } from "@/app/api/notifications/route";
import { PATCH as markOneRead } from "@/app/api/notifications/[id]/route";
import { prisma } from "@/lib/prisma";
import { createAdmin, createEntrepreneur, jsonRequest, resetDatabase, routeParams, signInAs } from "./helpers";

// Security tests for Admin Notifications, from the admin's side:
//   GET   /api/notifications        (private: the caller's own notifications)
//   PATCH /api/notifications        (changes data: marks all of the caller's as read)
//   PATCH /api/notifications/[id]   (changes data: marks one as read)
// Being an admin must not widen access: an admin only ever sees and changes
// their own notifications, never an entrepreneur's or another admin's.

const notify = (userId: string, type = "ORDER") =>
  prisma.notification.create({ data: { userId, type, title: "Heads up", message: "Hello" } });

const list = (query = "") => listNotifications(jsonRequest(`/api/notifications${query}`, "GET"));
const markOne = (id: string) => markOneRead(jsonRequest(`/api/notifications/${id}`, "PATCH"), routeParams({ id }));
const isRead = async (id: string) => (await prisma.notification.findUniqueOrThrow({ where: { id } })).isRead;

beforeEach(resetDatabase);

describe("GET /api/notifications as an admin", () => {
  it("rejects a request with no session with 401", async () => {
    await notify((await createAdmin()).id);
    expect((await list()).status).toBe(401);
  });

  it("returns only the admin's own notifications, not entrepreneurs' or other admins'", async () => {
    const admin = await createAdmin();
    const mine = await notify(admin.id, "APPROVAL");
    await notify((await createAdmin()).id, "APPROVAL");
    await notify((await createEntrepreneur()).id, "ORDER");
    await signInAs(admin);

    const response = await list();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notifications.map((n: { id: string }) => n.id)).toEqual([mine.id]);
    expect(body.unreadCounts).toEqual([{ type: "APPROVAL", _count: 1 }]);
  });

  it("ignores a userId in the query string", async () => {
    const admin = await createAdmin();
    const entrepreneur = await createEntrepreneur();
    await notify(entrepreneur.id);
    await signInAs(admin);

    const response = await list(`?userId=${entrepreneur.id}`);

    expect(response.status).toBe(200);
    expect((await response.json()).notifications).toEqual([]);
  });

  it("rejects a malformed type filter with 400", async () => {
    await signInAs(await createAdmin());

    expect((await list("?type=ORDER'%20OR%201=1")).status).toBe(400);
    expect((await list(`?type=${"A".repeat(41)}`)).status).toBe(400);
  });
});

describe("PATCH /api/notifications/[id] as an admin", () => {
  it("rejects a request with no session with 401 and changes nothing", async () => {
    const note = await notify((await createAdmin()).id);

    expect((await markOne(note.id)).status).toBe(401);
    expect(await isRead(note.id)).toBe(false);
  });

  it("lets an admin mark their own notification as read", async () => {
    const admin = await createAdmin();
    const note = await notify(admin.id);
    await signInAs(admin);

    expect((await markOne(note.id)).status).toBe(200);
    expect(await isRead(note.id)).toBe(true);
  });

  it("answers 404 for an entrepreneur's notification and leaves it unread", async () => {
    const theirs = await notify((await createEntrepreneur()).id);
    await signInAs(await createAdmin());

    expect((await markOne(theirs.id)).status).toBe(404);
    expect(await isRead(theirs.id)).toBe(false);
  });

  it("answers 404 for another admin's notification and leaves it unread", async () => {
    const theirs = await notify((await createAdmin()).id);
    await signInAs(await createAdmin());

    expect((await markOne(theirs.id)).status).toBe(404);
    expect(await isRead(theirs.id)).toBe(false);
  });

  it("does not let an entrepreneur mark an admin's notification as read", async () => {
    const adminNote = await notify((await createAdmin()).id);
    await signInAs(await createEntrepreneur());

    expect((await markOne(adminNote.id)).status).toBe(404);
    expect(await isRead(adminNote.id)).toBe(false);
  });

  it("answers 404 for a malformed id", async () => {
    await signInAs(await createAdmin());
    expect((await markOne("' OR 1=1 --")).status).toBe(404);
  });
});

describe("PATCH /api/notifications (mark all) as an admin", () => {
  it("rejects a request with no session with 401 and changes nothing", async () => {
    const note = await notify((await createAdmin()).id);

    expect((await markAllRead()).status).toBe(401);
    expect(await isRead(note.id)).toBe(false);
  });

  it("only marks the admin's own notifications as read", async () => {
    const admin = await createAdmin();
    const mine = await notify(admin.id);
    const otherAdmins = await notify((await createAdmin()).id);
    const entrepreneurs = await notify((await createEntrepreneur()).id);
    await signInAs(admin);

    expect((await markAllRead()).status).toBe(200);

    expect(await isRead(mine.id)).toBe(true);
    expect(await isRead(otherAdmins.id)).toBe(false);
    expect(await isRead(entrepreneurs.id)).toBe(false);
  });
});
