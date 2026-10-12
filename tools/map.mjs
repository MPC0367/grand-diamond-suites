/* Draws the site's street map of central Bangkok, in the site's own palette, from OpenStreetMap data.

   The map is a small pyramid of square pictures ("tiles"), so that a visitor can move it and zoom it:

     level 0   all of central Bangkok in 640 logical pixels      (about 17 m to a pixel)
     level 3   the same area in 5120                             (about 2 m: where the map opens, on the hotel)
     level 5   the middle of it in 20480                         (about half a metre)

   Each level is drawn for its own scale: which roads appear, how wide they are, which names are written.
   The drawing and the names are separate pictures. The drawing is shared by both languages; the names are
   drawn once in English and once in Thai on a clear background, and are also laid over the satellite images.

   What it does, end to end:
     1. reads the saved extracts in _private/map (tools/map-data.mjs fetches them once);
     2. projects everything with spherical Web Mercator into the frame in tools/map-frame.mjs;
     3. for every level, builds SVG in blocks of 4 x 4 tiles and renders it in a real browser, the names
        with the site's own web fonts, at twice the size for sharp screens;
     4. cuts the blocks into tiles and writes them to docs/map, the published folder (the build leaves
        that folder alone, as it does the photographs in docs/media);
     5. writes the picture the page shows before its script runs (the neighbourhood, with names), a small
        picture of the whole area that sits under the tiles while they load, and the record the site uses
        to place its markers and to know which tiles exist.

   Nothing is invented: every line, area and name is a mapped OpenStreetMap feature. Names come from the
   features' own tags (name:en for English, name:th or name for Thai).

   Usage: node tools/map.mjs [--levels=0,1,2] [--only=base|names]
   Map data: OpenStreetMap contributors, Open Database License. */
import { readFile, writeFile, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { chromium } from "playwright";
import { NEAR, FRAME, DETAIL, OPEN, TILE, LEVELS, levelSize, toFrame, GROUND } from "./map-frame.mjs";
import { places as PLACES } from "../src/data/places.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const at = (...p) => path.join(ROOT, ...p);
const arg = (name) => { const hit = process.argv.find((a) => a.startsWith("--" + name + "=")); return hit ? hit.slice(name.length + 3) : null; };
const ONLY_LEVELS = arg("levels") ? arg("levels").split(",").map(Number) : null;
const ONLY = arg("only");
const HOTEL = { lat: 13.7504126, lon: 100.5385094 };

/* === Look ================================================================= */
const C = {
  ground: "#F5F2EC", building: "#ECE7DD", park: "#E3E6D8", water: "#D5DEE0",
  road: "#FFFFFF", casing: "#DDD7CC", hair: "#E6E0D5", far: "#D3CCBE", ink: "#202B32", label: "#5A6265",
  waterInk: "#5E7C87", parkInk: "#66734F",
};
/* road widths in logical px, by level. A class that is absent from a level is not drawn there. */
const MAJOR = ["motorway", "trunk", "primary", "secondary", "tertiary"];
const MINOR = ["residential", "unclassified", "living_street", "pedestrian"];
const widths = (m, p, s, t, r, v) => ({ motorway: m, trunk: m, primary: p, secondary: s, tertiary: t, residential: r, unclassified: r, living_street: r, pedestrian: r, service: v });
const ROADS = [
  widths(1.7, 1.4, 0.9, 0, 0, 0),
  widths(2.4, 2.1, 1.5, 0.9, 0, 0),
  widths(3.6, 3.2, 2.5, 1.7, 0.8, 0),
  widths(5.8, 5.8, 4.5, 3.2, 1.9, 1.0),
  widths(10, 10, 7.8, 5.6, 3.3, 1.7),
  widths(17, 17, 13.5, 9.6, 5.8, 3.0),
];
const CASING = [0, 0, 0.5, 0.65, 0.8, 1.0];          /* each side of a major road */
const LINK_SCALE = 0.62;                             /* slip roads and ramps are narrower than the road they serve */
const DRAW_ORDER = ["service", "pedestrian", "living_street", "unclassified", "residential", "tertiary", "secondary", "primary", "trunk", "motorway"];
const RAIL_W = [1.0, 1.2, 1.5, 1.6, 2.3, 3.2];
const WATERLINE = { river: 4.4, canal: 2.2, stream: 1.1, drain: 1.1, ditch: 1.1 };   /* at level 3; scaled with the level */
const BUILDINGS_FROM = 3;
const STATION_R = [0, 0, 1.7, 2.3, 3.2, 4.2];

/* Type sizes in logical px, by level; 0 = that kind of name is not written at that level. A level is shown at
   between half and the whole of its own size, so these are about twice the smallest size a name is read at. */
const TYPE = {
  place: [13, 14, 15, 16, 0, 0],
  roadA: [0, 12, 13, 14, 14.5, 15],                  /* motorway, trunk, primary */
  roadB: [0, 0, 12, 13, 14, 14.5],                   /* secondary, tertiary */
  roadC: [0, 0, 0, 11.5, 12.5, 13],                  /* streets and lanes */
  water: [12, 13, 13.5, 14, 14.5, 15],
  park: [0, 0, 12, 12.5, 13.5, 14],
  station: [0, 0, 0, 12.5, 13.5, 14],
};
const FONT = {
  en: { family: '"Manrope", sans-serif', plus: 0, spacing: 0.06, upper: true, cap: "H", line: 1.25 },
  th: { family: '"Manrope", "Noto Sans Thai", sans-serif', plus: 1, spacing: 0, upper: false, cap: "ก", line: 1.6 },
};
const HALO = 2.4;                                    /* px of ground colour around each glyph */
const SPACING = { roadA: 430, roadB: 400, roadC: 340, water: 520 };   /* logical px between two writings of one name */

/* === Geometry helpers ===================================================== */
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lengthOf = (line) => { let s = 0; for (let i = 1; i < line.length; i++) s += dist(line[i - 1], line[i]); return s; };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const bboxOf = (pts) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return [x0, y0, x1, y1]; };
const hits = (bb, r) => bb[2] >= r[0] && bb[0] <= r[2] && bb[3] >= r[1] && bb[1] <= r[3];
function pointAt(line, s) {
  for (let i = 1; i < line.length; i++) {
    const d = dist(line[i - 1], line[i]);
    if (s <= d || i === line.length - 1) return lerp(line[i - 1], line[i], d ? Math.min(1, Math.max(0, s / d)) : 0);
    s -= d;
  }
  return line[0];
}
function nearestOnSeg(p, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1], len2 = vx * vx + vy * vy;
  const t = len2 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / len2)) : 0;
  return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vy * t);
}
/* Douglas-Peucker: drops points that move the line by less than `tolerance` */
function simplify(line, tolerance) {
  if (line.length < 3) return line;
  const keep = new Uint8Array(line.length); keep[0] = keep[line.length - 1] = 1;
  const stack = [[0, line.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    let worst = 0, at = -1;
    for (let k = i + 1; k < j; k++) { const d = nearestOnSeg(line[k], line[i], line[j]); if (d > worst) { worst = d; at = k; } }
    if (worst > tolerance) { keep[at] = 1; stack.push([i, at], [at, j]); }
  }
  return line.filter((_, i) => keep[i]);
}
/* the parts of a polyline that lie inside a rectangle [x0, y0, x1, y1] */
function clipLine(line, [x0, y0, x1, y1]) {
  const out = []; let cur = null;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b[0] - a[0], dy = b[1] - a[1];
    let t0 = 0, t1 = 1, ok = true;
    for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
      if (p === 0) { if (q < 0) ok = false; } else { const r = q / p; if (p < 0) { if (r > t1) ok = false; else if (r > t0) t0 = r; } else { if (r < t0) ok = false; else if (r < t1) t1 = r; } }
    }
    if (!ok) { cur = null; continue; }
    const p0 = lerp(a, b, t0), p1 = lerp(a, b, t1);
    if (cur && t0 === 0) cur.push(p1); else { cur = [p0, p1]; out.push(cur); }
    if (t1 < 1) cur = null;
  }
  return out;
}
/* Joins pieces end to end into longer lines. Each piece is { pts, a, b }, where a and b name its two ends.
   Where several pieces meet, the straightest continuation is taken; `maxTurn` (degrees) stops a line from
   doubling back along the other carriageway. */
