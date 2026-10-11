/* Draws the static street-map plate of Pratunam and Ratchathewi for the location pages.

   What it does, end to end:
     1. reads the OpenStreetMap extract from _private/map/overpass.json, or asks the
        Overpass API for it once and saves it there (later runs are offline);
     2. projects everything with spherical Web Mercator into a fixed 1600 x 1200 frame;
     3. builds one SVG per language (English, Thai) in the site palette;
     4. renders the SVG in a real browser with the site's own web fonts;
     5. writes the WebP and JPEG derivatives, the projection record the site uses to
        place its pins, and two check images with verification points drawn on top.

   The plate carries no pins, icons or place names: the site overlays those in HTML
   from coordinates, using the bounds written to src/data/map.generated.json.

   Usage: node tools/map.mjs
   Map data: OpenStreetMap contributors, Open Database License. */
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const at = (...p) => path.join(ROOT, ...p);

/* === Frame ================================================================
   West and east are fixed. North and south are set so that the Mercator frame is
   exactly 4:3, symmetric (in Mercator) around latitude 13.7504. The rounded values
   below are the ones recorded for the site, and the projection is defined from those
   same rounded values, so the site's pins and this drawing cannot drift apart. */
const W = 1600, H = 1200;
const WEST = 100.5255, EAST = 100.5455, CENTRE_LAT = 13.7504;
const rad = (d) => (d * Math.PI) / 180;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2));
const invMercY = (y) => ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;
const round7 = (n) => Math.round(n * 1e7) / 1e7;
const halfHeight = ((rad(EAST) - rad(WEST)) * (H / W)) / 2;
const BOUNDS = {
  west: WEST,
  east: EAST,
  north: round7(invMercY(mercY(CENTRE_LAT) + halfHeight)),
  south: round7(invMercY(mercY(CENTRE_LAT) - halfHeight)),
};
const MX0 = rad(BOUNDS.west), MX1 = rad(BOUNDS.east), MY0 = mercY(BOUNDS.north), MY1 = mercY(BOUNDS.south);
/* longitude, latitude -> pixel in the 1600 x 1200 frame (x right, y down, north up) */
const project = (lon, lat) => [((rad(lon) - MX0) / (MX1 - MX0)) * W, ((MY0 - mercY(lat)) / (MY0 - MY1)) * H];

/* === Look ================================================================= */
const C = {
  ground: "#F5F2EC", building: "#ECE7DD", park: "#E3E6D8", water: "#D5DEE0",
  road: "#FFFFFF", casing: "#DDD7CC", ink: "#202B32", label: "#5A6265",
};
/* stroke widths in px at the 1600 canvas; "major" classes get a hair of casing */
const ROADS = {
  motorway: { w: 9, major: true }, trunk: { w: 9, major: true }, primary: { w: 9, major: true },
  secondary: { w: 7, major: true }, tertiary: { w: 5, major: true },
  residential: { w: 3 }, unclassified: { w: 3 }, living_street: { w: 3 }, pedestrian: { w: 3 },
  service: { w: 1.5 },
};
const LINK_SCALE = 0.62;   /* slip roads and ramps are drawn narrower than the road they serve */
const CASING = 1;          /* px of casing on each side of a major road */
const DRAW_ORDER = ["service", "pedestrian", "living_street", "unclassified", "residential", "tertiary", "secondary", "primary", "trunk", "motorway"];

/* === Labels ===============================================================
   Road names are read from the OSM tags of the ways themselves (name:en, then
   name:th or name). `near` is only a hint for where along the road the name should
   sit; position and bearing are then taken from the road geometry at that point.
   A label is centred on its line unless:
   - `shift` moves it sideways by that many px (positive = towards the foot of the text);
   - a rail line runs along it, in which case it is moved just clear of the rails,
     to the nearer side, or to the side named by `side` (-1 = head of the text, 1 = foot). */
const ROAD_LABELS = [
  { osm: "Phetchaburi Road", near: [100.5285, 13.7513] },
  { osm: "Phetchaburi Road", near: [100.5432, 13.7500] },
  { osm: "Ratchaprarop Road", near: [100.5413, 13.7530] },
  { osm: "Ratchadamri Road", near: [100.5403, 13.7468] },
  { osm: "Phaya Thai Road", near: [100.5306, 13.7490] },
  { osm: "Rama I Road", near: [100.5272, 13.7469], side: -1 },
  { osm: "Si Ayutthaya Road", near: [100.5380, 13.7572] },
];
/* OSM's English name for the canal is "Khlong Saen Saep" ("khlong" is Thai for canal).
   The English plate uses the plain-English form, set here; the Thai text is OSM's.
   The canal is only about 10 px wide, so its name runs along the bank, not over it. */
const WATER_LABELS = [
  { osm: "Khlong Saen Saep", en: "Saen Saep Canal", near: [100.5345, 13.7494], shift: 14 },
];
/* The two rail lines are named once each, in small text, beside the line and near the frame edge. */
const RAIL_LABELS = [
  { line: "bts-sukhumvit", en: "BTS Sukhumvit Line", th: "รถไฟฟ้า BTS สายสุขุมวิท", near: [100.5330, 13.7550], side: 1 },
  { line: "arl", en: "Airport Rail Link", th: "แอร์พอร์ต เรล ลิงก์", near: [100.5450, 13.7545], side: -1 },
];
const RAIL_GAP = 2.5;      /* px between a label's halo and a rail line beside it */
const TYPE = {
  en: { family: '"Manrope", sans-serif', size: 13, small: 11, spacing: "0.06em", upper: true, capSample: "H" },
  th: { family: '"Manrope", "Noto Sans Thai", sans-serif', size: 14, small: 12, spacing: "0", upper: false, capSample: "ก" },
};
const HALO = 3;            /* px of ivory around each glyph (stroke-width is twice this) */

