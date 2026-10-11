/* Adds the non-photograph assets to the private asset manifest: the hotel's
   own logo files and the pieces cut from them, the sharing image, and the
   map plates. tools/images.mjs writes the photographs; run this after it.
   Usage: node tools/manifest-extras.mjs */
import { readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const file = "_private/asset-manifest.json";
const manifest = JSON.parse(await readFile(file, "utf8"));
const info = async (p) => {
  const s = await stat(p); let dim = null;
  try { const m = await sharp(p).metadata(); dim = `${m.width}x${m.height}`; } catch (e) {}
  return { file: p, bytes: s.size, size: dim };
};
/* captions and descriptions follow the current data, without re-encoding any photograph */
const { mediaById } = await import("../src/data/media.mjs");
for (const u of manifest.used) { const m = mediaById.get(u.id); if (m) { u.subject = m.caption.en; u.caption = m.caption; u.alt = m.alt; } }
const A = "src/assets/img/";
manifest.identityAndOther = [
  {
    asset: "Hotel logo, gold", source: "_private/originals/GD_Gold-removebg-preview.png (the hotel's own file, from its website)",
    treatment: "Empty margin trimmed. Nothing redrawn. A 320 px WebP copy for the header and menu.",
    files: [await info(A + "logo-gold.png"), await info(A + "logo-gold.webp")],
  },
  {
    asset: "Hotel logo, light", source: "_private/originals/Grand_Diamond_Logo_grey-removebg-preview-21f68d27.png (the hotel's own file, from its website)",
    treatment: "Empty margin trimmed. Nothing redrawn. A 380 px WebP copy for the footer.",
    files: [await info(A + "logo-light.png"), await info(A + "logo-light.webp")],
  },
  {
    asset: "Browser-tab icon", source: "The diamond mark cut from the gold logo above",
    treatment: "Cropped to the mark and centred on a transparent 64 px square. Not redrawn.",
    files: [await info(A + "favicon.png")],
  },
  {
    asset: "Sharing image (used only in a production build)", source: "_private/originals/Grand-Diamond-Suites-Luxury-Suite-2.JPG, the opening photograph",
    treatment: "Centre crop to 1200 x 630, contrast x1.03, light sharpening.",
    files: [await info(A + "social-card.jpg")],
  },
  {
    asset: "Street map plates, English and Thai", source: "OpenStreetMap data (c) OpenStreetMap contributors, ODbL, fetched 2026-10-08 and drawn by tools/map.mjs",
    treatment: "This site's own drawing. Credit printed on every plate.",
    files: [await info(A + "map-en-1600.webp"), await info(A + "map-en-960.webp"), await info(A + "map-en-960.jpg"), await info(A + "map-th-1600.webp"), await info(A + "map-th-960.webp"), await info(A + "map-th-960.jpg")],
  },
];
manifest.photographyToRequest = [
  "Larger originals for junior-suite-bedroom-king-city-view (the hotel's file is 1024 px wide) and hotel-towers-at-night (1080 px wide).",
  "A straight photograph of Ploy Restaurant to replace the excluded Ploy-Restaurant.png, which carries an image generator's mark.",
  "A lobby or front-desk photograph: none exists on the hotel's site.",
  "A Deluxe Suite bathroom the hotel confirms (the second bathroom picture contradicts its one-bathroom list and is left out).",
  "A Family Suite picture showing the sofa the hotel lists, or confirmation that the list should read armchair.",
  "Dinner or evening photographs of the restaurant, once dinner hours are confirmed.",
];
manifest.summary = {
  photographsUsed: manifest.used.length,
  colourCorrected: manifest.used.filter((u) => u.treatment === "colour corrected").map((u) => u.id),
  cropped: manifest.used.filter((u) => /cropped/.test(u.treatment) || u.steps.some((x) => /cropped/.test(x))).map((u) => u.id),
  standardPassOnly: manifest.used.filter((u) => u.treatment === "standard pass").length,
  enlarged: "none: no derivative is wider than its source",
};
await writeFile(file, JSON.stringify(manifest, null, 1), "utf8");
console.log("manifest extras written:", manifest.identityAndOther.length, "asset groups;", manifest.summary.colourCorrected.length, "photographs colour corrected,", manifest.summary.cropped.length, "cropped");