function stitch(pieces, maxTurn = 180) {
  const pool = new Set(pieces), ends = new Map();
  const add = (k, l) => { if (!ends.has(k)) ends.set(k, new Set()); ends.get(k).add(l); };
  for (const l of pieces) { add(l.a, l); add(l.b, l); }
  const take = (l) => { pool.delete(l); ends.get(l.a).delete(l); ends.get(l.b).delete(l); };
  const turnAt = (prev, here, next) => {
    const a1 = Math.atan2(here[1] - prev[1], here[0] - prev[0]), a2 = Math.atan2(next[1] - here[1], next[0] - here[0]);
    let d = Math.abs(a2 - a1) * 180 / Math.PI; if (d > 180) d = 360 - d; return d;
  };
  const out = [];
  while (pool.size) {
    const first = pool.values().next().value; take(first);
    let pts = first.pts.slice(), head = first.a, tail = first.b;
    for (const side of ["tail", "head"]) {
      for (;;) {
        if (head === tail && pts.length > 2) break;
        const k = side === "tail" ? tail : head;
        const here = side === "tail" ? pts.at(-1) : pts[0], prev = side === "tail" ? pts.at(-2) : pts[1];
        let best = null;
        for (const o of ends.get(k) || []) {
          const oPts = o.a === k ? o.pts : o.pts.slice().reverse();
          const turn = turnAt(prev, here, oPts[1]);
          if (!best || turn < best.turn) best = { o, oPts, turn };
        }
        if (!best || best.turn > maxTurn) break;
        take(best.o);
        const far = best.o.a === k ? best.o.b : best.o.a;
        if (side === "tail") { pts = pts.concat(best.oPts.slice(1)); tail = far; }
        else { pts = best.oPts.slice(1).reverse().concat(pts); head = far; }
      }
    }
    out.push(pts);
  }
  return out;
}
const signedArea = (ring) => { let s = 0; for (let i = 1; i < ring.length; i++) s += ring[i - 1][0] * ring[i][1] - ring[i][0] * ring[i - 1][1]; return s / 2; };
const sameWay = (ring) => (signedArea(ring) < 0 ? ring.slice().reverse() : ring);
const centroid = (ring) => { let x = 0, y = 0; for (const p of ring) { x += p[0]; y += p[1]; } return [x / ring.length, y / ring.length]; };

/* === SVG helpers ========================================================== */
const n2 = (n) => String(Math.round(n * 100) / 100);
const dLine = (line) => "M" + line.map((p) => n2(p[0]) + " " + n2(p[1])).join("L");
const dRing = (ring) => dLine(ring) + "Z";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ROUND = 'stroke-linecap="round" stroke-linejoin="round"';
const stroke = (lines, colour, width, extra = "") => (lines.length ? `<path fill="none" stroke="${colour}" stroke-width="${n2(width)}" ${extra} d="${lines.map(dLine).join("")}"/>` : "");

/* === Read the extracts ==================================================== */
const read = async (name) => JSON.parse(await readFile(at("_private/map/parts", name), "utf8"));
/* the extracts were fetched in parts that overlap a little: each mapped thing is kept once */
const join = async (names) => {
  const seen = new Set(), elements = [];
  for (const name of names) {
    let part;
    try { part = await read(name + ".json"); } catch { if (!ONLY_LEVELS) throw new Error(`${name}.json is not in _private/map/parts: run node tools/map-data.mjs first`); console.warn(`${name}: not fetched yet, left out of this trial`); continue; }
    for (const e of part.elements) { const id = e.type + e.id; if (!seen.has(id)) { seen.add(id); elements.push(e); } }
  }
  return { elements };
};
const QUARTERS = ["nw", "ne", "sw", "se"];
/* "areas" first: an earlier fetch left cut-off copies of the same relations in "water" and "green" */
const wide = await join(["areas", "roads", "rail", "water", "green", "places", ...QUARTERS.map((q) => "streets-" + q)]), bld = await join(QUARTERS.map((q) => "buildings-" + q));
const meta = await read("roads.meta.json").catch(() => ({}));
const F = (g) => toFrame(g.lon, g.lat);
const key = (g) => g.lat + "," + g.lon;
const ways = wide.elements.filter((e) => e.type === "way" && e.geometry);
const relations = wide.elements.filter((e) => e.type === "relation");
const nodes = wide.elements.filter((e) => e.type === "node");
const isClosed = (g) => g.length > 3 && g[0].lat === g.at(-1).lat && g[0].lon === g.at(-1).lon;
const hasThai = (s) => /[฀-๿]/.test(s || "");
const nameOf = (t, lang) => (lang === "en" ? t["name:en"] || (t.name && !hasThai(t.name) ? t.name : "") : t["name:th"] || (hasThai(t.name) ? t.name : "")) || "";

