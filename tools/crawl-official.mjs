/* Reads the hotel's official website in a real browser and keeps a dated
   local copy of each page (HTML, visible text, image placements, frames).
   Read-only: it follows no booking flow and submits nothing.
   Usage: node tools/crawl-official.mjs */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("_private/official");
const ORIGIN = "https://www.granddiamondsuites.com";
const PAGES = [
  ["home", "/"], ["rooms", "/rooms"], ["facilities", "/facilites"], ["offers", "/offers"],
  ["attractions", "/attractions"], ["gallery", "/gallery"], ["contact", "/contact"], ["booking", "/booking"],
  ["th-home", "/th"], ["th-rooms", "/th/rooms"], ["th-facilities", "/th/facilites"], ["th-offers", "/th/offers"],
  ["th-attractions", "/th/attractions"], ["th-gallery", "/th/gallery"], ["th-contact", "/th/contact"], ["th-booking", "/th/booking"],
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "en-US" });
const index = { fetchedAt: new Date().toISOString(), origin: ORIGIN, pages: {} };

for (const [slug, route] of PAGES) {
  const page = await ctx.newPage();
  const entry = { url: ORIGIN + route };
  try {
    const res = await page.goto(ORIGIN + route, { waitUntil: "domcontentloaded", timeout: 45000 });
    entry.status = res ? res.status() : null;
    await page.waitForTimeout(3500);
    /* walk the page so lazy sections and widgets mount */
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 700) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);

    entry.finalUrl = page.url();
    entry.title = await page.title();
    const html = await page.content();
    const text = await page.evaluate(() => document.body.innerText);
    await writeFile(path.join(OUT, slug + ".html"), html, "utf8");
    await writeFile(path.join(OUT, slug + ".txt"), text, "utf8");

    entry.images = await page.evaluate(() => {
      const rows = [];
      const push = (url, el, how) => {
        if (!url || !/cdn-website\.com/.test(url)) return;
        let sec = el.closest("[id]");
        const heading = (() => {
          let n = el;
          for (let i = 0; i < 8 && n; i++) {
            n = n.parentElement;
            const hd = n && n.querySelector && n.querySelector("h1,h2,h3,h4");
            if (hd && hd.innerText.trim()) return hd.innerText.trim().slice(0, 80);
          }
          return null;
        })();
        rows.push({ url, how, alt: el.getAttribute && el.getAttribute("alt"), nearId: sec ? sec.id : null, nearHeading: heading });
      };
      document.querySelectorAll("img").forEach((img) => {
        push(img.currentSrc || img.src, img, "img");
        const ds = img.getAttribute("data-src"); if (ds) push(ds, img, "img-data-src");
      });
      document.querySelectorAll("[data-image-url],[data-bg],[data-src]").forEach((el) => {
        ["data-image-url", "data-bg", "data-src"].forEach((a) => { const v = el.getAttribute(a); if (v) push(v, el, a); });
      });
      document.querySelectorAll("*").forEach((el) => {
        const bg = getComputedStyle(el).backgroundImage;
        if (bg && bg.includes("cdn-website.com")) {
          const m = bg.match(/url\("?([^")]+)"?\)/);
          if (m) push(m[1], el, "background");
        }
      });
      return rows;
    });
    const rawUrls = [...new Set((html.match(/https?:\/\/l?irp\.cdn-website\.com\/adc6be87\/dms3rep\/multi\/[^"'\s)\\,&]+/gi) || []))];
    entry.rawImageUrls = rawUrls;
    entry.frames = page.frames().map((f) => f.url()).filter((u) => u && u !== "about:blank");
    entry.links = await page.evaluate(() => [...new Set([...document.querySelectorAll("a[href]")].map((a) => a.href))].filter((h) => /^https?:|^tel:|^mailto:/.test(h)));
    entry.scripts = await page.evaluate(() => [...document.querySelectorAll("script[src]")].map((s) => s.src).filter((s) => !/cdn-website|multiscreensite|dudamobile|google|gstatic/.test(s)));
  } catch (e) {
    entry.error = String(e);
  }
  index.pages[slug] = entry;
  console.log(slug, entry.status, entry.error ? "ERR " + entry.error.slice(0, 80) : (entry.images.length + " placements, " + entry.rawImageUrls.length + " urls, " + entry.frames.length + " frames"));
  await page.close();
}

await writeFile(path.join(OUT, "crawl.json"), JSON.stringify(index, null, 1), "utf8");
await browser.close();
