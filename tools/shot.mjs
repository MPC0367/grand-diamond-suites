/* Screenshots a page in a real browser, in real time.
   node tools/shot.mjs --url=<address> --out=<folder> --name=<stem>
        [--w=1440] [--h=900] [--y=0,900,1800 | --steps=6 | --full] [--mobile] [--wait=1500]
        [--engine=chromium|webkit] [--reduce] [--nojs] [--click=<selector>] [--scale=1] */
import { chromium, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a === "--" + name || a.startsWith("--" + name + "="));
  if (!hit) return dflt;
  return hit.includes("=") ? hit.slice(name.length + 3) : true;
};
const url = arg("url");
const out = path.resolve(arg("out", "_private/shots"));
const name = arg("name", "shot");
const w = +arg("w", 1440), h = +arg("h", 900);
const mobile = !!arg("mobile", false);
const wait = +arg("wait", 1500);
const engine = arg("engine", "chromium");
const scale = +arg("scale", mobile ? 2 : 1);

await mkdir(out, { recursive: true });
const browser = engine === "webkit" ? await webkit.launch() : await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({
  viewport: { width: w, height: h }, deviceScaleFactor: scale, isMobile: mobile && engine !== "webkit" ? true : undefined, hasTouch: mobile,
  reducedMotion: arg("reduce", false) ? "reduce" : "no-preference", javaScriptEnabled: !arg("nojs", false), locale: "en-US", timezoneId: "Asia/Bangkok",
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 200)); });
page.on("response", (r) => { if (r.status() >= 400) errors.push(r.status() + " " + r.url().slice(0, 160)); });

await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(wait);
const click = arg("click", null);
if (click) { await page.click(click); await page.waitForTimeout(700); }

const total = await page.evaluate(() => document.documentElement.scrollHeight);
const info = { url, viewport: [w, h], pageHeight: total, overflowX: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), shots: [], errors };

if (arg("full", false)) {
  /* walk first so lazy images load, then one tall capture */
  for (let y = 0; y < total; y += Math.round(h * 0.8)) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(150); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const f = path.join(out, `${name}-full.jpg`);
  await page.screenshot({ path: f, fullPage: true, type: "jpeg", quality: 78 });
  info.shots.push(f);
} else {
  let ys;
  if (arg("y", null)) ys = String(arg("y")).split(",").map(Number);
  else { const steps = +arg("steps", 1); ys = Array.from({ length: steps }, (_, i) => Math.round((i * Math.max(0, total - h)) / Math.max(1, steps - 1))); }
  let i = 0;
  for (const y of ys) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(650);
    const f = path.join(out, `${name}-${String(++i).padStart(2, "0")}.jpg`);
    await page.screenshot({ path: f, type: "jpeg", quality: 80 });
    info.shots.push(f);
  }
}
console.log(JSON.stringify(info));
await browser.close();