/* areas: closed ways are plain rings; multipolygons keep their holes */
function areas(source, wayTest, relTest) {
  const out = [];
  for (const w of source.filter((e) => e.type === "way" && e.geometry)) {
    if (!wayTest(w.tags || {}) || !isClosed(w.geometry)) continue;
    const ring = sameWay(w.geometry.map(F));
    out.push({ rings: [ring], holed: false, bb: bboxOf(ring), tags: w.tags || {} });
  }
  for (const r of source.filter((e) => e.type === "relation")) {
    if (!relTest(r.tags || {}) || !r.members) continue;
    const ring = (role) => stitch(r.members.filter((m) => m.type === "way" && m.geometry && (m.role || "outer") === role)
      .filter((m) => m.geometry.every(Boolean)).map((m) => ({ pts: m.geometry.map(F), a: key(m.geometry[0]), b: key(m.geometry.at(-1)) }))).filter((x) => x.length > 3);
    const outer = ring("outer"), inner = ring("inner");
    if (!outer.length) continue;
    out.push({ rings: inner.length ? outer.concat(inner) : outer.map(sameWay), holed: inner.length > 0, bb: bboxOf(outer.flat()), tags: r.tags || {} });
  }
  return out;
}
const isPark = (t) => t.leisure === "park" || t.landuse === "grass";
const isWater = (t) => t.natural === "water" || t.waterway === "riverbank";
const parks = areas(wide.elements, isPark, (t) => isPark(t));
const water = areas(wide.elements, isWater, (t) => isWater(t));
const buildings = areas(bld.elements, () => true, () => true);
const plazas = areas(wide.elements, (t) => t.highway === "pedestrian" && t.area === "yes", () => false);

const waterLines = [];
for (const w of ways) {
  const t = w.tags || {}, width = WATERLINE[t.waterway];
  if (!width || t.tunnel) continue;
  const pts = w.geometry.map(F);
  waterLines.push({ w: width, kind: t.waterway, pts, bb: bboxOf(pts), tags: t, a: key(w.geometry[0]), b: key(w.geometry.at(-1)) });
}

const roads = [];
for (const w of ways) {
  const t = w.tags || {};
  if (!t.highway || t.area === "yes") continue;
  const link = t.highway.endsWith("_link"), base = link ? t.highway.slice(0, -5) : t.highway;
  if (!MAJOR.includes(base) && !MINOR.includes(base) && base !== "service") continue;
  if (t.tunnel === "yes") continue;                                              /* underground: not part of the street picture */
  if ((base === "service" || base === "pedestrian") && (t.tunnel || t.bridge)) continue;   /* car-park ramps and footbridges */
  if (base === "service" && (/^(parking_aisle|driveway|drive-through|emergency_access)$/.test(t.service || "") || /^(private|no)$/.test(t.access || ""))) continue;
  const pts = w.geometry.map(F);
  roads.push({ base, link, pts, bb: bboxOf(pts), tags: t, a: key(w.geometry[0]), b: key(w.geometry.at(-1)) });
}

/* railways: which line a track belongs to comes from its route relation, then its own tags */
const routeOfWay = new Map();
for (const e of wide.elements) if (e.type === "relation" && e.tags?.type === "route") for (const m of e.members || []) if (m.type === "way") routeOfWay.set(m.ref, e.tags);
function railKind(w) {
  const t = w.tags, r = routeOfWay.get(w.id) || {};
  const text = [t.network, t.name, t["name:en"], t.operator, r.network, r.name, r["name:en"], r.operator].filter(Boolean).join(" | ");
  if (/\bARL\b|Airport Rail Link/i.test(text)) return "arl";
  if (/\bBTS\b|บีทีเอส/.test(text)) return "bts";
  if (/\bMRT\b|Blue Line|Purple Line|มหานคร/.test(text) || t.railway === "subway") return "mrt";
  return t.railway === "rail" ? "rail" : "bts";
}
const railsAll = [];
for (const w of ways) {
  const t = w.tags || {};
  if (!/^(rail|light_rail|subway|monorail)$/.test(t.railway || "")) continue;
  if (t.service) continue;                              /* sidings, yards, spurs and crossovers are left out */
  const kind = railKind(w), under = t.tunnel === "yes" || Number(t.layer) < 0;
  if (under && kind === "rail") continue;
  const pts = w.geometry.map(F);
  railsAll.push({ kind, under, pts, bb: bboxOf(pts) });
}
/* A line is mapped as its two tracks, a few metres apart. One is drawn: taking the longest pieces first, a
   piece is left out when nearly all of it runs within nine metres of a piece of the same line already kept.
   Nothing is moved: the line drawn is a mapped track. */
const rails = [];
{
  const CELL = 12 / GROUND, seen = new Map();                 /* cells of twelve metres, in frame fractions */
  const cellsNear = (p) => { const x = Math.floor(p[0] / CELL), y = Math.floor(p[1] / CELL), out = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) out.push((x + i) + ":" + (y + j)); return out; };
  const sample = (pts) => { const out = []; for (let i = 1; i < pts.length; i++) { const n = Math.max(1, Math.ceil((dist(pts[i - 1], pts[i]) * GROUND) / 6)); for (let q = 0; q < n; q++) out.push(lerp(pts[i - 1], pts[i], q / n)); } out.push(pts.at(-1)); return out; };
  for (const r of railsAll.slice().sort((a, b) => lengthOf(b.pts) - lengthOf(a.pts))) {
    const dots = sample(r.pts), id = r.kind + (r.under ? "u" : "");
    const close = dots.filter((p) => cellsNear(p).some((c) => (seen.get(id + c) || []).some((o) => dist(o, p) * GROUND < 9))).length;
    if (close / dots.length > 0.8) continue;
    rails.push(r);
    for (const p of dots) { const c = id + Math.floor(p[0] / CELL) + ":" + Math.floor(p[1] / CELL); if (!seen.has(c)) seen.set(c, []); seen.get(c).push(p); }
  }
}

/* stations: one dot for each mapped station, one name for each group of stations that share a name */
/* railway stations only: the same tag is also used for piers and bus terminals */
const onRails = (t) => t.railway === "station" || (t.public_transport === "station" && (t.subway === "yes" || t.train === "yes" || t.light_rail === "yes" || t.monorail === "yes" || /subway|light_rail|train|monorail/.test(t.station || "")));
const stationNodes = nodes.filter((n) => n.tags && onRails(n.tags)).filter((n) => n.tags["name:en"] || n.tags.name);
const metres = (a, b) => Math.hypot((a[0] - b[0]) * GROUND, (a[1] - b[1]) * GROUND);   /* frame fractions -> metres (x and y share one scale) */
const stations = [];
for (const n of stationNodes) {
  const p = F(n);
  if (p[0] < -0.02 || p[0] > 1.02 || p[1] < -0.02 || p[1] > 1.02) continue;
  if (stations.some((s) => metres(s.p, p) < 25)) continue;
  stations.push({ p, tags: n.tags });
}
const ownPlaces = PLACES.map((pl) => ({ id: pl.id, kind: pl.kind, p: toFrame(pl.lon, pl.lat) }));
const hotelAt = toFrame(HOTEL.lon, HOTEL.lat);

