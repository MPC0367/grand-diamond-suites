/* Copies the results of the "understand" workflow out of its journal into
   _private/research so they can be read and kept with the project.
   Usage: node tools/dump-research.mjs <path to journal.jsonl> */
import { readFile, writeFile, mkdir } from "node:fs/promises";

const journal = process.argv[2];
const lines = (await readFile(journal, "utf8")).split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const results = lines.filter((l) => l.type === "result").map((l) => l.result);
await mkdir("_private/research", { recursive: true });

const images = results.filter((r) => r && r.images).flatMap((r) => r.images).sort((a, b) => a.id.localeCompare(b.id));
const groupNotes = results.filter((r) => r && r.images).map((r) => ({ ids: r.images.map((i) => i.id).join(","), notes: r.groupNotes }));
await writeFile("_private/research/catalogue.json", JSON.stringify({ images, groupNotes }, null, 1), "utf8");

let txt = "";
for (const i of images) {
  txt += `## ${i.id}  ${i.subject}  hero ${i.heroPotential}  focal ${i.focalX.toFixed(2)},${i.focalY.toFixed(2)}\n`;
  txt += `seen: ${i.visible}\nbeds: ${i.beds} | view: ${i.view} | people: ${i.people} | signage: ${i.signage}\n`;
  txt += `category: ${i.categoryEvidence}\nsame as: ${i.sameSceneAs} | ai/stock: ${i.aiOrStockSuspicion}\n`;
  txt += `quality: exposure ${i.exposure}; cast ${i.colourCast}; ${i.sharpness}; verticals ${i.verticals}; issues: ${i.qualityIssues.join("; ") || "none"}\n`;
  txt += `crops: 16:9 ${i.crop16x9} | 4:3 ${i.crop4x3} | 1:1 ${i.crop1x1} | 4:5 ${i.crop4x5}\n`;
  txt += `cap EN: ${i.captionEn}\ncap TH: ${i.captionTh}\nalt EN: ${i.altEn}\nalt TH: ${i.altTh}\n\n`;
}
txt += "# Group notes\n" + groupNotes.map((g) => `[${g.ids}] ${g.notes}`).join("\n\n") + "\n";
await writeFile("_private/research/catalogue.txt", txt, "utf8");

const facts = results.filter((r) => r && r.facts);
const checks = results.filter((r) => r && r.checked).flatMap((r) => r.checked);
const byKey = new Map(checks.map((c) => [c.key, c]));
let ftxt = "";
for (const r of facts) {
  for (const f of r.facts) {
    const v = byKey.get(f.key);
    ftxt += `## ${f.key}  [${f.sourceKind}, ${f.confidence}]${v ? (v.holds ? "  VERIFIED" : "  DISPUTED") : "  (not yet verified)"}\n`;
    ftxt += `claim: ${f.claim}\nvalue: ${f.value}\nsource: ${f.sourceUrl}\nquote: ${f.sourceQuote}\ncaveat: ${f.caveat}\n`;
    if (v && v.correction && v.correction !== "none") ftxt += `check: ${v.correction}\n`;
    ftxt += "\n";
  }
  if (r.notFound && r.notFound.length) ftxt += "NOT FOUND:\n" + r.notFound.map((n) => " - " + n).join("\n") + "\n\n";
}
await writeFile("_private/research/facts.txt", ftxt, "utf8");
await writeFile("_private/research/facts.json", JSON.stringify({ facts, checks }, null, 1), "utf8");
console.log(images.length, "images;", facts.reduce((n, r) => n + r.facts.length, 0), "facts;", checks.length, "checks");
