/* Downloads the best available copy of every image the hotel's official
   website uses, keeps it untouched in _private/originals, and records where
   each one appears on the official site (the provenance the brief asks for).
   Usage: node tools/fetch-originals.mjs */
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const OUT = path.resolve("_private/originals");
const crawl = JSON.parse(await readFile("_private/official/crawl.json", "utf8"));
const CDN = "https://irp.cdn-website.com/adc6be87/dms3rep/multi/";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/* Images that sit on the hotel's CDN but are not the hotel's own photographs:
   stock library files and third-party pictures of other places. */
const EXCLUDE = [
  [/^pexels-photo-/i, "stock library file (Pexels)"],
  [/^4k-adventure-aerial-view-bangkok/i, "stock library file"],
  [/^adult-blond-blur-connection/i, "stock library file"],
  [/^flamingo-day-videos/i, "stock library file"],
  [/^(bts|buntadthong|erawan-shrine|platinum|pratunam|siam\+paragon)\.jpg$/i, "picture of another place, ownership not established"],
];

const groups = new Map();
for (const [slug, pg] of Object.entries(crawl.pages)) {
  for (const u of pg.rawImageUrls || []) {
    const m = u.match(/\/dms3rep\/multi\/(opt\/)?(.+)$/);
    if (!m) continue;
    const name = m[2];
    const sized = name.match(/^(.*)-(\d+)(w|h)(\.[A-Za-z0-9]+)$/);
    const base = sized ? sized[1] + sized[4] : name;
    if (!groups.has(base)) groups.set(base, { base, variants: new Set(), pages: new Set(), placements: [] });
    const g = groups.get(base);
    g.pages.add(slug);
    g.variants.add(sized ? `${sized[2]}${sized[3]}` : (m[1] ? "opt" : "orig"));
  }
  for (const p of pg.images || []) {
    const m = p.url.match(/\/dms3rep\/multi\/(opt\/)?(.+)$/);
    if (!m) continue;
    const sized = m[2].match(/^(.*)-(\d+)(w|h)(\.[A-Za-z0-9]+)$/);
    const base = sized ? sized[1] + sized[4] : m[2];
    const g = groups.get(base);
    if (g) g.placements.push({ page: slug, alt: p.alt || null, nearId: p.nearId || null, nearHeading: p.nearHeading || null });
  }
}

async function get(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, referer: "https://www.granddiamondsuites.com/" } });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) return null;
  return buf;
}

await mkdir(OUT, { recursive: true });
const index = [];
for (const g of [...groups.values()].sort((a, b) => a.base.localeCompare(b.base))) {
  const ext = path.extname(g.base);
  const stem = g.base.slice(0, -ext.length);
  const excluded = EXCLUDE.find(([rx]) => rx.test(g.base));
  const row = { base: g.base, pages: [...g.pages], variantsSeen: [...g.variants], placements: g.placements.slice(0, 12) };
  if (excluded) { row.excluded = excluded[1]; index.push(row); console.log("SKIP ", g.base, "-", excluded[1]); continue; }

  /* largest first: the untouched upload, then the CDN's own resized copies */
  const candidates = [CDN + g.base, `${CDN}opt/${stem}-2880w${ext}`, `${CDN}opt/${stem}-1920w${ext}`];
  let best = null;
  for (const url of candidates) {
    let buf = null;
    try { buf = await get(url); } catch (e) { buf = null; }
    if (!buf) continue;
    let meta;
    try { meta = await sharp(buf).metadata(); } catch (e) { continue; }
    const px = meta.width * meta.height;
    if (!best || px > best.px) best = { url, buf, meta, px };
    if (url === candidates[0]) break; /* the upload itself is the master */
  }
  if (!best) { row.error = "no copy could be fetched"; index.push(row); console.log("FAIL ", g.base); continue; }

  const safe = decodeURIComponent(g.base).replace(/[+\s]+/g, "-").replace(/[^A-Za-z0-9._-]/g, "").replace(/-+/g, "-");
  await writeFile(path.join(OUT, safe), best.buf);
  Object.assign(row, {
    file: safe,
    sourceUrl: best.url,
    isUpload: best.url === candidates[0],
    width: best.meta.width, height: best.meta.height, format: best.meta.format,
    bytes: best.buf.length,
    hasAlpha: !!best.meta.hasAlpha,
    sha1: createHash("sha1").update(best.buf).digest("hex"),
  });
  index.push(row);
  console.log("OK   ", safe.padEnd(52), `${best.meta.width}x${best.meta.height}`.padEnd(11), String(Math.round(best.buf.length / 1024)).padStart(6) + " KB", best.url === candidates[0] ? "upload" : "resized copy");
}

await writeFile(path.join(OUT, "index.json"), JSON.stringify({ fetchedAt: new Date().toISOString(), cdnBase: CDN, items: index }, null, 1), "utf8");
console.log("\n" + index.filter((r) => r.file).length + " kept, " + index.filter((r) => r.excluded).length + " excluded, " + index.filter((r) => r.error).length + " failed");