/* place names: the districts (mapped as suburbs) and their subdistricts (mapped as quarters). The many small
   community names mapped as neighbourhoods are left out. */
const placeNodes = nodes.filter((n) => /^(suburb|quarter)$/.test(n.tags?.place || "")).map((n) => ({ p: F(n), tags: n.tags })).filter((n) => n.p[0] > 0 && n.p[0] < 1 && n.p[1] > 0 && n.p[1] < 1);

/* === One level ============================================================ */
function levelOf(k) {
  const L = LEVELS[k], { w: W, h: H } = levelSize(k);
  const S = (p) => [p[0] * W, p[1] * H];
  const rect = [L.c0 * TILE, L.r0 * TILE, (L.c0 + L.cols) * TILE, (L.r0 + L.rows) * TILE];
  const reach = [rect[0] - 60, rect[1] - 60, rect[2] + 60, rect[3] + 60];
  const fr = [reach[0] / W, reach[1] / H, reach[2] / W, reach[3] / H];          /* the same, in frame fractions */
  const tol = 0.22;
  const scale = 2 ** (k - 3);
  const line = (f) => ({ pts: simplify(f.pts.map(S), tol), bb: [f.bb[0] * W, f.bb[1] * H, f.bb[2] * W, f.bb[3] * H] });
  const area = (f) => ({ rings: f.rings.map((r) => simplify(r.map(S), tol)).filter((r) => r.length > 2), holed: f.holed, bb: [f.bb[0] * W, f.bb[1] * H, f.bb[2] * W, f.bb[3] * H] });
  const big = (f, min) => (f.bb[2] - f.bb[0]) * W >= min || (f.bb[3] - f.bb[1]) * H >= min;
  const inReach = (f) => hits(f.bb, fr);
  const widthOf = (r) => { const w = ROADS[k][r.base] || 0; return r.link ? w * LINK_SCALE : w; };

  const lv = { k, W, H, rect, L };
  lv.parks = parks.filter((f) => inReach(f) && big(f, 2)).map(area);
  lv.water = water.filter((f) => inReach(f) && big(f, 1.5)).map(area);
  lv.waterLines = waterLines.filter((f) => inReach(f) && WATERLINE[f.kind] * scale >= 0.5).map((f) => ({ ...line(f), w: Math.max(0.6, f.w * scale) }));
  lv.plazas = k >= 3 ? plazas.filter(inReach).map(area) : [];
  lv.buildings = [];
  if (k >= BUILDINGS_FROM) {
    /* at level 3 the buildings fade out towards the edge of the area they were fetched for, so that no line shows */
    const D = [toFrame(DETAIL.west, DETAIL.north), toFrame(DETAIL.east, DETAIL.south)], ramp = 0.022;
    for (const f of buildings) {
      if (!inReach(f) || !big(f, 1.2)) continue;
      const c = [(f.bb[0] + f.bb[2]) / 2, (f.bb[1] + f.bb[3]) / 2];
      const edge = Math.min(c[0] - D[0][0], D[1][0] - c[0], c[1] - D[0][1], D[1][1] - c[1]);
      const band = k > 3 ? 3 : Math.max(0, Math.min(3, Math.floor((edge / ramp) * 4)));
      lv.buildings.push({ ...area(f), band });
    }
  }
  lv.roads = roads.filter((r) => inReach(r) && widthOf(r) > 0).map((r) => ({ ...line(r), base: r.base, link: r.link, w: widthOf(r) }));
  lv.rails = rails.filter(inReach).map((r) => ({ ...line(r), kind: r.kind, under: r.under }));
  lv.stations = STATION_R[k] ? stations.filter((s) => s.p[0] >= fr[0] && s.p[0] <= fr[2] && s.p[1] >= fr[1] && s.p[1] <= fr[3]).map((s) => ({ p: S(s.p), tags: s.tags })) : [];
  return lv;
}

/* the drawing (no names) for one rectangle of a level */
function drawBase(lv, r) {
  const k = lv.k, pad = 26, clip = [r[0] - pad, r[1] - pad, r[2] + pad, r[3] + pad];
  const here = (list) => list.filter((f) => hits(f.bb, clip));
  const cut = (list) => here(list).flatMap((f) => clipLine(f.pts, clip));
  const fill = (list, colour, extra = "") => {
    const simple = [], holed = [];
    for (const f of here(list)) (f.holed ? holed : simple).push(f.rings);
    return (simple.length ? `<path fill="${colour}" ${extra} d="${simple.flat().map(dRing).join("")}"/>` : "") + holed.map((rings) => `<path fill="${colour}" ${extra} fill-rule="evenodd" d="${rings.map(dRing).join("")}"/>`).join("");
  };
  const out = [`<rect x="${r[0]}" y="${r[1]}" width="${r[2] - r[0]}" height="${r[3] - r[1]}" fill="${C.ground}"/>`, fill(lv.parks, C.park), fill(lv.water, C.water)];
  const wl = {};
  for (const f of here(lv.waterLines)) (wl[n2(f.w)] ||= []).push(...clipLine(f.pts, clip));
  for (const [w, lines] of Object.entries(wl)) out.push(stroke(lines, C.water, +w, ROUND));
  for (let band = 0; band <= 3; band++) out.push(fill(lv.buildings.filter((b) => b.band === band), C.building, band < 3 ? `fill-opacity="${[0.2, 0.45, 0.72][band]}"` : ""));
  out.push(fill(lv.plazas, C.road, 'fill-opacity="0.55"'));
  /* roads: by class and width. Far out they are plain lines in a darker tone; closer in, white with an edge. */
  const groups = new Map();
  for (const f of here(lv.roads)) { const id = f.base + (f.link ? "_link" : ""); if (!groups.has(id)) groups.set(id, { base: f.base, link: f.link, w: f.w, lines: [] }); groups.get(id).lines.push(...clipLine(f.pts, clip)); }
  const order = [...groups.values()].sort((a, b) => DRAW_ORDER.indexOf(a.base) * 2 + (a.link ? 0 : 1) - (DRAW_ORDER.indexOf(b.base) * 2 + (b.link ? 0 : 1)));
  const major = order.filter((g) => MAJOR.includes(g.base)), minor = order.filter((g) => !MAJOR.includes(g.base));
  if (k <= 1) {
    for (const g of major) out.push(stroke(g.lines, C.far, g.w, ROUND));
  } else {
    if (k >= 3) for (const g of minor) out.push(stroke(g.lines, C.hair, g.w + 1.1, ROUND));
    for (const g of major) out.push(stroke(g.lines, C.casing, g.w + CASING[k] * 2, ROUND));
    for (const g of minor) out.push(stroke(g.lines, k === 2 ? C.hair : C.road, g.w, ROUND));
    for (const g of major) out.push(stroke(g.lines, C.road, g.w, ROUND));
  }
  /* railways. State railway: a thin, lighter line (with small ticks from level 3). Airport Rail Link: dashed
     ink. BTS and the raised parts of the MRT: solid ink. The MRT underground: dotted, lighter. */
  const w = RAIL_W[k], f = w / 1.6;
  const rail = (kind, under) => lv.rails.filter((x) => x.kind === kind && x.under === under && hits(x.bb, clip)).flatMap((x) => clipLine(x.pts, clip));
  out.push(stroke(rail("rail", false), C.ink, w * 0.7, 'stroke-opacity="0.5" stroke-linejoin="round"'));
  if (k >= 3) out.push(stroke(rail("rail", false), C.ink, w * 3.2, `stroke-opacity="0.5" stroke-dasharray="${n2(0.8 * f)} ${n2(6.4 * f)}"`));
  for (const kind of ["mrt", "bts", "arl"]) out.push(stroke(rail(kind, true), C.ink, w * 0.85, `stroke-opacity="0.5" stroke-dasharray="${n2(0.1)} ${n2(w * 2.4)}" stroke-linecap="round"`));
  out.push(stroke(rail("arl", false), C.ink, w, `stroke-dasharray="${n2(6.2 * f)} ${n2(3.4 * f)}" stroke-linejoin="round"`));
  out.push(stroke(rail("mrt", false), C.ink, w, ROUND));
  out.push(stroke(rail("bts", false), C.ink, w, ROUND));
  const sr = STATION_R[k];
  if (sr) out.push(lv.stations.filter((s) => s.p[0] > clip[0] && s.p[0] < clip[2] && s.p[1] > clip[1] && s.p[1] < clip[3]).map((s) => `<circle cx="${n2(s.p[0])}" cy="${n2(s.p[1])}" r="${sr}" fill="${C.road}" stroke="${C.ink}" stroke-width="${n2(Math.max(0.9, sr * 0.42))}"/>`).join(""));
  return out.join("\n");
}

