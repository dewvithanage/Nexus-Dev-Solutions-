import { beforeEach, describe, expect, it } from "vitest";
import Dashboard from "@/app/entrepreneur/(approved)/dashboard/page";
import { signOutEverywhere } from "@/lib/session";
import { createAdmin, createEntrepreneur, resetDatabase, signInAs } from "./helpers";

beforeEach(resetDatabase);
async function destination() {
  try { await Dashboard(); return null; }
  catch (error) {
    const digest = (error as { digest?: string }).digest ?? "";
    if (!digest.startsWith("NEXT_REDIRECT")) throw error;
    return digest.split(";")[2];
  }
}
describe("Dewmi entrepreneur dashboard", () => {
  it("redirects visitors without a session", async () => {
    expect(await destination()).toBe("/entrepreneur/login");
  });
  it("blocks the wrong role", async () => {
    await signInAs(await createAdmin());
    expect(await destination()).toBe("/entrepreneur/login");
  });
  it("blocks pending accounts even if the page is called directly", async () => {
    await signInAs(await createEntrepreneur("PENDING"));
    expect(await destination()).toBe("/entrepreneur/application-status");
  });
  it("allows an approved seller and rejects a revoked cookie", async () => {
    const seller = await createEntrepreneur();
    await signInAs(seller);
    expect(await destination()).toBeNull();
    await signOutEverywhere(seller.id);
    expect(await destination()).toBe("/entrepreneur/login");
  });
});
