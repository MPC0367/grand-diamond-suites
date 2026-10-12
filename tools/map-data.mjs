/* Fetches, once, the OpenStreetMap extracts the street map is drawn from, and saves them in _private/map/parts.
   Later runs read the saved files and ask nothing of anyone. The area is asked for in several small
   requests, one after another, because one large request is more than the public servers will answer.

     roads, rail, water, green, areas, places   main roads, railways and stations, water, parks and place names for central Bangkok
     streets-*       streets and lanes, in four quarters
     buildings-*     building outlines for the middle of the area, where the map can be zoomed in closely

   Usage: node tools/map-data.mjs
   Map data: OpenStreetMap contributors, Open Database License. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FRAME, DETAIL } from "./map-frame.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "_private/map/parts");
/* the public server is often busy and answers 504 at once: asking again a little later is what it expects */
const ENDPOINTS = ["https://overpass-api.de/api/interpreter"];
const USER_AGENT = "grand-diamond-concept-map/2.0 (static render; a few requests, saved and reused)";
const box = (b, pad = 0) => [b.south - pad, b.west - pad, b.north + pad, b.east + pad].map((n) => n.toFixed(4)).join(",");
/* the four quarters of a box, each a little larger than a quarter so that nothing falls between them */
const quarters = (b, pad) => {
  const mx = (b.west + b.east) / 2, my = (b.south + b.north) / 2;
  return {
    nw: box({ west: b.west - pad, east: mx, south: my, north: b.north + pad }, 0.0005), ne: box({ west: mx, east: b.east + pad, south: my, north: b.north + pad }, 0.0005),
    sw: box({ west: b.west - pad, east: mx, south: b.south - pad, north: my }, 0.0005), se: box({ west: mx, east: b.east + pad, south: b.south - pad, north: my }, 0.0005),
  };
};
const head = (bbox) => `[out:json][timeout:90][bbox:${bbox}];`;

const WIDE = box(FRAME, 0.004);
const QUERIES = {
  roads: `${head(WIDE)}
way["highway"~"^(motorway|trunk|primary|secondary|tertiary)(_link)?$"];
out tags geom qt;`,
  rail: `${head(WIDE)}
way["railway"~"^(rail|light_rail|subway|monorail)$"];
out tags geom qt;
(
  node["railway"="station"];
  node["public_transport"="station"];
);
out body qt;
relation["route"~"^(train|light_rail|subway|monorail)$"];
out body qt;`,
  water: `${head(WIDE)}
(
  way["waterway"~"^(river|canal|stream|drain|ditch)$"];
  way["natural"="water"];
  way["waterway"="riverbank"];
);
out tags geom qt;`,
  green: `${head(WIDE)}
(
  way["leisure"="park"];
  way["landuse"="grass"];
);
out tags geom qt;`,
  /* water and parks mapped as relations, with the whole of their outlines so that every ring closes */
  areas: `${head(WIDE)}
(
  relation["natural"="water"];
  relation["waterway"="riverbank"];
  relation["leisure"="park"];
  relation["landuse"="grass"];
);
out body geom qt;`,
  places: `${head(WIDE)}
node["place"~"^(suburb|quarter|neighbourhood)$"];
out body qt;`,
};
for (const [q, bbox] of Object.entries(quarters(FRAME, 0.004))) QUERIES["streets-" + q] = `${head(bbox)}
way["highway"~"^(residential|unclassified|living_street|pedestrian|service)$"];
out tags geom qt;`;
for (const [q, bbox] of Object.entries(quarters(DETAIL, 0.001))) QUERIES["buildings-" + q] = `${head(bbox)}
way["building"]["location"!="underground"];
out ids geom qt;
relation["building"]["location"!="underground"];
out skel geom qt;`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await mkdir(DIR, { recursive: true });
for (const [name, query] of Object.entries(QUERIES)) {
  const file = path.join(DIR, name + ".json");
  try { const have = JSON.parse(await readFile(file, "utf8")); console.log(`${name}: saved extract reused, ${have.elements.length} elements`); continue; } catch { /* not fetched yet */ }
  let done = false, lastError;
  for (let attempt = 0; attempt < 12 && !done; attempt++) {
    const endpoint = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8", "user-agent": USER_AGENT, accept: "application/json" },
        body: "data=" + encodeURIComponent(query),
        signal: AbortSignal.timeout(200000),
      });
      const raw = await res.text();
      if (!res.ok) throw new Error(`${endpoint} answered ${res.status}: ${raw.replace(/\s+/g, " ").slice(0, 160)}`);
      const osm = JSON.parse(raw);
      if (!Array.isArray(osm.elements) || !osm.elements.length) throw new Error(`${endpoint} returned no elements` + (osm.remark ? ": " + osm.remark : ""));
      if (osm.remark) throw new Error(`${endpoint} gave up part of the way: ${osm.remark}`);
      await writeFile(file, raw, "utf8");
      await writeFile(path.join(DIR, name + ".meta.json"), JSON.stringify({ endpoint, fetched: new Date().toISOString(), userAgent: USER_AGENT, elements: osm.elements.length, osmBase: osm.osm3s?.timestamp_osm_base, query }, null, 1), "utf8");
      console.log(`${name}: fetched ${osm.elements.length} elements, ${(raw.length / 1048576).toFixed(1)} MB, from ${endpoint}`);
      done = true;
    } catch (e) { lastError = e; console.warn(`${name}: attempt ${attempt + 1} failed:`, String(e).slice(0, 260)); await wait(20000); }
  }
  if (!done) throw lastError;
  await wait(4000);
}
