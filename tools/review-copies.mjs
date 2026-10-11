/* Makes light review copies of every kept original (for looking at, never
   for the site) and numbered contact sheets.
   Usage: node tools/review-copies.mjs */
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = path.resolve("_private/originals");
const OUT = path.resolve("_private/review");
await mkdir(OUT, { recursive: true });
const { items } = JSON.parse(await readFile(path.join(SRC, "index.json"), "utf8"));
const kept = items.filter((r) => r.file);

const list = [];
let n = 0;
for (const r of kept) {
  n++;
  const id = String(n).padStart(2, "0");
  const out = `${id}.jpg`;
  await sharp(path.join(SRC, r.file))
    .flatten({ background: "#ffffff" })
    .resize({ width: 1500, height: 1500, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 84 })
    .toFile(path.join(OUT, out));
  list.push({ id, review: out, original: r.file, width: r.width, height: r.height, bytes: r.bytes, format: r.format, sourceUrl: r.sourceUrl, pages: r.pages, placements: r.placements });
}
await writeFile(path.join(OUT, "list.json"), JSON.stringify(list, null, 1), "utf8");

/* contact sheets: 3 x 3, each tile 620 x 440 with a label strip */
const TW = 620, TH = 414, LH = 34, COLS = 3, ROWS = 3, GAP = 14;
for (let s = 0; s * COLS * ROWS < list.length; s++) {
  const chunk = list.slice(s * COLS * ROWS, (s + 1) * COLS * ROWS);
  const W = COLS * TW + (COLS + 1) * GAP, H = ROWS * (TH + LH) + (ROWS + 1) * GAP;
  const layers = [];
  for (let i = 0; i < chunk.length; i++) {
    const c = chunk[i];
    const x = GAP + (i % COLS) * (TW + GAP), y = GAP + Math.floor(i / COLS) * (TH + LH + GAP);
    const tile = await sharp(path.join(OUT, c.review)).resize({ width: TW, height: TH, fit: "contain", background: "#1b1b1b" }).toBuffer();
    layers.push({ input: tile, left: x, top: y });
    const label = `${c.id}  ${c.original.replace(/&/g, "and")}  ${c.width}x${c.height}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${LH}"><rect width="100%" height="100%" fill="#ffffff"/><text x="8" y="23" font-family="Segoe UI, Arial" font-size="17" fill="#111">${label.slice(0, 66)}</text></svg>`;
    layers.push({ input: Buffer.from(svg), left: x, top: y + TH });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: "#d9d9d9" } }).composite(layers).jpeg({ quality: 82 }).toFile(path.join(OUT, `sheet-${s + 1}.jpg`));
  console.log(`sheet-${s + 1}.jpg`, chunk.map((c) => c.id).join(" "));
}
console.log(list.length, "review copies");
