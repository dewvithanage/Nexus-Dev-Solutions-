import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { GET as listNotifications, PATCH as markAllRead } from "@/app/api/notifications/route";
import { PATCH as markOneRead } from "@/app/api/notifications/[id]/route";
import { createEntrepreneur, getRequest, jsonRequest, params, prisma, resetDatabase, signInAs, signOut } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
  signOut();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function notify(userId: string, type = "ORDER") {
  return prisma.notification.create({ data: { userId, type, title: "Hello", message: "Something happened" } });
}

describe("notifications", () => {
  it("401 without a session", async () => {
    expect((await listNotifications(getRequest("/api/notifications"))).status).toBe(401);
    expect((await markAllRead()).status).toBe(401);
    expect((await markOneRead(jsonRequest("/api/notifications/x", "PATCH"), params({ id: "x" }))).status).toBe(401);
  });

  it("lists only the caller's notifications", async () => {
    const me = await createEntrepreneur();
    const other = await createEntrepreneur();
    const mine = await notify(me.user.id);
    await notify(other.user.id);
    await signInAs(me.user);

    const body = await (await listNotifications(getRequest("/api/notifications"))).json();
    expect(body.notifications.map((n: { id: string }) => n.id)).toEqual([mine.id]);
  });

  it("marks the caller's own notification as read in the database", async () => {
    const me = await createEntrepreneur();
    const notification = await notify(me.user.id);
    await signInAs(me.user);

    const response = await markOneRead(jsonRequest(`/api/notifications/${notification.id}`, "PATCH"), params({ id: notification.id }));
    expect(response.status).toBe(200);
    expect((await prisma.notification.findUnique({ where: { id: notification.id } }))!.isRead).toBe(true);
  });

  it("someone else's notification is 404 and stays unread", async () => {
    const me = await createEntrepreneur();
    const other = await createEntrepreneur();
    const theirs = await notify(other.user.id);
    await signInAs(me.user);

    const response = await markOneRead(jsonRequest(`/api/notifications/${theirs.id}`, "PATCH"), params({ id: theirs.id }));
    expect(response.status).toBe(404);
    expect((await prisma.notification.findUnique({ where: { id: theirs.id } }))!.isRead).toBe(false);
  });

  it("mark all as read only touches the caller's notifications", async () => {
    const me = await createEntrepreneur();
    const other = await createEntrepreneur();
    await notify(me.user.id);
    await notify(me.user.id, "PRODUCT");
    const theirs = await notify(other.user.id);
    await signInAs(me.user);

    expect((await markAllRead()).status).toBe(200);
    expect(await prisma.notification.count({ where: { userId: me.user.id, isRead: false } })).toBe(0);
    expect((await prisma.notification.findUnique({ where: { id: theirs.id } }))!.isRead).toBe(false);
  });
});
