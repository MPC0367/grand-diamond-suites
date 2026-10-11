/* Builds the site's photographs from the untouched originals.

   For each entry in src/data/media.mjs it applies a conservative, global
   correction (never a local edit, never added or removed content), then
   writes responsive AVIF and WebP files plus one JPEG fallback into docs/media.
   Output widths never exceed the source: nothing is enlarged here. If a
   restored master exists at _private/upscaled/<id>.png it is used instead
   of the original and larger widths become available.

   It also writes:
     src/data/media.generated.json   sizes the templates need
     _private/asset-manifest.json    provenance and what was done to each file
     _private/review/compare-*.jpg   original beside result, when run with --compare

   Usage: node tools/images.mjs [--compare] [--only=<id>] */
import sharp from "sharp";
import { readFile, writeFile, mkdir, stat, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { media, unused } from "../src/data/media.mjs";

const ORIG = path.resolve("_private/originals");
const UPSCALED = path.resolve("_private/upscaled");
const OUT = path.resolve("docs/media"); /* published as /media by GitHub Pages */
const REVIEW = path.resolve("_private/review");
const WIDTHS = [480, 768, 1024, 1440, 1920, 2560];
const BUDGET = 200 * 1024; /* studio standard: no image over 200 KB */
const compare = process.argv.includes("--compare");
const only = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);

const index = JSON.parse(await readFile(path.join(ORIG, "index.json"), "utf8"));
const srcInfo = new Map(index.items.filter((i) => i.file).map((i) => [i.file, i]));
await mkdir(OUT, { recursive: true });
await mkdir(REVIEW, { recursive: true });

/* The standard light pass: a touch of contrast and clarity so the pictures
   sit together, nothing a guest would notice as editing. */
const STANDARD = { bright: 1, sat: 1, wb: null, contrast: 1.03, sharpen: true };

async function exists(p) { try { await stat(p); return true; } catch (e) { return false; } }

function corrected(input, m, width) {
  const t = { ...STANDARD, ...(m.tone || {}) };
  let img = sharp(input, { failOn: "none" }).rotate().flatten({ background: "#ffffff" });
  if (m.crop) img = img.extract(m._cropPx);
  if (t.wb) img = img.recomb([[t.wb[0], 0, 0], [0, t.wb[1], 0], [0, 0, t.wb[2]]]);
  if (t.bright !== 1 || t.sat !== 1) img = img.modulate({ brightness: t.bright, saturation: t.sat });
  if (t.contrast !== 1) img = img.linear(t.contrast, -(128 * (t.contrast - 1)));
  if (width) img = img.resize({ width, kernel: "lanczos3", withoutEnlargement: true });
  if (t.sharpen) img = img.sharpen({ sigma: 0.6, m1: 0.4, m2: 1.4 });
  return img;
}

/* Encode under the size budget, stepping quality down only as far as needed.
   Returns null when the picture cannot fit the budget at an acceptable
   quality: that width is then left out for that format, and the browser
   takes the next size down. */
async function encode(pipeline, format, startQ, minQ) {
  let q = startQ, buf;
  for (;;) {
    const p = pipeline.clone();
    if (format === "avif") buf = await p.avif({ quality: q, effort: 5 }).toBuffer();
    else if (format === "webp") buf = await p.webp({ quality: q, effort: 5, smartSubsample: true }).toBuffer();
    else buf = await p.jpeg({ quality: q, mozjpeg: true, chromaSubsampling: "4:2:0" }).toBuffer();
    if (buf.length <= BUDGET) return { buf, q };
    if (q <= minQ) return null;
    q = Math.max(minQ, q - 4);
  }
}

const generated = {};
const manifest = [];
const wanted = new Set();

