/* Builds the site into docs/, the folder GitHub Pages serves.

   Every page is written as a real file (docs/<language>/<path>/index.html) so
   each address loads directly and survives a refresh. Links inside the site
   are relative, so the same files work under /grand-diamond-suites/ and at the
   root of a domain. Only the 404 page uses the base path, because the host
   serves it from any depth.

   The build also checks its own output and stops on a failed check:
   one H1 per page, headings in order, no duplicate ids, no leftover
   placeholders, no banned separators, every image described and sized, every
   internal link and anchor resolving to something that exists, and the same
   set of pages in both languages.

   docs/media is written by tools/images.mjs and is left alone here.

   Usage: node tools/build.mjs            preview (default)
          SITE_MODE=production SITE_ORIGIN=https://example.com SITE_BASE=/ node tools/build.mjs */
import { readFile, writeFile, mkdir, rm, readdir, stat, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { config, assertConfig } from "../src/site.config.mjs";
import { hotel } from "../src/data/hotel.mjs";
import { mediaById } from "../src/data/media.mjs";
import { suites, suiteList } from "../src/data/suites.mjs";
import { verification } from "../src/data/verification.mjs";
import { ui } from "../src/i18n/ui.mjs";
import { layout } from "../src/templates/layout.mjs";
import { viewerData } from "../src/templates/components.mjs";
import { pageList, notFound, rootPage } from "../src/templates/pages/index.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs");
const SRC_ASSETS = path.join(ROOT, "src", "assets");

assertConfig();
/* the booking handoff may only ever point at the hotel's own booking page */
for (const lg of config.languages) {
  const u = new URL(hotel.booking.page[lg]);
  if (u.protocol !== "https:" || u.host !== hotel.booking.allowedHost) throw new Error(`Booking page for "${lg}" must be https on ${hotel.booking.allowedHost}: ${hotel.booking.page[lg]}`);
}
const generated = JSON.parse(await readFile(path.join(ROOT, "src/data/media.generated.json"), "utf8"));
const mapInfo = JSON.parse(await readFile(path.join(ROOT, "src/data/map.generated.json"), "utf8"));

/* ---------- helpers shared by every page ---------- */

const fmt = (s, vars) => String(s).replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? vars[k] : m));

/* Figures the wording refers to are filled in from the data, so a number is typed in one place only.
   Any text read through c.l() may use these names in braces. */
const services = hotel.dining.services;
const FACTS = {
  suiteCount: hotel.suiteCount.value,
  minArea: Math.min(...suiteList.map((x) => x.area.min)),
  maxArea: Math.max(...suiteList.map((x) => x.area.max)),
  bfOpens: services[0].opens, bfCloses: services[0].closes,
  alcOpens: services[1].opens, alcCloses: services[1].closes, lastOrder: services[1].lastOrder,
  maxNights: hotel.booking.maxNights, maxGuests: hotel.booking.maxGuests, maxAdults: hotel.booking.maxAdults,
  occFamily: suites["family-suite"].occupancy, occDeluxe: suites["deluxe-suite"].occupancy,
  occExecutive: suites["executive-suite"].occupancy, occPenthouse: suites["penthouse-suite"].occupancy,
  checkIn: hotel.bookingPageNotes.checkIn, checkOut: hotel.bookingPageNotes.checkOut,
  mapProvider: config.map.satellite.provider,
};
const fill = (v) => (typeof v === "string" ? fmt(v, FACTS) : Array.isArray(v) ? v.map(fill) : v);

/* The studio's working notes on each item of the verification list: what each source says, the question for
   the hotel, who is to answer. Private, so not in the repository; a clone builds without them. */
const notesFile = path.join(ROOT, "_private/verification-notes.json");
const notes = existsSync(notesFile) ? JSON.parse(await readFile(notesFile, "utf8")) : null;