/* === Verification points (check images only, never shipped) ================ */
const HOTEL = { lat: 13.7504126, lon: 100.5385094 };
const STATIONS = [
  { key: "Ratchathewi BTS", en: "Ratchathewi", ref: "N1", kind: "bts" },
  { key: "Phaya Thai BTS", en: "Phaya Thai", ref: "N2", kind: "bts" },
  { key: "Phaya Thai ARL", en: "Phaya Thai", ref: "A8", kind: "arl" },
  { key: "Ratchaprarop ARL", en: "Ratchaprarop", ref: "A7", kind: "arl" },
  { key: "Siam BTS", en: "Siam", ref: "CEN", kind: "bts" },
  { key: "Chit Lom BTS", en: "Chit Lom", ref: "E1", kind: "bts" },
];

/* === Data =================================================================
   One request, a little larger than the frame. `out geom` puts coordinates on every
   way and on every member of the multipolygon relations, so no second lookup is
   needed. The route relations come back without geometry: they are only used to
   tell which track belongs to which line. */
const PAD = 0.003;
const QUERY_BBOX = [BOUNDS.south - PAD, BOUNDS.west - PAD, BOUNDS.north + PAD, BOUNDS.east + PAD].map((n) => n.toFixed(4)).join(",");
const QUERY = `[out:json][timeout:120][bbox:${QUERY_BBOX}];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary)(_link)?$"];
  way["highway"~"^(residential|unclassified|living_street|pedestrian|service)$"];
  way["railway"~"^(rail|light_rail|subway|monorail)$"];
  way["waterway"];
  way["natural"="water"];
  relation["natural"="water"];
  relation["waterway"="riverbank"];
  way["leisure"="park"];
  relation["leisure"="park"];
  way["landuse"="grass"];
  relation["landuse"="grass"];
  way["building"];
  relation["building"];
  node["railway"="station"];
  node["public_transport"="station"];
  way["railway"="station"];
  way["public_transport"="station"];
);
out body geom;
relation["route"~"^(train|light_rail|subway|monorail)$"];
out body;`;
const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const USER_AGENT = "grand-diamond-concept-map/1.0 (static render, one request)";
const CACHE = at("_private/map/overpass.json");
const CACHE_META = at("_private/map/overpass.meta.json");   /* which endpoint answered, and when */

async function loadOsm() {
  try {
    const raw = await readFile(CACHE, "utf8");
    let meta = {};
    try { meta = JSON.parse(await readFile(CACHE_META, "utf8")); } catch { meta = { fetched: (await stat(CACHE)).mtime.toISOString() }; }
    return { osm: JSON.parse(raw), meta, reused: true };
  } catch { /* no saved extract yet: ask once */ }
  let lastError;
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8", "user-agent": USER_AGENT, accept: "application/json" },
        body: "data=" + encodeURIComponent(QUERY),
        signal: AbortSignal.timeout(180000),
      });
      const raw = await res.text();
      if (!res.ok) throw new Error(`${endpoint} answered ${res.status}: ${raw.slice(0, 200)}`);
      const osm = JSON.parse(raw);
      if (!Array.isArray(osm.elements) || !osm.elements.length) throw new Error(`${endpoint} returned no elements`);
      const meta = { endpoint, fetched: new Date().toISOString(), userAgent: USER_AGENT, bbox: QUERY_BBOX, elements: osm.elements.length, query: QUERY };
      await mkdir(path.dirname(CACHE), { recursive: true });
      await writeFile(CACHE, raw, "utf8");
      await writeFile(CACHE_META, JSON.stringify(meta, null, 1), "utf8");
      return { osm, meta, reused: false };
    } catch (e) { lastError = e; console.warn("Overpass request failed:", String(e).slice(0, 300)); }
  }
  throw lastError;
}

/* === Geometry helpers (all in frame pixels) ================================ */
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lengthOf = (line) => { let s = 0; for (let i = 1; i < line.length; i++) s += dist(line[i - 1], line[i]); return s; };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function touchesFrame(line, margin = 40) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of line) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 >= -margin && x0 <= W + margin && y1 >= -margin && y0 <= H + margin;
}

/* extra points so that no two neighbours are further apart than `step` */
function densify(line, step) {
  const out = [line[0]];
  for (let i = 1; i < line.length; i++) {
    const n = Math.ceil(dist(line[i - 1], line[i]) / step);
    for (let k = 1; k <= n; k++) out.push(lerp(line[i - 1], line[i], k / n));
  }
  return out;
}

function pointAt(line, s) {
  for (let i = 1; i < line.length; i++) {
    const d = dist(line[i - 1], line[i]);
    if (s <= d || i === line.length - 1) return lerp(line[i - 1], line[i], d ? Math.min(1, Math.max(0, s / d)) : 0);
    s -= d;
  }
  return line[0];
}

/* nearest point of a polyline to p: distance, the point, how far along it lies, and
   whether that point is simply one of the two ends (p is then beyond the line) */
function nearestOnLine(p, line) {
  let best = { d: Infinity, point: line[0], s: 0, atEnd: true }, run = 0;
  const last = line.length - 1;
  for (let i = 1; i <= last; i++) {
    const a = line[i - 1], b = line[i], vx = b[0] - a[0], vy = b[1] - a[1], len2 = vx * vx + vy * vy;
    const t = len2 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / len2)) : 0;
    const q = [a[0] + vx * t, a[1] + vy * t], d = dist(p, q), seg = Math.sqrt(len2);
    if (d < best.d) best = { d, point: q, s: run + seg * t, atEnd: (i === 1 && t === 0) || (i === last && t === 1) };
    run += seg;
  }
  return best;
}
const nearestOnLines = (p, lines, within = Infinity) => {
  let best = null;
  for (const line of lines) { const n = nearestOnLine(p, line); if (n.d <= within && (!best || n.d < best.d)) best = n; }
  return best;
};