/* === Names ================================================================
   What is written at a level, in order of precedence: stations, places, the main roads, water, parks,
   other roads, streets. A name is written along its line where the line is straight enough, upright and
   never upside down, and never over a name already written or over one of the site's own markers. */
function candidates(lv, lang) {
  const k = lv.k, { W, H } = lv, font = FONT[lang], S = (p) => [p[0] * W, p[1] * H];
  const size = (kind) => (TYPE[kind][k] ? TYPE[kind][k] + font.plus : 0);
  const text = (s) => (font.upper ? s.toUpperCase() : s);
  const reach = [lv.rect[0] - 40, lv.rect[1] - 40, lv.rect[2] + 40, lv.rect[3] + 40], fr = [reach[0] / W, reach[1] / H, reach[2] / W, reach[3] / H];
  const out = [];
  /* stations: not the ones that have a marker of the site's own, which names them itself */
  if (size("station")) {
    const seen = [];
    for (const s of stations) {
      const name = nameOf(s.tags, lang);
      if (!name || s.p[0] < fr[0] || s.p[0] > fr[2] || s.p[1] < fr[1] || s.p[1] > fr[3]) continue;
      if (ownPlaces.some((o) => o.kind === "transport" && metres(o.p, s.p) < 160)) continue;
      if (seen.some((o) => o.name === name && metres(o.p, s.p) < 450)) continue;
      seen.push({ name, p: s.p });
      out.push({ kind: "station", pri: 0, text: name, size: size("station"), weight: 700, spacing: 0, fill: C.ink, point: S(s.p), off: STATION_R[k] + 3.5 });
    }
  }
  if (size("place")) {
    const rank = { suburb: 0, quarter: 1 }, allow = k <= 1 ? 0 : 1;
    for (const n of placeNodes.slice().sort((a, b) => rank[a.tags.place] - rank[b.tags.place])) {
      const name = nameOf(n.tags, lang);
      if (!name || rank[n.tags.place] > allow) continue;
      if (out.some((o) => o.kind === "place" && o.text === text(name) && Math.hypot(o.point[0] - S(n.p)[0], o.point[1] - S(n.p)[1]) < 700)) continue;   /* a district and its subdistrict often share a name: once is enough */
      out.push({ kind: "place", pri: 1 + rank[n.tags.place] * 0.1, text: text(name), size: size("place") - rank[n.tags.place] * 0.8, weight: 700, spacing: lang === "en" ? 0.14 : 0, fill: C.ink, opacity: 0.6, point: S(n.p), centred: true });
    }
  }
  /* roads, joined into whole lines by name */
  const byName = new Map();
  for (const r of roads) {
    if (!hits(r.bb, fr)) continue;
    const tier = ["motorway", "trunk", "primary"].includes(r.base) ? "roadA" : ["secondary", "tertiary"].includes(r.base) ? "roadB" : "roadC";
    if (r.link || !size(tier) || (r.base === "service" && k < 5)) continue;
    const name = nameOf(r.tags, lang);
    if (!name) continue;
    const id = tier + "|" + name;
    if (!byName.has(id)) byName.set(id, { tier, name, pieces: [] });
    byName.get(id).pieces.push({ pts: r.pts.map(S), a: r.a, b: r.b });
  }
  for (const g of byName.values()) out.push({ kind: g.tier, pri: g.tier === "roadA" ? 2 : g.tier === "roadB" ? 5 : 6, text: text(g.name), size: size(g.tier), weight: 600, spacing: font.spacing, fill: C.label, lines: stitch(g.pieces, 55).map((l) => simplify(l, 0.6)), every: SPACING[g.tier], tight: g.tier === "roadC" && k === 3 });
  /* rivers and canals */
  const wn = new Map();
  for (const f of waterLines) {
    if (!hits(f.bb, fr) || (f.kind !== "river" && k < 3) || !/^(river|canal)$/.test(f.kind)) continue;
    let name = nameOf(f.tags, lang);
    if (!name) continue;
    if (lang === "en") name = name.replace(/^Khlong (.+)$/, "$1 Canal");
    if (!wn.has(name)) wn.set(name, []);
    wn.get(name).push({ pts: f.pts.map(S), a: f.a, b: f.b });
  }
  for (const [name, pieces] of wn) out.push({ kind: "water", pri: 3, text: text(name), size: size("water"), weight: 600, spacing: font.spacing, fill: C.waterInk, lines: stitch(pieces, 70).map((l) => simplify(l, 0.8)), every: SPACING.water });
  if (size("park")) for (const f of parks) {
    const name = nameOf(f.tags, lang);
    if (!name || !hits(f.bb, fr)) continue;
    const bw = (f.bb[2] - f.bb[0]) * W, bh = (f.bb[3] - f.bb[1]) * H;
    out.push({ kind: "park", pri: 4, text: text(name), size: size("park"), weight: 600, spacing: font.spacing, fill: C.parkInk, point: S(centroid(f.rings[0])), centred: true, room: [bw, bh] });
  }
  return out.sort((a, b) => a.pri - b.pri);
}