/* the verification list must name real suites and real rows, and a printed note needs both languages */
{
  const fields = new Set(["area", "beds", "bedrooms", "bathrooms", "living", "kitchen", "outdoor", "occupancy", "variants"]);
  const ids = new Set();
  for (const v of verification) {
    if (ids.has(v.id)) throw new Error("Verification queue: duplicate id " + v.id);
    ids.add(v.id);
    if (!["conflicting", "unknown", "published", "confirmed"].includes(v.status)) throw new Error("Verification queue: unknown status on " + v.id);
    if (v.subject !== "hotel") {
      if (!suites[v.subject]) throw new Error("Verification queue: unknown suite on " + v.id);
      if (!fields.has(v.field)) throw new Error("Verification queue: unknown field on " + v.id);
    }
    if (v.flag && !(v.flag.en && v.flag.th)) throw new Error("Verification queue: note on " + v.id + " needs English and Thai");
    if (v.status === "confirmed" && v.flag) throw new Error("Verification queue: a confirmed item carries no note: " + v.id);
    if (notes) {
      const n = notes[v.id];
      if (!n || !n.detail || !n.question || !n.owner) throw new Error("Verification queue: the working notes lack what the sources say, the question or the owner for " + v.id);
      if (v.status === "confirmed" && !n.reviewer) throw new Error("Verification queue: a confirmed item names its reviewer: " + v.id);
    }
  }
  if (notes) for (const id of Object.keys(notes)) if (!ids.has(id)) throw new Error("Verification queue: working notes for an item that is not in the list: " + id);
}

const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const map = {
  width: mapInfo.width,
  height: mapInfo.height,
  files: mapInfo.files,
  bounds: mapInfo.bounds,
  /* how many metres of ground the plate spans from west to east, at its own latitude */
  groundWidth: 6378137 * (((mapInfo.bounds.east - mapInfo.bounds.west) * Math.PI) / 180) * Math.cos((((mapInfo.bounds.north + mapInfo.bounds.south) / 2) * Math.PI) / 180),
  /** Position on the plate as percentages, from the same bounds the drawing used. */
  project(lat, lon) {
    const b = mapInfo.bounds;
    const x = ((lon - b.west) / (b.east - b.west)) * 100;
    const y = ((mercY(b.north) - mercY(lat)) / (mercY(b.north) - mercY(b.south))) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) throw new Error(`Coordinate ${lat}, ${lon} is outside the map plate`);
    return [x, y];
  },
};

async function hashOf(...files) {
  const h = createHash("sha1");
  for (const f of files) h.update(await readFile(f));
  return h.digest("hex").slice(0, 10);
}
const stamp = await hashOf(path.join(SRC_ASSETS, "css/site.css"), path.join(SRC_ASSETS, "js/site.js"));

function dateLong(lang, iso) {
  return new Intl.DateTimeFormat(lang === "th" ? "th-TH-u-ca-gregory" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(iso + "T00:00:00Z"));
}

function context(lang, page, { absoluteLinks = false } = {}) {
  const depth = 1 + page.path.split("/").filter(Boolean).length;
  const root = absoluteLinks ? config.basePath : "../".repeat(depth);
  const other = lang === "en" ? "th" : "en";
  const used = new Set();
  return {
    lang, other, config, hotel, map, stamp, used,
    page,
    /* set by a component that a page uses, read by the layout: `map` when the page carries the neighbourhood map */
    flags: {},
    l(o) {
      if (o === null || o === undefined) throw new Error(`Missing text on ${lang}/${page.path}`);
      if (typeof o === "string") return fill(o);
      if (!(lang in o)) throw new Error(`No ${lang} text for ${JSON.stringify(o).slice(0, 80)}`);
      return fill(o[lang]);
    },
    t(key, vars) {
      if (!ui[key]) throw new Error(`Unknown interface string "${key}"`);
      return fmt(ui[key][lang], vars);
    },
    href: (p = "") => root + lang + "/" + p,
    altHref: root + other + "/" + page.path,
    rootHref: root,
    asset: (p) => root + (p.startsWith("media/") ? p : "assets/" + p),
    absolute: (lg, p) => config.origin + config.basePath + lg + "/" + p,
    media(id) {
      const m = mediaById.get(id), g = generated[id];
      if (!m || !g) throw new Error(`Unknown photograph "${id}" on ${lang}/${page.path}`);
      used.add(id);
      return { ...m, ...g, file: id };
    },
    dateLong: (iso) => dateLong(lang, iso),
    fmt,
  };
}

/* ---------- write ---------- */