/* Douglas-Peucker: drops points that move the line by less than `tolerance` px */
function simplify(line, tolerance) {
  if (line.length < 3) return line;
  const keep = new Uint8Array(line.length); keep[0] = keep[line.length - 1] = 1;
  const stack = [[0, line.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    let worst = 0, at = -1;
    for (let k = i + 1; k < j; k++) { const d = nearestOnLine(line[k], [line[i], line[j]]).d; if (d > worst) { worst = d; at = k; } }
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

/* Joins pieces end to end into longer lines. Each piece is { pts, a, b } where a and b
   identify its two ends (OSM node ids, or coordinates for relation members). Where
   several pieces meet, the straightest continuation is taken; `maxTurn` (degrees)
   stops a line from doubling back along the other carriageway or track. */
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
        if (head === tail && pts.length > 2) break;                      /* already a closed ring */
        const k = side === "tail" ? tail : head;
        const here = side === "tail" ? pts.at(-1) : pts[0], prev = side === "tail" ? pts.at(-2) : pts[1];
        let best = null;
        for (const o of ends.get(k) || []) {
          const oPts = o.a === k ? o.pts : o.pts.slice().reverse();      /* oriented to leave from k */
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

/* Collapses parallel lines (the two tracks of a railway, the two carriageways of a
   road) into one centre line. Nothing is invented: every output point is a mapped
   point, moved by the average offset to mapped neighbours no more than `tol` px away.

   Lines are taken longest first and the first is kept. A later line is compared with
   what is already kept:
   - where it runs within `tol` px of a kept line it is absorbed by that line (its
     host), and the host is afterwards moved to the middle of everything it absorbed.
     This also covers tracks that spread around a station platform and come back;
   - where it goes further away than `tol` it is a branch. That part is kept as a line
     of its own, together with the stretch over which it peels away from its host,
     and that stretch is eased onto the host so that the join is smooth. */
function collapseParallel(lines, tol) {
  const STEP = 3;                                   /* px between sample points */
  const todo = lines.map((l) => densify(l, STEP)).sort((a, b) => lengthOf(b) - lengthOf(a));
  const kept = [];                                  /* { raw: points, ease: per point, null or { host, w } } */
  const absorbed = [];                              /* { host, src, pts }: a stretch of line `src` taken in by kept line `host` */
  todo.forEach((line, src) => {
    const hosts = kept.length;
    if (!hosts) { kept.push({ raw: line, ease: line.map(() => null) }); return; }
    const near = line.map((p) => {
      let best = { d: Infinity, host: -1 };
      for (let h = 0; h < hosts; h++) { const d = nearestOnLine(p, kept[h].raw).d; if (d < best.d) best = { d, host: h }; }
      return best;
    });
    const used = new Uint8Array(line.length);
    for (let i = 0; i < line.length; i++) {
      if (near[i].d <= tol) continue;
      let j = i; while (j + 1 < line.length && near[j + 1].d > tol) j++;                    /* i..j lies apart */
      let a = i; while (a > 0 && near[a - 1].d < near[a].d - 0.03) a--;                     /* peeling away before it */
      let b = j; while (b + 1 < line.length && near[b + 1].d < near[b].d - 0.03) b++;       /* closing in again after it */
      const raw = [], ease = [];
      for (let k = a; k <= b; k++) {
        const end = k < i ? a : k > j ? b : -1;
        raw.push(line[k]);
        ease.push(end < 0 ? null : { host: near[k].host, w: Math.min(1, (tol - near[k].d) / Math.max(1e-6, tol - near[end].d)) });
        used[k] = 1;
      }
      if (lengthOf(raw) > tol) kept.push({ raw, ease });
      i = b;
    }
    let pts = [], host = -1;
    const close = () => { if (pts.length > 1) absorbed.push({ host, src, pts }); pts = []; };
    line.forEach((p, k) => {
      if (used[k]) { close(); return; }
      if (near[k].host !== host) { close(); host = near[k].host; }
      pts.push(p);
    });
    close();
  });

  const done = [];
  kept.forEach((line, h) => {
    const bundle = new Map();                       /* source line -> its stretches absorbed by this one */
    for (const x of absorbed) if (x.host === h) bundle.set(x.src, (bundle.get(x.src) || []).concat([x.pts]));
    /* how far each point has to move to reach the middle of its bundle */
    const move = line.raw.map((p) => {
      let x = 0, y = 0, n = 1;
      for (const stretches of bundle.values()) {
        const q = nearestOnLines(p, stretches, tol * 1.1);
        if (q && !q.atEnd) { x += q.point[0] - p[0]; y += q.point[1] - p[1]; n++; }
      }
      return [x / n, y / n];
    });
    const SMOOTH = 5;                               /* samples either side: evens out the step where a neighbour starts or stops */
    done.push(line.raw.map((p, k) => {
      let x = 0, y = 0, n = 0;
      for (let m = Math.max(0, k - SMOOTH); m <= Math.min(move.length - 1, k + SMOOTH); m++) { x += move[m][0]; y += move[m][1]; n++; }
      const q = [p[0] + x / n, p[1] + y / n], e = line.ease[k];
      return e ? lerp(q, nearestOnLine(q, done[e.host]).point, e.w) : q;
    }));
  });
  return done.map((l) => simplify(l, 0.2));
}

const signedArea = (ring) => { let s = 0; for (let i = 1; i < ring.length; i++) s += ring[i - 1][0] * ring[i][1] - ring[i][0] * ring[i - 1][1]; return s / 2; };
const sameWay = (ring) => (signedArea(ring) < 0 ? ring.slice().reverse() : ring);   /* one winding, so overlaps unite */

/* === SVG helpers ========================================================== */
const n2 = (n) => String(Math.round(n * 100) / 100);
const dLine = (line) => "M" + line.map((p) => n2(p[0]) + " " + n2(p[1])).join("L");
const dRing = (ring) => dLine(ring) + "Z";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* === Read the extract into layers ========================================= */
const { osm, meta, reused } = await loadOsm();
const ways = osm.elements.filter((e) => e.type === "way" && e.geometry);
const relations = osm.elements.filter((e) => e.type === "relation");
const toPx = (geometry) => geometry.map((g) => project(g.lon, g.lat));
const closed = (w) => w.nodes.length > 3 && w.nodes[0] === w.nodes.at(-1);
const coordKey = (g) => g.lat + "," + g.lon;
const piece = (w) => ({ pts: toPx(w.geometry), a: w.nodes[0], b: w.nodes.at(-1) });

/* areas: plain closed ways go into one united path; multipolygons keep their holes */
function areaLayer(wayTest, relTest) {
  const simple = [], holed = [];
  for (const w of ways) if (wayTest(w.tags || {}) && closed(w)) { const r = toPx(w.geometry); if (touchesFrame(r)) simple.push(sameWay(r)); }
  for (const r of relations) {
    if (r.tags?.type !== "multipolygon" || !relTest(r.tags)) continue;
    const ring = (role) => stitch(r.members.filter((m) => m.type === "way" && m.geometry && (m.role || "outer") === role)
      .map((m) => ({ pts: toPx(m.geometry), a: coordKey(m.geometry[0]), b: coordKey(m.geometry.at(-1)) }))).filter((x) => x.length > 3);
    const outer = ring("outer"), inner = ring("inner");
    if (!outer.some((x) => touchesFrame(x))) continue;
    if (inner.length) holed.push(outer.concat(inner)); else simple.push(...outer.map(sameWay));
  }
  return { simple, holed };
}
const areaSvg = ({ simple, holed }, fill, extra = "") =>
  (simple.length ? `<path fill="${fill}" ${extra} d="${simple.map(dRing).join("")}"/>` : "") +
  holed.map((rings) => `<path fill="${fill}" ${extra} fill-rule="evenodd" d="${rings.map(dRing).join("")}"/>`).join("");

const underground = (t) => Number(t.layer) < 0 || t.location === "underground";
const parks = areaLayer((t) => t.leisure === "park" || t.landuse === "grass", (t) => t.leisure === "park" || t.landuse === "grass");
const water = areaLayer((t) => t.natural === "water" || t.waterway === "riverbank", (t) => t.natural === "water" || t.waterway === "riverbank");
const buildings = areaLayer((t) => t.building && t.building !== "no" && !underground(t), (t) => t.building && !underground(t));
const plazas = areaLayer((t) => t.highway === "pedestrian" && t.area === "yes", () => false);

/* small canals and drains that are mapped as a line only (the Saen Saep has a mapped area) */
const WATERLINE = { river: 6, canal: 3, stream: 1.5, drain: 1.5, ditch: 1.5 };
const waterLines = {};
for (const w of ways) {
  const t = w.tags || {}, width = WATERLINE[t.waterway];
  if (!width || t.tunnel) continue;
  const line = toPx(w.geometry);
  if (touchesFrame(line)) (waterLines[width] ||= []).push(line);
}

/* roads */
const roadLines = {};      /* "primary", "primary_link", ... -> lines */
for (const w of ways) {
  const t = w.tags || {};
  if (!t.highway || t.area === "yes") continue;
  const link = t.highway.endsWith("_link"), base = link ? t.highway.slice(0, -5) : t.highway;
  if (!ROADS[base]) continue;
  if (t.tunnel === "yes") continue;                                              /* underground: not part of the street picture */
  if ((base === "service" || base === "pedestrian") && (t.tunnel || t.bridge)) continue;   /* car-park ramps and footbridges */
  if (base === "service" && (/^(parking_aisle|driveway|drive-through|emergency_access)$/.test(t.service || "") || /^(private|no)$/.test(t.access || ""))) continue;
  const line = toPx(w.geometry);
  if (touchesFrame(line)) (roadLines[t.highway] ||= []).push(line);
}
const roadWidth = (cls) => (cls.endsWith("_link") ? Math.max(3.5, ROADS[cls.slice(0, -5)].w * LINK_SCALE) : ROADS[cls].w);
const roadOrder = Object.keys(roadLines).sort((a, b) => {
  const rank = (c) => DRAW_ORDER.indexOf(c.replace(/_link$/, "")) * 2 + (c.endsWith("_link") ? 0 : 1);
  return rank(a) - rank(b);
});

/* railways: which line a track belongs to comes from its route relation, then its own tags */
const routeOfWay = new Map();
for (const r of relations) if (r.tags?.type === "route") for (const m of r.members) if (m.type === "way") routeOfWay.set(m.ref, r.tags);
function railLine(w) {
  const t = w.tags, r = routeOfWay.get(w.id) || {};
  const text = [t.network, t.name, t["name:en"], r.network, r.name, r["name:en"]].filter(Boolean).join(" | ");
  if (/\bBTS\b|บีทีเอส/.test(text)) return /Silom|สีลม/.test(text) ? "bts-silom" : "bts-sukhumvit";
  if (/\bARL\b|Airport Rail Link/.test(text)) return "arl";
  return t.railway === "rail" ? "rail" : "transit";
}
const railPieces = {};     /* line key -> pieces */
for (const w of ways) {
  const t = w.tags || {};
  if (!/^(rail|light_rail|subway|monorail)$/.test(t.railway || "")) continue;
  if (t.service || t.tunnel) continue;                 /* sidings, yards, spurs and crossovers are left out */
  const p = piece(w);
  if (touchesFrame(p.pts)) (railPieces[railLine(w)] ||= []).push(p);
}
/* The two tracks of each line are about 3 px apart at this scale, two BTS lines share
   the viaduct east of Siam, and at Siam the four tracks spread to about 12 px around
   the platforms. Each bundle is drawn as its one centre line. */
const TRACK_TOL = 16;
const NEARBY = [-80, -80, W + 80, H + 80];             /* centre lines are worked out for the frame and a little beyond */
const nearby = (lines) => lines.flatMap((l) => clipLine(l, NEARBY));
const chains = (keys) => nearby(keys.flatMap((k) => stitch(railPieces[k] || [], 60)));
const RAIL_GROUPS = { bts: ["bts-sukhumvit", "bts-silom", "transit"], arl: ["arl"], rail: ["rail"] };
const rails = Object.fromEntries(Object.entries(RAIL_GROUPS).map(([name, keys]) => [name, collapseParallel(chains(keys), TRACK_TOL)]));
const allRails = Object.values(rails).flat();
/* honesty check: how far, inside the frame, a drawn centre line strays from the nearest mapped track */
const railDrift = Object.fromEntries(Object.entries(RAIL_GROUPS).map(([name, keys]) => {
  const mapped = chains(keys);
  let worst = 0;
  for (const line of rails[name]) for (const p of densify(line, 3)) {
    if (p[0] < 0 || p[0] > W || p[1] < 0 || p[1] > H) continue;
    worst = Math.max(worst, nearestOnLines(p, mapped)?.d ?? 0);
  }
  return [name, worst];
}));

/* stations, for the check images and the numeric checks below */
const stationNodes = osm.elements.filter((e) => e.type === "node" && e.tags?.railway === "station");
const checks = [{ key: "Hotel", en: "Hotel", th: "โรงแรม", ...HOTEL, px: project(HOTEL.lon, HOTEL.lat) }];
const warnings = [];
for (const s of STATIONS) {
  const node = stationNodes.find((n) => n.tags["name:en"] === s.en && n.tags.ref === s.ref);
  if (!node) { warnings.push(`station not found in the extract: ${s.key}`); continue; }
  const px = project(node.lon, node.lat);
  const suffix = s.kind === "bts" ? "BTS" : "ARL";
  checks.push({ key: s.key, en: s.key, th: `${node.tags["name:th"] || node.tags.name} ${suffix}`, lat: node.lat, lon: node.lon, px, osmNode: node.id, offLine: nearestOnLines(px, rails[s.kind])?.d ?? null });
}

/* === Label placement ====================================================== */
const INSET = 16;                                      /* labels stay this far inside the frame */
const majorNamed = (name) => ways.filter((w) => w.tags?.["name:en"] === name && /^(motorway|trunk|primary|secondary|tertiary)$/.test(w.tags.highway || "") && w.tags.tunnel !== "yes");
const commonest = (list) => { const m = new Map(); for (const v of list) if (v) m.set(v, (m.get(v) || 0) + 1); return [...m].sort((a, b) => b[1] - a[1])[0]?.[0]; };

/* centre line of a named road or canal, as lines in px */
const centreOf = (list, tol) => collapseParallel(nearby(stitch(list.map(piece), 60)), tol).filter((l) => touchesFrame(l, 0));

function placeAlong(lines, near, textLength) {
  const frame = [INSET, INSET, W - INSET, H - INSET];
  const room = textLength + 10;
  const inside = lines.flatMap((l) => clipLine(l, frame)).filter((l) => lengthOf(l) >= room);
  if (!inside.length) return null;
  const hint = project(near[0], near[1]);
  let best = null;
  for (const line of inside) { const n = nearestOnLine(hint, line); if (!best || n.d < best.d) best = { ...n, line }; }
  const total = lengthOf(best.line);
  const s = Math.min(Math.max(best.s, room / 2), total - room / 2);
  const a = pointAt(best.line, s - textLength / 2), b = pointAt(best.line, s + textLength / 2), m = pointAt(best.line, s);
  let angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  if (angle > 90) angle -= 180; else if (angle <= -90) angle += 180;   /* never upside down */
  /* how far the road bows away from the straight text over its length */
  let sag = 0;
  for (let k = 0; k <= 10; k++) sag = Math.max(sag, nearestOnLine(pointAt(best.line, s - textLength / 2 + (textLength * k) / 10), [a, b]).d);
  return { x: (m[0] + (a[0] + b[0]) / 2) / 2, y: (m[1] + (a[1] + b[1]) / 2) / 2, angle, sag };
}

/* Text and source geometry for every label, before any measuring. A road is matched
   by its OSM name:en, so the English text is that tag; a name with no way inside the
   extract is skipped with a warning and never drawn. */
const labelSpecs = [];
for (const spec of ROAD_LABELS) {
  const list = majorNamed(spec.osm);
  if (!list.length) { warnings.push(`no road named "${spec.osm}" in the extract: not labelled`); continue; }
  labelSpecs.push({ ...spec, kind: "road", lines: centreOf(list, 20), text: { en: spec.osm, th: commonest(list.map((w) => w.tags["name:th"] || w.tags.name)) } });
}
for (const spec of WATER_LABELS) {
  const list = ways.filter((w) => w.tags?.waterway && w.tags["name:en"] === spec.osm && !w.tags.tunnel);
  if (!list.length) { warnings.push(`no waterway named "${spec.osm}" in the extract: not labelled`); continue; }
  labelSpecs.push({ ...spec, kind: "water", lines: centreOf(list, 20), text: { en: spec.en || spec.osm, th: commonest(list.map((w) => w.tags["name:th"] || w.tags.name)) } });
}
for (const spec of RAIL_LABELS) {
  const lines = collapseParallel(chains([spec.line]), TRACK_TOL).filter((l) => touchesFrame(l, 0));
  if (!lines.length) { warnings.push(`rail line "${spec.line}" is not in the frame: not labelled`); continue; }
  labelSpecs.push({ ...spec, kind: "rail", small: true, lines, text: { en: spec.en, th: spec.th } });
}
const labelText = (spec, lang) => (TYPE[lang].upper ? spec.text[lang].toUpperCase() : spec.text[lang]);

/* === Page: fonts, styles, SVG ============================================= */
const fontData = async (file) => (await readFile(at("src/assets/fonts", file))).toString("base64");
const FONT_CSS = `
@font-face { font-family: "Manrope"; font-style: normal; font-weight: 300 800; src: url(data:font/woff2;base64,${await fontData("manrope-latin.woff2")}) format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: "Noto Sans Thai"; font-style: normal; font-weight: 300 700; src: url(data:font/woff2;base64,${await fontData("noto-sans-thai-thai.woff2")}) format("woff2");
  unicode-range: U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC; }`;
const styleFor = (lang) => `${FONT_CSS}
html, body { margin: 0; background: ${C.ground}; }
svg { display: block; }
text { text-rendering: geometricPrecision; font-kerning: normal; }
.lbl { font: 600 ${TYPE[lang].size}px ${TYPE[lang].family}; letter-spacing: ${TYPE[lang].spacing}; text-anchor: middle;
  fill: ${C.label}; stroke: ${C.ground}; stroke-width: ${HALO * 2}px; stroke-linejoin: round; paint-order: stroke; }
.lbl.small { font-size: ${TYPE[lang].small}px; }
.chk { font: 700 13px ${TYPE[lang].family}; fill: #C8102E; stroke: #FFFFFF; stroke-width: 4px; stroke-linejoin: round; paint-order: stroke; }
.chk-x { stroke: #C8102E; stroke-width: 2.2; stroke-linecap: round; fill: none; }`;
const pageFor = (lang, svg) => `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${styleFor(lang)}</style></head><body>${svg}</body></html>`;

async function fontsReady(page, lang) {
  /* the page must really be using the site's fonts, never a system fallback */
  const ok = await page.evaluate(async (th) => {
    const faces = [await document.fonts.load('600 13px "Manrope"', "Road")];
    if (th) faces.push(await document.fonts.load('600 14px "Noto Sans Thai"', "ถนน"));
    await document.fonts.ready;
    return faces.every((f) => f.length > 0);
  }, lang === "th");
  if (!ok) throw new Error(`web fonts did not load for "${lang}"`);
}

/* the base drawing, shared by both languages */
const stroke = (lines, colour, width, extra = "") => (lines?.length ? `<path fill="none" stroke="${colour}" stroke-width="${n2(width)}" ${extra} d="${lines.map(dLine).join("")}"/>` : "");
const ROUND = 'stroke-linecap="round" stroke-linejoin="round"';
const major = roadOrder.filter((c) => ROADS[c.replace(/_link$/, "")].major), minor = roadOrder.filter((c) => !ROADS[c.replace(/_link$/, "")].major);
const baseSvg = [
  `<rect width="${W}" height="${H}" fill="${C.ground}"/>`,
  areaSvg(parks, C.park),
  areaSvg(water, C.water),
  Object.entries(waterLines).map(([w, lines]) => stroke(lines, C.water, +w, ROUND)).join(""),
  areaSvg(buildings, C.building),
  areaSvg(plazas, C.road, 'fill-opacity="0.55"'),      /* pedestrian squares: quieter than a street */
  /* casings first, then every road surface, so that junctions run together cleanly */
  major.map((c) => stroke(roadLines[c], C.casing, roadWidth(c) + CASING * 2, ROUND)).join(""),
  minor.map((c) => stroke(roadLines[c], C.road, roadWidth(c), ROUND)).join(""),
  major.map((c) => stroke(roadLines[c], C.road, roadWidth(c), ROUND)).join(""),
  /* ordinary railway: a thin, lighter line with small ticks */
  stroke(rails.rail, C.ink, 1.1, 'stroke-opacity="0.5" stroke-linejoin="round"'),
  stroke(rails.rail, C.ink, 5, 'stroke-opacity="0.5" stroke-dasharray="1.1 8.9"'),
  /* Airport Rail Link: dashed ink. BTS: solid ink. */
  stroke(rails.arl, C.ink, 2.2, 'stroke-dasharray="9 5" stroke-linejoin="round"'),
  stroke(rails.bts, C.ink, 2.2, ROUND),
].join("\n");

const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await context.newPage();

const OUT_IMG = at("src/assets/img"), OUT_PRIVATE = at("_private/map");
await mkdir(OUT_IMG, { recursive: true });
await mkdir(OUT_PRIVATE, { recursive: true });
const written = [];
const files = {};
const placedByLang = {};

try {
  for (const lang of ["en", "th"]) {
    const type = TYPE[lang];
    /* 1. measure every label in the real fonts: its length, how far its ink reaches above
          and below the baseline, and the height of a capital (or of a Thai consonant) */
    const texts = labelSpecs.map((s) => labelText(s, lang));
    await page.setContent(pageFor(lang, `<svg width="${W}" height="${H}">${labelSpecs.map((s, i) => `<text id="m${i}" class="lbl${s.small ? " small" : ""}">${esc(texts[i])}</text>`).join("")}</svg>`));
    await fontsReady(page, lang);
    const measured = await page.evaluate(({ items, family, sample }) => {
      const ctx = document.createElement("canvas").getContext("2d");
      return items.map(({ text, px }, i) => {
        ctx.font = `600 ${px}px ${family}`;
        const ink = ctx.measureText(text);
        return { width: document.getElementById("m" + i).getComputedTextLength(), ascent: ink.actualBoundingBoxAscent, descent: ink.actualBoundingBoxDescent, cap: ctx.measureText(sample).actualBoundingBoxAscent };
      });
    }, { items: labelSpecs.map((s, i) => ({ text: texts[i], px: s.small ? type.small : type.size })), family: type.family, sample: type.capSample });

    /* 2. place each label on its line */
    const placed = [];
    labelSpecs.forEach((spec, i) => {
      const text = texts[i], { width, ascent, descent, cap } = measured[i];
      const p = placeAlong(spec.lines, spec.near, width);
      if (!p) { warnings.push(`[${lang}] "${text}" does not fit inside the frame along its line: not labelled`); return; }
      /* The baseline is set so that the capitals (or the Thai consonants) are centred on
         the line. `above` and `below` are how far the ink then reaches to either side;
         Thai vowels and tone marks make `above` larger than `below`. */
      const above = ascent - cap / 2, below = descent + cap / 2;
      /* A name must never sit on an ink rail line. Where a line runs along the label
         (above the middle of a road, or the label's own line), find how far to either
         side the rails lie and move the label just clear of them. `v` is the label's
         own "down" direction; offsets are measured along it. */
      const a = rad(p.angle), ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
      let lo = Infinity, hi = -Infinity;
      for (let t = -width / 2; t <= width / 2; t += 4) {
        const q = [p.x + ux * t, p.y + uy * t];
        for (const line of allRails) {
          const n = nearestOnLine(q, line);
          if (n.d > 36 || Math.abs((n.point[0] - q[0]) * ux + (n.point[1] - q[1]) * uy) > 6) continue;   /* only lines running alongside */
          const off = (n.point[0] - q[0]) * vx + (n.point[1] - q[1]) * vy;
          lo = Math.min(lo, off); hi = Math.max(hi, off);
        }
      }
      const margin = HALO + RAIL_GAP;
      let shift = spec.shift || 0;
      if (hi > shift - above - margin && lo < shift + below + margin) {
        const up = lo - below - margin, down = hi + above + margin;
        shift = spec.side ? (spec.side < 0 ? up : down) : Math.abs(up - shift) <= Math.abs(down - shift) ? up : down;
        if (hi - lo > 24) warnings.push(`[${lang}] "${text}" has rail lines spread over ${Math.round(hi - lo)} px beside it`);
      }
      const x = p.x + vx * shift, y = p.y + vy * shift;
      placed.push({ text, kind: spec.kind, small: !!spec.small, x, y, angle: p.angle, shift, width, height: 2 * Math.max(above, below), cap, sag: p.sag });
      if (p.sag > 4) warnings.push(`[${lang}] "${text}" sits on a bend (the road bows ${p.sag.toFixed(1)} px away from the text)`);
    });
    /* 3. sanity checks on the result: overlaps, and labels that a pin would cover */
    const corners = (l, pad) => { const a = rad(l.angle), c = Math.cos(a), s = Math.sin(a), hw = l.width / 2 + pad, hh = l.height / 2 + pad; return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([u, v]) => [l.x + u * c - v * s, l.y + u * s + v * c]); };
    const overlap = (A, B) => [A, B].every((poly) => poly.every((p, i) => {
      const q = poly[(i + 1) % 4], nx = q[1] - p[1], ny = p[0] - q[0];
      const span = (pts) => pts.map((r) => r[0] * nx + r[1] * ny);
      const a = span(A), b = span(B);
      return Math.max(...a) >= Math.min(...b) && Math.max(...b) >= Math.min(...a);
    }));
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) if (overlap(corners(placed[i], HALO + 2), corners(placed[j], HALO + 2))) warnings.push(`[${lang}] labels overlap: "${placed[i].text}" and "${placed[j].text}"`);
      for (const c of checks) { const box = corners(placed[i], 18), dot = [c.px, c.px, c.px, c.px]; if (overlap(box, dot)) warnings.push(`[${lang}] "${placed[i].text}" is within 18 px of the ${c.key} point`); }
    }
    placedByLang[lang] = placed;

    /* 4. draw, render, export */
    const labelsSvg = placed.map((l) => `<text class="lbl${l.small ? " small" : ""}" transform="translate(${n2(l.x)} ${n2(l.y)}) rotate(${n2(l.angle)})" y="${n2(l.cap / 2)}">${esc(l.text)}</text>`).join("\n");
    const svg = (extra = "") => `<svg id="plate" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n${baseSvg}\n${labelsSvg}\n${extra}</svg>`;
    const shoot = async (markup) => {
      await page.setContent(pageFor(lang, markup));
      await fontsReady(page, lang);
      const png = await page.locator("#plate").screenshot({ type: "png" });
      const info = await sharp(png).metadata();
      if (info.width !== W || info.height !== H) throw new Error(`render is ${info.width} x ${info.height}, expected ${W} x ${H}`);
      return png;
    };

    const png = await shoot(svg());
    const names = { webp1600: `map-${lang}-1600.webp`, webp960: `map-${lang}-960.webp`, jpg960: `map-${lang}-960.jpg` };
    const small = sharp(png).resize(960, 720, { kernel: "lanczos3" });
    await sharp(png).webp({ quality: 82, effort: 6, smartSubsample: true }).toFile(path.join(OUT_IMG, names.webp1600));
    await small.clone().webp({ quality: 82, effort: 6, smartSubsample: true }).toFile(path.join(OUT_IMG, names.webp960));
    await small.clone().jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: "4:4:4" }).toFile(path.join(OUT_IMG, names.jpg960));
    files[lang] = { webp: [names.webp960, names.webp1600], jpg: names.jpg960 };
    written.push(...Object.values(names).map((n) => path.join(OUT_IMG, n)));

    /* check image: the same render with the verification points on top, through the same projection */
    const marks = checks.map((c) => {
      const [x, y] = c.px, r = 9, left = x > W - 190;
      return `<path class="chk-x" d="M${n2(x - r)} ${n2(y)}H${n2(x + r)}M${n2(x)} ${n2(y - r)}V${n2(y + r)}"/><text class="chk" x="${n2(x + (left ? -13 : 13))}" y="${n2(y - 9)}" text-anchor="${left ? "end" : "start"}">${esc(c[lang])}</text>`;
    }).join("\n");
    const checkFile = path.join(OUT_PRIVATE, `check-${lang}.png`);
    await writeFile(checkFile, await shoot(svg(marks)));
    written.push(checkFile);
  }
} finally {
  await browser.close();
}

