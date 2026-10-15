// Measures how quickly the admin pages (35–42) show their data, in a real
// headless Chrome, on any deployment of the site.
//
//   npm i --no-save puppeteer-core
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/measure-admin-pages.mjs https://your-site.example before
//   (deploy the change)
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/measure-admin-pages.mjs https://your-site.example after
//
// Results are printed and saved to perf-<label>.json. Only pages are
// loaded (no data is changed), after one admin sign-in.
//
// "Data visible" = time from starting the navigation until the page's main
// area has content and no "Loading" text left in it, checked on every
// frame from the very start of the page load. That works for both the old
// pages (which say "Loading..." until their fetch finishes) and the new
// ones (whose skeleton carries a hidden "Loading ..." label).
//
// Each page is loaded once to warm up, then RUNS times; medians are
// reported. Two network profiles, matching Lighthouse:
//   desktop: 40 ms round trip, 10 Mbps
//   slow:    150 ms round trip, 1.6 Mbps, 4x slower CPU
import { writeFileSync } from "fs";
import puppeteer from "puppeteer-core";

const [baseUrl, label = "run"] = process.argv.slice(2);
const RUNS = Number(process.env.RUNS || 7);
const CHROME =
  process.env.CHROME_PATH ||
  (process.platform === "win32"
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : "/usr/bin/google-chrome");

if (!baseUrl || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  console.error("Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/measure-admin-pages.mjs <siteUrl> [label]");
  process.exit(1);
}

const profiles = {
  desktop: { latency: 40, down: 10 * 1024 * 1024, up: 10 * 1024 * 1024, cpu: 1 },
  slow: { latency: 150, down: 1.6 * 1024 * 1024, up: 750 * 1024, cpu: 4 },
};

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const login = await fetch(`${baseUrl}/api/auth/admin-login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
});
if (!login.ok) throw new Error(`Admin sign-in failed: ${login.status} ${await login.text()}`);
const [cookiePair] = login.headers.get("set-cookie").split(";");
const [cookieName, ...cookieValue] = cookiePair.split("=");
const cookie = { name: cookieName, value: cookieValue.join("="), url: baseUrl };

// Any order, for the Sales Confirmation Details page.
const salesRes = await fetch(`${baseUrl}/api/admin/sales`, { headers: { cookie: cookiePair } });
const someOrderId = salesRes.ok ? (await salesRes.json()).orders?.[0]?.id : undefined;

const pages = [
  ["Sales Verification", "/admin/sales"],
  ["Sales Confirmation Details", someOrderId && `/admin/sales/${someOrderId}`],
  ["Entrepreneur Rankings", "/admin/rankings"],
  ["Reports & Analytics", "/admin/reports"],
  ["Category Management", "/admin/categories"],
  ["Content Management", "/admin/content"],
  ["Admin Notifications", "/admin/notifications"],
  ["Admin Gallery Management", "/admin/gallery"],
].filter(([, path]) => path);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });

async function loadOnce(path, profile) {
  const page = await browser.newPage();
  await page.setCookie(cookie);
  const client = await page.createCDPSession();
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: profile.latency,
    downloadThroughput: profile.down / 8,
    uploadThroughput: profile.up / 8,
  });
  await client.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });

  let apiCalls = 0;
  page.on("request", (req) => {
    if (new URL(req.url()).pathname.startsWith("/api/")) apiCalls++;
  });
  await page.evaluateOnNewDocument(() => {
    window.__ready = 0;
    const check = () => {
      const main = document.querySelector("main");
      const shown = main && main.innerText.trim().length > 0 && !/Loading/i.test(main.textContent);
      if (shown) window.__ready = performance.timeOrigin + performance.now();
      else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });

  // Emulated latency is applied outside the page's own clock, so this is
  // wall-clock time from the start of the navigation.
  const t0 = Date.now();
  await page.goto(baseUrl + path, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__ready > 0, { timeout: 60000 });
  await page.waitForNetworkIdle({ idleTime: 500 });
  const ready = await page.evaluate(() => window.__ready);
  await page.close();
  return { dataVisible: ready - t0, apiCalls };
}

const results = [];
for (const [profileName, profile] of Object.entries(profiles)) {
  for (const [name, path] of pages) {
    await loadOnce(path, profile);
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await loadOnce(path, profile));
    const row = {
      profile: profileName,
      page: name,
      dataVisibleMs: Math.round(median(runs.map((r) => r.dataVisible))),
      apiCallsAfterLoad: median(runs.map((r) => r.apiCalls)),
    };
    results.push(row);
    console.log(`${profileName.padEnd(8)} ${name.padEnd(28)} ${String(row.dataVisibleMs).padStart(6)} ms   API calls: ${row.apiCallsAfterLoad}`);
  }
}

await browser.close();
writeFileSync(`perf-${label}.json`, JSON.stringify({ site: baseUrl, date: new Date().toISOString(), runs: RUNS, results }, null, 2));
console.log(`Saved perf-${label}.json`);