const written = new Map(); /* output path relative to docs -> html */
async function put(rel, content) {
  const file = path.join(OUT, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
  written.set(rel.replace(/\\/g, "/"), content);
}

async function copyDir(from, to) {
  await mkdir(to, { recursive: true });
  for (const ent of await readdir(from, { withFileTypes: true })) {
    const a = path.join(from, ent.name), b = path.join(to, ent.name);
    if (ent.isDirectory()) await copyDir(a, b);
    else if (!/^faces\.json$/.test(ent.name)) await copyFile(a, b);
  }
}

/* clean everything this build owns; docs/media belongs to tools/images.mjs */
await mkdir(OUT, { recursive: true });
for (const ent of await readdir(OUT)) {
  if (ent === "media") continue;
  await rm(path.join(OUT, ent), { recursive: true, force: true });
}
await copyDir(SRC_ASSETS, path.join(OUT, "assets"));
await writeFile(path.join(OUT, ".nojekyll"), "", "utf8");

const pages = pageList();
const report = [];

for (const lang of config.languages) {
  for (const def of pages) {
    const page = { id: def.id, path: def.path, title: "", description: "" };
    const c = context(lang, page);
    const meta = def.meta(c);
    page.title = meta.title;
    page.description = meta.description;
    const body = def.render(c);
    const viewer = c.used.size ? viewerData(c, [...c.used]) : null;
    const htmlText = layout(c, { main: body.main, viewer: body.viewer === false ? null : viewer, preloadImage: body.preloadImage || null, bodyClass: body.bodyClass || "", jsonld: config.mode === "production" ? body.jsonld || null : null });
    await put(`${lang}/${def.path}index.html`, htmlText);
    report.push({ lang, id: def.id, path: `${lang}/${def.path}`, title: meta.title, description: meta.description, bytes: Buffer.byteLength(htmlText), gzip: zlib.gzipSync(htmlText).length });
  }
}

/* the 404 page is served from any depth, so its links carry the base path */
{
  const page = { id: "404", path: "", title: "", description: "" };
  const c = context("en", page, { absoluteLinks: true });
  const meta = notFound.meta(c);
  page.title = meta.title; page.description = meta.description;
  const body = notFound.render(c);
  await put("404.html", layout(c, { main: body.main, viewer: null, bodyClass: "is-404" }));
}

/* the bare address: sends people to a language and keeps old section links meaningful */
await put("index.html", rootPage({ config, stamp, hotel, t: (key, lang) => ui[key][lang] }));

if (config.mode === "production") {
  const urls = [];
  for (const def of pages) {
    const alt = config.languages.map((lg) => `    <xhtml:link rel="alternate" hreflang="${lg}" href="${config.origin}${config.basePath}${lg}/${def.path}"/>`).join("\n");
    for (const lg of config.languages) urls.push(`  <url>\n    <loc>${config.origin}${config.basePath}${lg}/${def.path}</loc>\n${alt}\n  </url>`);
  }
  await put("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`);
  await put("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${config.origin}${config.basePath}sitemap.xml\n`);
}

/* ---------- checks ---------- */

const errors = [], warnings = [];
const stripScripts = (h) => h.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
const textOf = (h) => stripScripts(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ");
const idsOf = (h) => [...stripScripts(h).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);

for (const [rel, h] of written) {
  if (!rel.endsWith(".html")) continue;
  const where = rel;
  const body = stripScripts(h);
  const isRoot = rel === "index.html";

  /* one H1, headings never skipping a level */
  const heads = [...body.matchAll(/<h([1-6])\b/g)].map((m) => +m[1]);
  const h1 = heads.filter((n) => n === 1).length;
  if (h1 !== 1) errors.push(`${where}: ${h1} H1 headings (must be exactly one)`);
  let prev = 0;
  heads.forEach((n, i) => { if (n > prev + 1 && !(i === 0 && n === 1)) errors.push(`${where}: heading level jumps from H${prev} to H${n}`); prev = n; });

  /* ids are unique */
  const ids = idsOf(h), seen = new Set();
  for (const id of ids) { if (seen.has(id)) errors.push(`${where}: duplicate id "${id}"`); seen.add(id); }

  /* placeholders all filled, house separators never used */
  const text = textOf(h);
  const left = text.match(/\{[a-zA-Z]+\}/g);
  if (left) errors.push(`${where}: unfilled placeholder ${[...new Set(left)].join(" ")}`);
  const attrText = [...body.matchAll(/\s(?:alt|aria-label|title|content|placeholder)="([^"]*)"/g)].map((m) => m[1]).join(" ");
  for (const [glyph, name] of [["·", "middle dot"], ["—", "long dash"], ["–", "en dash"]]) {
    if ((text + " " + attrText).includes(glyph)) errors.push(`${where}: contains a ${name}`);
  }
  if (/\{[a-zA-Z]+\}/.test(attrText)) errors.push(`${where}: unfilled placeholder in an attribute`);
  /* Thai pages use Gregorian years; a Buddhist-era year may appear only when it is marked as one */
  if (rel.startsWith("th/")) {
    const be = (text + " " + attrText).match(/(?<!พ\.ศ\. )\b25[5-7]\d\b/g);
    if (be) errors.push(`${where}: Buddhist-era year not marked as one: ${[...new Set(be)].join(" ")}`);
  }

  /* images: described, sized */
  for (const m of body.matchAll(/<img\b[^>]*>/g)) {
    const tag = m[0];
    const alt = /\salt="([^"]*)"/.exec(tag);
    if (!alt) errors.push(`${where}: image without alt: ${tag.slice(0, 90)}`);
    else if (alt[1].length > 125) errors.push(`${where}: alt text over 125 characters (${alt[1].length}): ${alt[1].slice(0, 60)}`);
    if (!/\swidth="\d+"/.test(tag) || !/\sheight="\d+"/.test(tag)) {
      if (!/data-img/.test(tag)) errors.push(`${where}: image without width and height: ${tag.slice(0, 90)}`);
    }
  }

  /* document basics */
  if (!/<html lang="(en|th)"/.test(h)) errors.push(`${where}: missing html lang`);
  if (!/<title>[^<]+<\/title>/.test(h)) errors.push(`${where}: missing title`);
  if (config.mode === "preview" && !/<meta name="robots" content="noindex, nofollow">/.test(h)) errors.push(`${where}: preview page without noindex`);
  if (config.mode === "preview" && /rel="canonical"|application\/ld\+json/.test(h)) errors.push(`${where}: preview page carries canonical or structured data`);
  if (!isRoot && config.mode === "preview" && !/class="concept-strip"/.test(h)) errors.push(`${where}: preview page without the concept notice`);

  /* links and files */
  const dir = path.posix.dirname(rel);
  const refs = [...body.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const m of body.matchAll(/\ssrcset="([^"]+)"/g)) for (const part of m[1].split(",")) refs.push(part.trim().split(/\s+/)[0]);
  for (let ref of refs) {
    ref = ref.replace(/&amp;/g, "&");
    if (/^(https?:|mailto:|tel:|data:)/.test(ref)) continue;
    if (ref.startsWith("#")) { if (ref.length > 1 && !seen.has(ref.slice(1))) errors.push(`${where}: link to missing anchor ${ref}`); continue; }
    let [p, hash] = ref.split("#");
    p = p.split("?")[0];
    let target;
    if (p.startsWith(config.basePath)) target = p.slice(config.basePath.length);
    else if (p.startsWith("/")) { errors.push(`${where}: root-relative link outside the base path: ${ref}`); continue; }
    else target = path.posix.normalize(path.posix.join(dir === "." ? "" : dir, p));
    if (target.startsWith("..")) { errors.push(`${where}: link leaves the site: ${ref}`); continue; }
    if (target === "" || target.endsWith("/")) target += "index.html";
    if (target === "./index.html") target = "index.html";
    const targetHtml = written.get(target);
    if (targetHtml === undefined && !existsSync(path.join(OUT, target))) { errors.push(`${where}: broken link ${ref} (looked for ${target})`); continue; }
    if (hash && targetHtml !== undefined && !idsOf(targetHtml).includes(hash)) errors.push(`${where}: link to missing anchor ${ref}`);
  }
}

/* the same pages exist in both languages */
for (const def of pages) for (const lang of config.languages) if (!written.has(`${lang}/${def.path}index.html`)) errors.push(`missing ${lang}/${def.path}`);

/* the hotel is never spoken for in the first person (English check; Thai is reviewed by eye) */
for (const [rel, h] of written) {
  if (!rel.startsWith("en/")) continue;
  const hit = textOf(h).match(/\b(we|our|ours|us)\b[^.]{0,40}/gi);
  if (hit) warnings.push(`${rel}: first person wording: ${[...new Set(hit)].slice(0, 3).join(" | ")}`);
}

/* length guidance for the day the site is indexed (titles 50 to 60 with the brand, descriptions 140 to 160) */
for (const r of report) {
  const full = `${r.title} | ${ui.titleSuffix[r.lang]}`;
  if (r.lang === "en" && (full.length < 45 || full.length > 62)) warnings.push(`${r.path}: production title is ${full.length} characters: ${full}`);
  if (r.lang === "en" && (r.description.length < 135 || r.description.length > 165)) warnings.push(`${r.path}: description is ${r.description.length} characters`);
}

/* sizes */
const gz = async (f) => zlib.gzipSync(await readFile(f)).length;
const cssGz = await gz(path.join(OUT, "assets/css/site.css")), jsGz = await gz(path.join(OUT, "assets/js/site.js"));
const mediaDir = path.join(OUT, "media");
let mediaCount = 0, mediaBytes = 0, mediaMax = 0;
if (existsSync(mediaDir)) for (const f of await readdir(mediaDir)) { const s = (await stat(path.join(mediaDir, f))).size; mediaCount++; mediaBytes += s; mediaMax = Math.max(mediaMax, s); }
if (!mediaCount) errors.push("docs/media is empty: run node tools/images.mjs first");
if (mediaMax > 200 * 1024) errors.push(`an image in docs/media is over 200 KB (${Math.round(mediaMax / 1024)} KB)`);
/* budgets from the October 2026 audit: the shared stylesheet and script each under 25 KB compressed */
if (cssGz > 25 * 1024) errors.push(`CSS is ${(cssGz / 1024).toFixed(1)} KB compressed (budget 25)`);
if (jsGz > 25 * 1024) errors.push(`JavaScript is ${(jsGz / 1024).toFixed(1)} KB compressed (budget 25)`);

await mkdir(path.join(ROOT, "_private"), { recursive: true });
await writeFile(path.join(ROOT, "_private/build-report.json"), JSON.stringify({ built: new Date().toISOString(), mode: config.mode, basePath: config.basePath, stamp, pages: report, cssGzip: cssGz, jsGzip: jsGz, media: { files: mediaCount, bytes: mediaBytes, largest: mediaMax }, warnings, errors }, null, 1), "utf8");

/* the open questions for the hotel, written from the same list that prints the notes on the pages */
if (notes) {
  const name = (v) => (v.subject === "hotel" ? "Hotel" : suites[v.subject].name.en);
  const esc = (t) => String(t).split("|").join("/");
  const order = { conflicting: 0, unknown: 1, published: 2, confirmed: 3 };
  const rows = verification.map((v) => ({ sources: [], reviewer: null, nextReview: null, ...v, ...notes[v.id] })).sort((a, b) => order[a.status] - order[b.status]);
  const counts = rows.reduce((o, v) => { o[v.status] = (o[v.status] || 0) + 1; return o; }, {});
  const md = [
    "# Verification queue",
    "",
    "Generated by `node tools/build.mjs` from `src/data/verification.mjs` (the list, and the notes shown on the site) and `_private/verification-notes.json` (what the sources say, the question, the owner). Do not edit this file: edit those two.",
    "Private working record for O2 Design Studio. Nothing here has been confirmed by the hotel.",
    "",
    `${rows.length} items: ${counts.conflicting || 0} where two sources disagree, ${counts.unknown || 0} unpublished, ${counts.published || 0} published once and unconfirmed, ${counts.confirmed || 0} confirmed.`,
    "",
    "A note marked \"shown on site\" is printed beside the fact it qualifies, on the suite page, in the suite selector and in the comparison, in English and Thai. It leaves every page when the item is marked confirmed.",
    "",
    "| Status | Subject | Fact | What the sources say | Question for the hotel | Shown on site | Checked | Owner | Reviewer | Next review |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((v) => `| ${v.status} | ${name(v)} | ${v.field} | ${esc(v.detail)} | ${esc(v.question)} | ${v.flag ? esc(v.flag.en) : ""} | ${v.checked} | ${esc(v.owner)} | ${v.reviewer || ""} | ${v.nextReview || ""} |`),
    "",
    "Sources",
    "",
    ...rows.filter((v) => v.sources.length).map((v) => `- ${v.id}: ${v.sources.join("; ")}`),
    "",
  ].join(String.fromCharCode(10));
  await mkdir(path.join(ROOT, "_private/handover"), { recursive: true });
  await writeFile(path.join(ROOT, "_private/handover/verification-queue.md"), md, "utf8");
}

console.log(`${config.mode} build: ${report.length} pages (${pages.length} per language), plus 404 and the root page`);
console.log(`CSS ${(cssGz / 1024).toFixed(1)} KB gzip, JS ${(jsGz / 1024).toFixed(1)} KB gzip, largest page ${(Math.max(...report.map((r) => r.gzip)) / 1024).toFixed(1)} KB gzip`);
console.log(`media: ${mediaCount} files, ${(mediaBytes / 1048576).toFixed(1)} MB, largest ${Math.round(mediaMax / 1024)} KB`);
if (warnings.length) { console.log(`\n${warnings.length} note(s):`); warnings.forEach((w) => console.log("  - " + w)); }
if (errors.length) { console.error(`\n${errors.length} check(s) failed:`); errors.forEach((e) => console.error("  x " + e)); process.exit(1); }
console.log("\nAll build checks passed.");