/* === Projection record for the site ======================================= */
const fetchedDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(meta.fetched));
const record = { width: W, height: H, bounds: BOUNDS, projection: "web-mercator", source: "OpenStreetMap contributors, ODbL", fetched: fetchedDay, files };
const recordFile = at("src/data/map.generated.json");
await writeFile(recordFile, JSON.stringify(record, null, 2) + "\n", "utf8");
written.push(recordFile);

/* === Report =============================================================== */
const R = 6378137, E2 = 0.00669437999014, lat0 = rad(CENTRE_LAT);
const nominal = { width: R * (MX1 - MX0) * Math.cos(lat0), height: R * (MY0 - MY1) * Math.cos(lat0) };       /* the usual Web Mercator ground size */
const k = 1 - E2 * Math.sin(lat0) ** 2;
const wgs84 = { width: ((MX1 - MX0) * R * Math.cos(lat0)) / Math.sqrt(k), height: (rad(BOUNDS.north - BOUNDS.south) * R * (1 - E2)) / k ** 1.5 };
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const sizes = {};
for (const f of written) sizes[path.relative(ROOT, f).replace(/\\/g, "/")] = (await stat(f)).size;

/* where the hotel point falls against the mapped streets, as plain numbers */
const centre = (name) => labelSpecs.find((s) => s.osm === name)?.lines || [];
const hotelPx = checks[0].px;
const metres = (a, b) => Math.round(Math.hypot(((a[0] - b[0]) * wgs84.width) / W, ((a[1] - b[1]) * wgs84.height) / H));
const unproject = ([x, y]) => ({ lat: round(invMercY(MY0 - (y / H) * (MY0 - MY1)), 6), lon: round(((MX0 + (x / W) * (MX1 - MX0)) * 180) / Math.PI, 6) });
const side = (from, to) => (Math.abs(to[1] - from[1]) > Math.abs(to[0] - from[0]) ? (to[1] < from[1] ? "north" : "south") : to[0] > from[0] ? "east" : "west");
const beside = (name) => { const n = nearestOnLines(hotelPx, centre(name)); return n ? { metres: metres(hotelPx, n.point), lies: `${side(hotelPx, n.point)} of the hotel point` } : null; };
let crossing = null;       /* Pratunam: where the Ratchaprarop / Ratchadamri centre line meets Phetchaburi Road */
for (const line of [...centre("Ratchaprarop Road"), ...centre("Ratchadamri Road")]) for (const p of densify(line, 2)) {
  const n = nearestOnLines(p, centre("Phetchaburi Road"));
  if (n && (!crossing || n.d < crossing.d)) crossing = n;
}

