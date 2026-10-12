/* Makes the 1200 x 630 sharing images from the opening photograph (the hotel's
   own picture of a Luxury Suite).

   social-card.jpg              the plain photograph. Referenced only by a production
                                build on the hotel's own domain.
   social-card-concept-en.jpg   the same photograph with a band that says, in words,
   social-card-concept-th.jpg   that this is an unofficial design concept. These are the
                                only cards the preview refers to, so a shared link to the
                                concept can never pass for the hotel's own site.

   The plain card needs the studio's working copy of the original; the labelled cards
   are drawn over the plain card in a browser, with the site's own fonts.
   Usage: node tools/social-card.mjs [--concept-only] */
import sharp from "sharp";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { media } from "../src/data/media.mjs";
import { ui } from "../src/i18n/ui.mjs";
import { hotel } from "../src/data/hotel.mjs";

const IMG = path.resolve("src/assets/img");
const plain = path.join(IMG, "social-card.jpg");
const originals = process.env.GDS_ORIGINALS || "_private/originals";

if (!process.argv.includes("--concept-only")) {
  const m = media.find((x) => x.id === "luxury-suite-bed-sofa-city-window");
  const src = path.resolve(originals, m.original);
  if (!existsSync(src)) throw new Error(`Original not found: ${src}. Set GDS_ORIGINALS to the folder that holds the originals, or pass --concept-only.`);
  const info = await sharp(src)
    .rotate()
    .resize({ width: 1200, height: 630, fit: "cover", position: "centre" })
    .linear(1.03, -(128 * 0.03))
    .sharpen({ sigma: 0.6, m1: 0.4, m2: 1.4 })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(plain);
  console.log("social card", info.width + "x" + info.height, Math.round(info.size / 1024) + " KB");
}

/* the labelled cards */
const { chromium } = await import("playwright");
/* a page set from a string cannot read local files, so the photograph and the fonts go in as data */
const data = (file, type) => `data:${type};base64,${readFileSync(file).toString("base64")}`;
const font = (f) => data(path.resolve("src/assets/fonts", f), "font/woff2");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage();
for (const lang of ["en", "th"]) {
  const serif = lang === "th" ? '"Noto Serif Thai"' : '"Newsreader"';
  const sans = lang === "th" ? '"Noto Sans Thai"' : '"Manrope"';
  await page.setContent(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
    @font-face { font-family: "Manrope"; font-weight: 300 800; src: url("${font("manrope-latin.woff2")}") format("woff2"); }
    @font-face { font-family: "Newsreader"; font-weight: 400; src: url("${font("newsreader-latin.woff2")}") format("woff2"); }
    @font-face { font-family: "Noto Sans Thai"; font-weight: 300 700; src: url("${font("noto-sans-thai-thai.woff2")}") format("woff2"); }
    @font-face { font-family: "Noto Serif Thai"; font-weight: 300 700; src: url("${font("noto-serif-thai-thai.woff2")}") format("woff2"); }
    * { margin: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; position: relative; overflow: hidden; background: #172329; font-family: "Manrope", ${sans}, sans-serif; }
    img { position: absolute; inset: 0; width: 1200px; height: 630px; object-fit: cover; }
    .band { position: absolute; left: 0; right: 0; bottom: 0; padding: 30px 56px 34px; background: #172329; color: #F5F2EC; border-top: 4px solid #D2B98C; }
    .name { font-family: "Newsreader", ${serif}, serif; font-size: ${lang === "th" ? 46 : 52}px; line-height: 1.2; }
    .note { margin-top: 8px; font-size: ${lang === "th" ? 25 : 26}px; line-height: 1.4; font-weight: 600; color: #D2B98C; }
  </style></head><body>
    <img src="${data(plain, "image/jpeg")}" alt="">
    <div class="band"><p class="name">${hotel.name[lang]}</p><p class="note">${ui.conceptStrip[lang]}</p></div>
  </body></html>`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  const buf = await page.screenshot({ type: "png" });
  const info = await sharp(buf).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(IMG, `social-card-concept-${lang}.jpg`));
  console.log(`concept card (${lang})`, info.width + "x" + info.height, Math.round(info.size / 1024) + " KB");
}
await browser.close();