for (const m of media) {
  if (only && m.id !== only) continue;
  const src = srcInfo.get(m.original);
  if (!src) throw new Error(`No original on file for ${m.id}: ${m.original}`);
  const master = path.join(UPSCALED, m.id + ".png");
  const useMaster = await exists(master);
  const input = useMaster ? master : path.join(ORIG, m.original);
  const meta = await sharp(input).metadata();

  if (m.crop) {
    const [l, t, w, h] = m.crop;
    m._cropPx = { left: Math.round(l * meta.width), top: Math.round(t * meta.height), width: Math.round(w * meta.width), height: Math.round(h * meta.height) };
  }
  const fullW = m.crop ? m._cropPx.width : meta.width;
  const fullH = m.crop ? m._cropPx.height : meta.height;
  /* every standard width the source can honestly fill, plus its own full width */
  let widths = WIDTHS.filter((w) => w <= fullW);
  if (!widths.length || fullW - widths[widths.length - 1] > 120) widths.push(fullW);
  widths = [...new Set(widths)].sort((a, b) => a - b);
  const files = [];
  const got = { avif: [], webp: [] };
  for (const w of widths) {
    const pipe = corrected(input, m, w);
    for (const [fmt, start, min] of [["avif", w >= 1440 ? 55 : 58, 42], ["webp", w >= 1440 ? 76 : 80, 58]]) {
      const r = await encode(pipe, fmt, start, min);
      if (!r) continue;
      await writeFile(path.join(OUT, `${m.id}-${w}.${fmt}`), r.buf);
      wanted.add(`${m.id}-${w}.${fmt}`);
      got[fmt].push(w);
      files.push({ file: `${m.id}-${w}.${fmt}`, bytes: r.buf.length, quality: r.q });
    }
  }
  /* one JPEG for browsers with neither modern format: the largest width up to 1440 that fits */
  let jpgW = null;
  for (const w of widths.filter((x) => x <= 1440).reverse()) {
    const j = await encode(corrected(input, m, w), "jpeg", 80, 64);
    if (!j) continue;
    await writeFile(path.join(OUT, `${m.id}-${w}.jpg`), j.buf);
    wanted.add(`${m.id}-${w}.jpg`);
    files.push({ file: `${m.id}-${w}.jpg`, bytes: j.buf.length, quality: j.q });
    jpgW = w;
    break;
  }
  if (!jpgW || !got.avif.length || !got.webp.length) throw new Error(`Could not fit ${m.id} into the size budget`);

  generated[m.id] = { w: fullW, h: fullH, avif: got.avif, webp: got.webp, jpg: jpgW };

  const t = { ...STANDARD, ...(m.tone || {}) };
  const steps = [];
  if (m.crop) steps.push(`cropped to ${Math.round(m.crop[2] * 100)}% x ${Math.round(m.crop[3] * 100)}% of the frame`);
  if (t.wb) steps.push(`white balance gains ${t.wb.join(", ")}`);
  if (t.bright !== 1) steps.push(`brightness x${t.bright}`);
  if (t.sat !== 1) steps.push(`saturation x${t.sat}`);
  if (t.contrast !== 1) steps.push(`contrast x${t.contrast}`);
  if (t.sharpen) steps.push("light output sharpening at each size");
  const toneOnly = !(m.tone && (m.tone.wb || (m.tone.bright && m.tone.bright !== 1) || (m.tone.sat && m.tone.sat !== 1)));
  manifest.push({
    id: m.id,
    subject: m.caption.en,
    suite: m.suite,
    group: m.group,
    source: { url: src.sourceUrl, file: src.file, width: src.width, height: src.height, format: src.format, bytes: src.bytes, sha1: src.sha1, officialPages: src.pages },
    master: useMaster ? { file: path.basename(master), width: meta.width, height: meta.height, note: "restored master supplied separately" } : null,
    rights: "Photograph published by the hotel on its official website. Used for an unofficial concept preview only; publication rights to be confirmed with the hotel before any launch.",
    focal: m.focal,
    treatment: m.tone || m.crop ? (toneOnly ? "standard pass" + (m.crop ? ", cropped" : "") : "colour corrected") : "standard pass",
    steps,
    derivatives: files,
    alt: m.alt, caption: m.caption,
  });

  if (compare) {
    const W = 1100;
    const left = await sharp(path.join(ORIG, m.original)).flatten({ background: "#fff" }).resize({ width: W }).jpeg({ quality: 88 }).toBuffer();
    const lh = (await sharp(left).metadata()).height;
    const right = await corrected(input, m, null).resize({ width: W, height: lh, fit: "contain", background: "#222" }).jpeg({ quality: 88 }).toBuffer();
    await sharp({ create: { width: W * 2 + 12, height: lh, channels: 3, background: "#222" } })
      .composite([{ input: left, left: 0, top: 0 }, { input: right, left: W + 12, top: 0 }])
      .jpeg({ quality: 84 }).toFile(path.join(REVIEW, `compare-${m.id}.jpg`));
  }
  const total = files.reduce((n, f) => n + f.bytes, 0);
  const biggest = Math.max(...files.map((f) => f.bytes));
  console.log(m.id.padEnd(46), `${fullW}x${fullH}`.padEnd(10), "avif to", String(got.avif[got.avif.length - 1]).padEnd(5), "webp to", String(got.webp[got.webp.length - 1]).padEnd(5), "jpg", String(jpgW).padEnd(5), "largest", String(Math.round(biggest / 1024)).padStart(4) + " KB", "total", String(Math.round(total / 1024)).padStart(5) + " KB");
}

if (!only) {
  /* remove files left over from photographs that are no longer used */
  for (const f of await readdir(OUT)) if (!wanted.has(f)) { await unlink(path.join(OUT, f)); console.log("removed stale", f); }
  await writeFile("src/data/media.generated.json", JSON.stringify(generated, null, 1) + "\n", "utf8");
  const notUsed = unused.map((u) => ({ ...u, source: srcInfo.get(u.original) ? { url: srcInfo.get(u.original).sourceUrl, width: srcInfo.get(u.original).width, height: srcInfo.get(u.original).height } : null }));
  const excluded = index.items.filter((i) => i.excluded).map((i) => ({ file: i.base, reason: i.excluded }));
  await writeFile("_private/asset-manifest.json", JSON.stringify({ built: new Date().toISOString(), originalsFetched: index.fetchedAt, cdnBase: index.cdnBase, used: manifest, fetchedButNotUsed: notUsed, onTheHotelCdnButNotTheHotelsOwn: excluded }, null, 1), "utf8");
  const bytes = manifest.reduce((n, m) => n + m.derivatives.reduce((k, f) => k + f.bytes, 0), 0);
  const over = manifest.flatMap((m) => m.derivatives).filter((f) => f.bytes > BUDGET);
  console.log(`\n${manifest.length} photographs, ${manifest.reduce((n, m) => n + m.derivatives.length, 0)} files, ${(bytes / 1048576).toFixed(1)} MB in docs/media; ${over.length} file(s) over 200 KB`);
  over.forEach((f) => console.log("  over budget:", f.file, Math.round(f.bytes / 1024) + " KB"));
}