console.log(JSON.stringify({
  data: { reused, endpoint: meta.endpoint, fetched: meta.fetched, osmBase: osm.osm3s?.timestamp_osm_base, elements: osm.elements.length, queryBbox: QUERY_BBOX },
  frame: { width: W, height: H, bounds: BOUNDS, aspect: round((MX1 - MX0) / (MY0 - MY1), 6) },
  ground: {
    webMercatorNominal: { widthM: round(nominal.width, 1), heightM: round(nominal.height, 1), metresPerPx: round(nominal.width / W, 4) },
    wgs84Ellipsoid: { widthM: round(wgs84.width, 1), heightM: round(wgs84.height, 1), metresPerPxX: round(wgs84.width / W, 4), metresPerPxY: round(wgs84.height / H, 4) },
  },
  drawn: {
    roads: Object.fromEntries(roadOrder.map((c) => [c, roadLines[c].length])),
    rails: Object.fromEntries(Object.entries(rails).map(([name, lines]) => [name, { lines: lines.length, maxPxFromAMappedTrack: round(railDrift[name], 1) }])),
    buildings: buildings.simple.length + buildings.holed.length, water: water.simple.length + water.holed.length, parks: parks.simple.length + parks.holed.length,
  },
  checks: checks.map((c) => ({ key: c.key, lat: c.lat, lon: c.lon, x: round(c.px[0], 1), y: round(c.px[1], 1), osmNode: c.osmNode, pxFromItsRailLine: c.offLine == null ? undefined : round(c.offLine, 1) })),
  hotel: {
    phetchaburiRoad: beside("Phetchaburi Road"),
    saenSaepCanal: beside("Khlong Saen Saep"),
    pratunamCrossing: crossing && { ...unproject(crossing.point), x: round(crossing.point[0], 1), y: round(crossing.point[1], 1), metres: metres(hotelPx, crossing.point), lies: `${side(hotelPx, crossing.point)} of the hotel point` },
  },
  labels: Object.fromEntries(Object.entries(placedByLang).map(([lang, list]) => [lang, list.map((l) => ({ text: l.text, x: Math.round(l.x), y: Math.round(l.y), angle: round(l.angle, 1), shift: round(l.shift, 1), width: Math.round(l.width), sag: round(l.sag, 1) }))])),
  warnings,
  files: sizes,
}, null, 1));