function place(lv, lang, list, measured) {
  const font = FONT[lang], placed = [], grid = new Map(), CELL = 160;
  const cornersOf = (l, pad) => { const a = (l.angle * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), hw = l.w / 2 + pad, hh = l.h / 2 + pad; return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([u, v]) => [l.x + u * c - v * s, l.y + u * s + v * c]); };
  const overlap = (A, B) => [A, B].every((poly) => poly.every((p, i) => {
    const q = poly[(i + 1) % 4], nx = q[1] - p[1], ny = p[0] - q[0];
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const r of A) { const d = r[0] * nx + r[1] * ny; if (d < a0) a0 = d; if (d > a1) a1 = d; }
    for (const r of B) { const d = r[0] * nx + r[1] * ny; if (d < b0) b0 = d; if (d > b1) b1 = d; }
    return a1 >= b0 && b1 >= a0;
  }));
  const cells = (box) => { const bb = bboxOf(box), out = []; for (let x = Math.floor(bb[0] / CELL); x <= Math.floor(bb[2] / CELL); x++) for (let y = Math.floor(bb[1] / CELL); y <= Math.floor(bb[3] / CELL); y++) out.push(x + ":" + y); return out; };
  const free = (l) => { const box = cornersOf(l, HALO + 1.5); for (const c of cells(box)) for (const o of grid.get(c) || []) if (overlap(box, o.box)) return false; return true; };
  const keep = (l) => { l.box = cornersOf(l, HALO + 1.5); for (const c of cells(l.box)) { if (!grid.has(c)) grid.set(c, []); grid.get(c).push(l); } placed.push(l); };
  /* The hotel's point is kept clear, and so are the site's own markers at the levels where they show (zoomed
     out, the markers are put away and the district names take their place). */
  const S = (p) => [p[0] * lv.W, p[1] * lv.H];
  for (const o of lv.k >= 3 ? [...ownPlaces.map((x) => x.p), hotelAt] : [hotelAt]) { const p = S(o), r = lv.k >= 3 ? 15 : 9; const box = [[p[0] - r, p[1] - r], [p[0] + r, p[1] - r], [p[0] + r, p[1] + r], [p[0] - r, p[1] + r]]; for (const c of cells(box)) { if (!grid.has(c)) grid.set(c, []); grid.get(c).push({ box }); } }
  for (const s of lv.stations) { const r = STATION_R[lv.k] + 1.2, p = s.p, box = [[p[0] - r, p[1] - r], [p[0] + r, p[1] - r], [p[0] + r, p[1] + r], [p[0] - r, p[1] + r]]; for (const c of cells(box)) { if (!grid.has(c)) grid.set(c, []); grid.get(c).push({ box }); } }

  /* A name never sits on a raised railway line, which is drawn in ink. The lines are sampled every few
     pixels; a name that would lie along one is moved just clear of it, to the nearer side, and a spot that a
     line merely crosses is passed over. */
  const railDots = new Map(), RC = 64, railW = RAIL_W[lv.k];
  for (const r of lv.rails) {
    if (r.under) continue;
    for (let i = 1; i < r.pts.length; i++) {
      const n = Math.max(1, Math.ceil(dist(r.pts[i - 1], r.pts[i]) / 2.5));
      for (let q = 0; q <= n; q++) { const p = lerp(r.pts[i - 1], r.pts[i], q / n), c = Math.floor(p[0] / RC) + ":" + Math.floor(p[1] / RC); if (!railDots.has(c)) railDots.set(c, []); railDots.get(c).push(p); }
    }
  }
  /* rail points near a label, in the label's own axes: [along, across] */
  const railNear = (l, reach) => {
    const a = (l.angle * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), R = l.w / 2 + reach, out = [];
    for (let x = Math.floor((l.x - R) / RC); x <= Math.floor((l.x + R) / RC); x++) for (let y = Math.floor((l.y - R) / RC); y <= Math.floor((l.y + R) / RC); y++) for (const p of railDots.get(x + ":" + y) || []) {
      const dx = p[0] - l.x, dy = p[1] - l.y, along = dx * ux + dy * uy, across = -dx * uy + dy * ux;
      if (Math.abs(along) <= l.w / 2 + 2 && Math.abs(across) <= reach) out.push([along, across]);
    }
    return out;
  };
  const besideRails = (l) => {
    const reach = l.h / 2 + railW / 2 + HALO, near = railNear(l, reach);
    if (!near.length) return [l];
    let a0 = Infinity, a1 = -Infinity, lo = Infinity, hi = -Infinity;
    for (const [al, ac] of near) { if (al < a0) a0 = al; if (al > a1) a1 = al; if (ac < lo) lo = ac; if (ac > hi) hi = ac; }
    if (a1 - a0 < l.w * 0.5) return [];                                   /* a line crossing the spot: not here */
    const a = (l.angle * Math.PI) / 180, vx = -Math.sin(a), vy = Math.cos(a), m = l.h / 2 + railW / 2 + HALO * 0.7;
    return [hi + m, lo - m].sort((p, q) => Math.abs(p) - Math.abs(q)).map((by) => ({ ...l, x: l.x + vx * by, y: l.y + vy * by })).filter((o) => !railNear(o, o.h / 2 + railW / 2).length);
  };

  list.forEach((cand, i) => {
    const m = measured[i], w = m.w, h = cand.size * font.line, base = { text: cand.text, kind: cand.kind, size: cand.size, weight: cand.weight, spacing: cand.spacing, fill: cand.fill, opacity: cand.opacity || 1, w, h, cap: m.cap };
    if (cand.point) {
      const [px, py] = cand.point;
      if (cand.room && (cand.room[0] < w * 0.9 || cand.room[1] < h * 1.1)) return;
      /* a name centred on its place is nudged up or down if a railway line would run through it */
      const spots = cand.centred ? [[px, py], [px, py - h * 0.95], [px, py + h * 0.95], [px, py - h * 1.9], [px, py + h * 1.9], [px - w * 0.6, py - h], [px + w * 0.6, py - h], [px - w * 0.6, py + h], [px + w * 0.6, py + h]] : [[px + cand.off + w / 2, py], [px - cand.off - w / 2, py], [px, py + cand.off + h / 2], [px, py - cand.off - h / 2]];
      for (const [x, y] of spots) { const l = { ...base, x, y, angle: 0 }; if (free(l) && !railNear(l, l.h / 2 + railW / 2 + 1).length) { keep(l); return; } }
      if (cand.centred && cand.kind === "place" && cand.pri < 1.05) { const l = { ...base, x: px, y: py, angle: 0 }; if (free(l)) keep(l); }
      return;
    }
    const sagMax = Math.max(1.8, cand.size * 0.24), same = [];
    for (const line of cand.lines) {
      const total = lengthOf(line), need = w + 14;
      if (total < need * (cand.tight ? 1.5 : 1)) continue;
      const n = Math.max(1, Math.round(total / cand.every));
      for (let j = 0; j < n; j++) {
        const mid = (total * (j + 0.5)) / n, slack = Math.max(0, total / n / 2 - need / 2);
        for (const shift of [0, 0.5, -0.5, 1, -1]) {
          const s = Math.min(Math.max(mid + shift * slack, need / 2), total - need / 2);
          const a = pointAt(line, s - w / 2), b = pointAt(line, s + w / 2), c = pointAt(line, s);
          let sag = 0;
          for (let q = 1; q < 8; q++) sag = Math.max(sag, nearestOnSeg(pointAt(line, s - w / 2 + (w * q) / 8), a, b));
          if (sag > sagMax) continue;
          let angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
          if (angle > 90) angle -= 180; else if (angle <= -90) angle += 180;
          const on = { ...base, x: (c[0] + (a[0] + b[0]) / 2) / 2, y: (c[1] + (a[1] + b[1]) / 2) / 2, angle };
          if (same.some((o) => Math.hypot(o.x - on.x, o.y - on.y) < cand.every * 0.72)) continue;
          const l = besideRails(on).find((o) => free(o));
          if (!l) continue;
          keep(l); same.push(l);
          break;
        }
      }
    }
  });
  return placed;
}
const drawNames = (labels, r) => labels.filter((l) => hits(bboxOf(l.box), [r[0] - 4, r[1] - 4, r[2] + 4, r[3] + 4]))
  .map((l) => `<text transform="translate(${n2(l.x)} ${n2(l.y)}) rotate(${n2(l.angle)})" y="${n2(l.cap / 2)}" font-size="${l.size}" font-weight="${l.weight}" letter-spacing="${n2(l.size * l.spacing)}" fill="${l.fill}"${l.opacity < 1 ? ` fill-opacity="${l.opacity}"` : ""}>${esc(l.text)}</text>`).join("\n");

