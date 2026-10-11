/* Prepares the hotel's own logo files for the site: trims the empty margin
   around each mark and writes them as PNG at their native size, plus a small
   WebP of each for the header and footer (twice the size they are shown at).
   Nothing is redrawn. Also writes a preview sheet for checking legibility.
   Usage: node tools/logo-prep.mjs */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = path.resolve("_private/originals");
const OUT = path.resolve("src/assets/img");
await mkdir(OUT, { recursive: true });

const logos = [
  ["GD_Gold-removebg-preview.png", "logo-gold.png"],
  ["Grand_Diamond_Logo_grey-removebg-preview-21f68d27.png", "logo-light.png"],
];
const SMALL = { "logo-gold.png": 320, "logo-light.png": 380 };
const meta = {};
for (const [src, out] of logos) {
  const img = sharp(path.join(SRC, src)).trim({ threshold: 1 });
  const buf = await img.png({ compressionLevel: 9 }).toBuffer();
  const m = await sharp(buf).metadata();
  await sharp(buf).toFile(path.join(OUT, out));
  const small = await sharp(buf).resize({ width: SMALL[out], kernel: "lanczos3" }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toBuffer();
  await sharp(small).toFile(path.join(OUT, out.replace(".png", ".webp")));
  const sm = await sharp(small).metadata();
  console.log(out.replace(".png", ".webp"), sm.width + "x" + sm.height, small.length, "bytes");
  const stats = await sharp(buf).stats();
  meta[out] = { width: m.width, height: m.height, bytes: buf.length, meanRGB: stats.channels.slice(0, 3).map((c) => Math.round(c.mean)) };
}
console.log(JSON.stringify(meta, null, 1));

/* preview: each logo at 60 px tall and at 2x, on the grounds it will sit on */
const tile = async (file, bg, h) => ({ input: await sharp(path.join(OUT, file)).resize({ height: h }).toBuffer(), bg });
const rows = [
  [await tile("logo-gold.png", "#F5F2EC", 60), await tile("logo-gold.png", "#F5F2EC", 120)],
  [await tile("logo-light.png", "#172329", 60), await tile("logo-light.png", "#172329", 120)],
];
const W = 900, RH = 180;
const layers = [];
for (let r = 0; r < rows.length; r++) {
  layers.push({ input: { create: { width: W, height: RH, channels: 3, background: rows[r][0].bg } }, left: 0, top: r * RH });
  layers.push({ input: rows[r][0].input, left: 40, top: r * RH + 60 });
  layers.push({ input: rows[r][1].input, left: 320, top: r * RH + 30 });
}
await sharp({ create: { width: W, height: RH * rows.length, channels: 3, background: "#888" } }).composite(layers).png().toFile(path.resolve("_private/review/logo-preview.png"));

/* Browser-tab icon: the diamond mark cut from the hotel's own gold logo, not redrawn.
   The mark is everything above the first empty band of rows in the trimmed logo. */
{
  const src = path.join(OUT, "logo-gold.png");
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rowHasInk = (y) => { for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 24) return true; return false; };
  let end = 0, gap = 0;
  for (let y = 0; y < info.height; y++) {
    if (rowHasInk(y)) { if (gap >= 3 && end > 0) break; end = y + 1; gap = 0; } else if (end > 0) gap++;
  }
  let minX = info.width, maxX = 0, minY = end, maxY = 0;
  for (let y = 0; y < end; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 24) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const mark = await sharp(src).extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }).toBuffer();
  const mm = await sharp(mark).metadata();
  for (const size of [64]) {
    const inner = Math.round(size * 0.8);
    const fitted = await sharp(mark).resize({ width: inner, height: inner, fit: "inside", kernel: "lanczos3" }).toBuffer();
    const fm = await sharp(fitted).metadata();
    await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: fitted, left: Math.round((size - fm.width) / 2), top: Math.round((size - fm.height) / 2) }])
      .png({ compressionLevel: 9 }).toFile(path.join(OUT, "favicon.png"));
  }
  console.log("favicon from the logo's own mark:", mm.width + "x" + mm.height, "rows 0 to", end);
}
