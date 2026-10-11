/* One-off: turns the photograph catalogue into a first draft of
   src/data/media.mjs. The draft is then edited by hand, so this script is
   kept only as a record of where the wording started.
   Usage: node tools/make-media.mjs > _private/research/media-draft.mjs */
import { readFile } from "node:fs/promises";

const cat = JSON.parse(await readFile("_private/research/catalogue.json", "utf8")).images;
const list = JSON.parse(await readFile("_private/review/list.json", "utf8"));
const byId = new Map(cat.map((c) => [c.id, c]));
const src = new Map(list.map((l) => [l.id, l]));

/* catalogue number -> [site id, suite slug or null, gallery group] */
const MAP = [
  ["31", "luxury-suite-bed-sofa-city-window", "luxury-suite", "suites"],
  ["32", "luxury-suite-room-from-entrance", "luxury-suite", "suites"],
  ["33", "luxury-suite-sofa-and-bed", "luxury-suite", "suites"],
  ["34", "luxury-suite-bed-and-television", "luxury-suite", "suites"],
  ["30", "luxury-suite-bathroom", "luxury-suite", "suites"],
  ["26", "junior-suite-living-room", "junior-suite", "suites"],
  ["27", "junior-suite-bedroom-twin-beds", "junior-suite", "suites"],
  ["29", "junior-suite-kitchenette-dining", "junior-suite", "suites"],
  ["28", "junior-suite-bathroom", "junior-suite", "suites"],
  ["22", "family-suite-three-beds-city-windows", "family-suite", "suites"],
  ["25", "family-suite-beds-and-desk", "family-suite", "suites"],
  ["24", "family-suite-king-bed-wardrobes", "family-suite", "suites"],
  ["23", "family-suite-king-bed-and-television", "family-suite", "suites"],
  ["21", "family-suite-bathroom", "family-suite", "suites"],
  ["11", "deluxe-suite-living-dining", "deluxe-suite", "suites"],
  ["14", "deluxe-suite-bedroom-corner-windows", "deluxe-suite", "suites"],
  ["13", "deluxe-suite-bedroom-king-bed", "deluxe-suite", "suites"],
  ["15", "deluxe-suite-bathtub-city-view", "deluxe-suite", "suites"],
  ["12", "deluxe-suite-bathroom-shower", "deluxe-suite", "suites"],
  ["17", "executive-suite-living-dining-windows", "executive-suite", "suites"],
  ["18", "executive-suite-living-room-kitchenette", "executive-suite", "suites"],
  ["19", "executive-suite-bedroom-king-balcony", "executive-suite", "suites"],
  ["20", "executive-suite-bedroom-twin-beds", "executive-suite", "suites"],
  ["16", "executive-suite-bathroom", "executive-suite", "suites"],
  ["37", "penthouse-suite-terrace-skyline", "penthouse-suite", "suites"],
  ["35", "penthouse-suite-living-room-double-height", "penthouse-suite", "suites"],
  ["38", "penthouse-suite-terrace-whirlpool", "penthouse-suite", "suites"],
  ["40", "penthouse-suite-upper-landing", "penthouse-suite", "suites"],
  ["36", "penthouse-suite-bedroom", "penthouse-suite", "suites"],
  ["39", "penthouse-suite-bathroom", "penthouse-suite", "suites"],
  ["04", "hotel-pool-and-tower", null, "facilities"],
  ["49", "hotel-pool-loungers", null, "facilities"],
  ["07", "hotel-fitness-centre", null, "facilities"],
  ["47", "hotel-meeting-room", null, "facilities"],
  ["50", "ploy-restaurant-dining-room", null, "dining"],
  ["51", "ploy-restaurant-breakfast-poolside", null, "dining"],
  ["02", "hotel-entrance", null, "hotel"],
  ["42", "hotel-towers-at-night", null, "hotel"],
];

const q = (s) => JSON.stringify(s);
let out = "";
for (const [n, id, suite, group] of MAP) {
  const c = byId.get(n), s = src.get(n);
  out += `  {\n    id: ${q(id)}, original: ${q(s.original)}, suite: ${q(suite)}, group: ${q(group)},\n`;
  out += `    focal: [${c.focalX.toFixed(2)}, ${c.focalY.toFixed(2)}],\n`;
  out += `    caption: { en: ${q(c.captionEn)}, th: ${q(c.captionTh)} },\n`;
  out += `    alt: { en: ${q(c.altEn)}, th: ${q(c.altTh)} },\n`;
  out += `    // ${n} ${s.width}x${s.height} | ${c.subject} | beds: ${c.beds} | view: ${c.view}\n`;
  out += `    // quality: ${c.exposure}; ${c.colourCast}; ${c.sharpness}; ${c.verticals}; ${c.qualityIssues.join("; ") || "no issues"}\n`;
  out += `    // category: ${c.categoryEvidence}\n`;
  out += `    // crops 16:9 ${c.crop16x9} | 4:5 ${c.crop4x5} | hero ${c.heroPotential} | ai: ${c.aiOrStockSuspicion} | same: ${c.sameSceneAs}\n`;
  out += `  },\n`;
}
console.log(out);
const used = new Set(MAP.map((m) => m[0]));
console.log("// NOT USED: " + cat.filter((c) => !used.has(c.id)).map((c) => `${c.id} (${c.subject}; ai: ${c.aiOrStockSuspicion}; same: ${c.sameSceneAs}; ${c.categoryEvidence.slice(0, 120)})`).join("\n// "));
