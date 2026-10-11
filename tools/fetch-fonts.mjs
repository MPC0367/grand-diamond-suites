/* Downloads the web fonts once so the site can serve them itself.
   All four families are published under the SIL Open Font License.
   Usage: node tools/fetch-fonts.mjs */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("src/assets/fonts");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
/* Newsreader is fetched as two fixed display cuts (optical size 72, weight 400,
   upright and italic): about 22 KB each, against 130 KB or more for the variable file. */
const CSS = "https://fonts.googleapis.com/css2?family=Manrope:wght@300..800&family=Newsreader:ital,opsz,wght@0,72,400;1,72,400&family=Noto+Sans+Thai:wght@300..700&family=Noto+Serif+Thai:wght@300..700&display=swap";

/* which subsets each family needs on this site */
const WANT = {
  "Manrope": ["latin"],
  "Newsreader": ["latin"],
  "Noto Sans Thai": ["thai"],
  "Noto Serif Thai": ["thai"],
};

const css = await (await fetch(CSS, { headers: { "user-agent": UA } })).text();
await mkdir(OUT, { recursive: true });

const blocks = [...css.matchAll(/\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g)];
const faces = [];
for (const [, subset, body] of blocks) {
  const family = body.match(/font-family:\s*'([^']+)'/)[1];
  if (!WANT[family] || !WANT[family].includes(subset)) continue;
  const style = body.match(/font-style:\s*(\w+)/)[1];
  const weight = body.match(/font-weight:\s*([\d ]+)/)[1].trim();
  const url = body.match(/url\((https:[^)]+\.woff2)\)/)[1];
  const range = body.match(/unicode-range:\s*([^;]+);/)[1].trim();
  const file = `${family.toLowerCase().replace(/\s+/g, "-")}-${subset}${style === "italic" ? "-italic" : ""}.woff2`;
  const buf = Buffer.from(await (await fetch(url, { headers: { "user-agent": UA } })).arrayBuffer());
  await writeFile(path.join(OUT, file), buf);
  faces.push({ family, style, weight, file, range, bytes: buf.length });
  console.log(file.padEnd(38), String(buf.length).padStart(7), "bytes  weight", weight);
}

await writeFile(path.join(OUT, "faces.json"), JSON.stringify(faces, null, 1), "utf8");
console.log(faces.length, "font files");
