/* Read-only probe of the hotel's official booking page: does the booking
   interface it embeds reflect stay details passed in the page address?
   It loads the page, reads what the interface displays, and stops. It never
   selects a rate, opens a cart or submits anything.
   Usage: node tools/probe-booking.mjs --q="date=2026-11-20&nights=2" [--lang=th/] [--label=name] */
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";

const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a.startsWith("--" + name + "="));
  return hit ? hit.slice(name.length + 3) : dflt;
};
const query = arg("q", "");
const langPath = arg("lang", "");
const label = arg("label", "probe");
const url = "https://www.granddiamondsuites.com/" + langPath + "booking" + (query ? "?" + query : "");

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "en-US", timezoneId: "Asia/Bangkok" });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(9000);

const out = { requested: url, frames: [] };
for (const f of page.frames()) {
  const u = f.url();
  if (!/hopenapi\.com/.test(u)) continue;
  let text = "";
  try { text = await f.evaluate(() => document.body.innerText); } catch (e) { text = "ERR " + e; }
  const q = new URL(u);
  const keep = ["date", "nights", "adults", "children", "room-type", "roomType", "rate-plan", "promo-code", "language", "lang", "defaultAdults", "currency"];
  const params = {};
  for (const k of keep) if (q.searchParams.has(k)) params[k] = q.searchParams.get(k);
  out.frames.push({ path: q.pathname + q.hash, params, text: text.replace(/\n{2,}/g, "\n").slice(0, 1800) });
}
await mkdir("_private/booking-probe", { recursive: true });
await page.screenshot({ path: `_private/booking-probe/${label}.png`, fullPage: false });
await writeFile(`_private/booking-probe/${label}.json`, JSON.stringify(out, null, 1), "utf8");
console.log(JSON.stringify(out, null, 1));
await browser.close();