/* === Pages ================================================================ */
const fontData = async (file) => (await readFile(at("src/assets/fonts", file))).toString("base64");
const FONT_CSS = `
@font-face { font-family: "Manrope"; font-style: normal; font-weight: 300 800; src: url(data:font/woff2;base64,${await fontData("manrope-latin.woff2")}) format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: "Noto Sans Thai"; font-style: normal; font-weight: 300 700; src: url(data:font/woff2;base64,${await fontData("noto-sans-thai-thai.woff2")}) format("woff2");
  unicode-range: U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC; }`;
const pageOf = (lang, inner, r, clear) => `<!doctype html><html lang="${lang || "en"}"><head><meta charset="utf-8"><style>${lang ? FONT_CSS : ""}
html, body { margin: 0; background: ${clear ? "transparent" : C.ground}; }
svg { display: block; }
text { font-family: ${lang ? FONT[lang].family : "sans-serif"}; text-anchor: middle; text-rendering: geometricPrecision; font-kerning: normal; stroke: ${C.ground}; stroke-width: ${HALO * 2}px; stroke-linejoin: round; paint-order: stroke; }
</style></head><body><svg id="plate" xmlns="http://www.w3.org/2000/svg" width="${r[2] - r[0]}" height="${r[3] - r[1]}" viewBox="${r[0]} ${r[1]} ${r[2] - r[0]} ${r[3] - r[1]}">${inner}</svg></body></html>`;
async function fontsReady(page, lang) {
  const ok = await page.evaluate(async (th) => {
    const faces = [await document.fonts.load('600 13px "Manrope"', "Road")];
    if (th) faces.push(await document.fonts.load('600 14px "Noto Sans Thai"', "ถนน"));
    await document.fonts.ready;
    return faces.every((f) => f.length > 0);
  }, lang === "th");
  if (!ok) throw new Error(`web fonts did not load for "${lang}"`);
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
const BLOCK = 4, SIDE = BLOCK * TILE;
const context = await browser.newContext({ viewport: { width: SIDE, height: SIDE }, deviceScaleFactor: 2 });
const page = await context.newPage();
const shoot = async (lang, inner, r, clear) => {
  await page.setContent(pageOf(lang, inner, r, clear));
  if (lang) await fontsReady(page, lang);
  return page.screenshot({ type: "png", clip: { x: 0, y: 0, width: r[2] - r[0], height: r[3] - r[1] }, omitBackground: !!clear });
};
const measure = async (lang, list) => {
  await page.setContent(pageOf(lang, "", [0, 0, 10, 10], true));
  await fontsReady(page, lang);
  return page.evaluate(({ items, family, sample }) => {
    const ctx = document.createElement("canvas").getContext("2d");
    return items.map((it) => {
      ctx.font = `${it.weight} ${it.size}px ${family}`;
      ctx.letterSpacing = (it.size * it.spacing).toFixed(2) + "px";
      const w = ctx.measureText(it.text).width;
      ctx.letterSpacing = "0px";
      return { w, cap: ctx.measureText(sample).actualBoundingBoxAscent };
    });
  }, { items: list.map((c) => ({ text: c.text, size: c.size, weight: c.weight, spacing: c.spacing })), family: FONT[lang].family, sample: FONT[lang].cap });
};

/* The squares go straight into the published folder, as the photographs do (docs/media): they are made by
   this tool, not by the build, and the build leaves them alone. */
const OUT = at("docs/map"), OUT_IMG = at("src/assets/img");
const report = { levels: [], warnings: [], names: {} };
const have = { en: [], th: [] };
let bytes = 0, files = 0;
const blocksOf = (L) => { const out = []; for (let r = L.r0; r < L.r0 + L.rows; r += BLOCK) for (let c = L.c0; c < L.c0 + L.cols; c += BLOCK) out.push({ c, r, cols: Math.min(BLOCK, L.c0 + L.cols - c), rows: Math.min(BLOCK, L.r0 + L.rows - r) }); return out; };
const cutTiles = async (png, b, dir, opts, isEmpty) => {
  const made = [];
  for (let j = 0; j < b.rows; j++) for (let i = 0; i < b.cols; i++) {
    const { data, info } = await sharp(png).extract({ left: i * TILE * 2, top: j * TILE * 2, width: TILE * 2, height: TILE * 2 }).raw().toBuffer({ resolveWithObject: true });
    if (isEmpty) { let ink = false; for (let q = 3; q < data.length; q += 4) if (data[q] > 0) { ink = true; break; } if (!ink) { made.push(false); continue; } }
    const file = path.join(dir, `${b.c + i}_${b.r + j}.webp`);
    await sharp(data, { raw: info }).webp(opts).toFile(file);
    bytes += (await stat(file)).size; files++;
    made.push(true);
  }
  return made;
};

try {
  if (!ONLY_LEVELS && !ONLY) await rm(OUT, { recursive: true, force: true });
  const labelsAt = { en: {}, th: {} };
  for (const L of LEVELS) {
    if (ONLY_LEVELS && !ONLY_LEVELS.includes(L.k)) continue;
    const lv = levelOf(L.k), t0 = Date.now();
    const blocks = blocksOf(L);
    if (ONLY !== "names") {
      const dir = path.join(OUT, "base", String(L.k));
      await mkdir(dir, { recursive: true });
      for (const b of blocks) {
        const r = [b.c * TILE, b.r * TILE, (b.c + b.cols) * TILE, (b.r + b.rows) * TILE];
        await cutTiles(await shoot(null, drawBase(lv, r), r, false), b, dir, { quality: 80, effort: 5, smartSubsample: true }, false);
      }
    }
    const counts = {};
    for (const lang of ["en", "th"]) {
      const list = candidates(lv, lang), labels = place(lv, lang, list, await measure(lang, list));
      labelsAt[lang][L.k] = labels;
      counts[lang] = labels.length;
      if (ONLY === "base") continue;
      const dir = path.join(OUT, lang, String(L.k));
      await rm(dir, { recursive: true, force: true });
      await mkdir(dir, { recursive: true });
      const bits = new Array(L.cols * L.rows).fill("0");
      for (const b of blocks) {
        const r = [b.c * TILE, b.r * TILE, (b.c + b.cols) * TILE, (b.r + b.rows) * TILE];
        const inner = drawNames(labels, r);
        if (!inner) continue;
        const made = await cutTiles(await shoot(lang, inner, r, true), b, dir, { quality: 62, alphaQuality: 78, effort: 6 }, true);
        made.forEach((ok, n) => { if (ok) bits[(b.r - L.r0 + Math.floor(n / b.cols)) * L.cols + (b.c - L.c0 + (n % b.cols))] = "1"; });
      }
      have[lang][L.k] = bits.join("");
    }
    report.levels.push({ k: L.k, tiles: L.cols * L.rows, roads: lv.roads.length, buildings: lv.buildings.length, names: counts, seconds: Math.round((Date.now() - t0) / 100) / 10 });
    console.log(`level ${L.k}: ${L.cols} x ${L.rows} tiles, ${lv.roads.length} roads, ${lv.buildings.length} buildings, names en ${counts.en} / th ${counts.th}, ${Math.round((Date.now() - t0) / 1000)} s`);
    lv.done = true;

    /* from level 1: the small picture of the whole area that sits under the tiles while they load */
    if (L.k === 1 && ONLY !== "names") {
      const s = levelSize(1), big = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1 }), p2 = await big.newPage();
      await p2.setContent(pageOf(null, drawBase(lv, [0, 0, s.w, s.h]), [0, 0, s.w, s.h], false));
      await sharp(await p2.screenshot({ type: "png" })).webp({ quality: 72, effort: 6 }).toFile(path.join(OUT_IMG, "map-wide.webp"));
      await big.close();
    }
    /* from level 3: the picture the page shows before its script runs, which is the neighbourhood with its names */
    if (L.k === 3 && ONLY !== "base") {
      const a = toFrame(NEAR.west, NEAR.north), b = toFrame(NEAR.east, NEAR.south);
      const r = [Math.round(a[0] * lv.W), Math.round(a[1] * lv.H), Math.round(b[0] * lv.W), Math.round(b[1] * lv.H)];
      const ctx = await browser.newContext({ viewport: { width: r[2] - r[0], height: r[3] - r[1] }, deviceScaleFactor: 2 }), p3 = await ctx.newPage();
      for (const lang of ["en", "th"]) {
        await p3.setContent(pageOf(lang, drawBase(lv, r) + "\n" + drawNames(labelsAt[lang][3], r), r, false));
        await fontsReady(p3, lang);
        const png = await p3.screenshot({ type: "png" });
        const small = sharp(png).resize(960, 720, { kernel: "lanczos3" });
        await sharp(png).resize(1600, 1200, { kernel: "lanczos3" }).webp({ quality: 82, effort: 6, smartSubsample: true }).toFile(path.join(OUT_IMG, `map-${lang}-1600.webp`));
        await small.clone().webp({ quality: 82, effort: 6, smartSubsample: true }).toFile(path.join(OUT_IMG, `map-${lang}-960.webp`));
        await small.clone().jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: "4:4:4" }).toFile(path.join(OUT_IMG, `map-${lang}-960.jpg`));
        await writeFile(at("_private/map", `check-${lang}.png`), png);
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

/* === The record the site reads ============================================ */
if (!ONLY_LEVELS && ONLY !== "base") {
  const fetchedDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(meta.fetched || Date.now()));
  const filesFor = (lang) => ({ webp: [`map-${lang}-960.webp`, `map-${lang}-1600.webp`], jpg: `map-${lang}-960.jpg` });
  const record = {
    width: 1600, height: 1200, bounds: NEAR, projection: "web-mercator", source: "OpenStreetMap contributors, ODbL", fetched: fetchedDay,
    files: { en: filesFor("en"), th: filesFor("th") },
    wide: { bounds: FRAME, open: OPEN, ground: Math.round(GROUND), tile: TILE, under: "map-wide.webp", levels: LEVELS, names: have },
  };
  await writeFile(at("src/data/map.generated.json"), JSON.stringify(record, null, 2) + "\n", "utf8");
}
report.files = files; report.megabytes = Math.round((bytes / 1048576) * 10) / 10;
report.data = { fetched: meta.fetched, osmBase: meta.osmBase, elements: wide.elements.length, buildings: bld.elements.length, roads: roads.length, rails: rails.length, tracksMapped: railsAll.length, stations: stations.length, places: placeNodes.length };
await writeFile(at("_private/map/last-run.json"), JSON.stringify(report, null, 1), "utf8");
console.log(JSON.stringify({ files, megabytes: report.megabytes, data: report.data }));
