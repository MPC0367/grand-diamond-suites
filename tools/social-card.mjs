/* Makes the 1200 x 630 sharing image from the opening photograph (the hotel's
   own picture of a Luxury Suite). It is referenced only when the site is built
   with a real origin, so the preview never advertises it.
   Usage: node tools/social-card.mjs */
import sharp from "sharp";
import path from "node:path";
import { media } from "../src/data/media.mjs";

const m = media.find((x) => x.id === "luxury-suite-bed-sofa-city-window");
const out = path.resolve("src/assets/img/social-card.jpg");
const info = await sharp(path.resolve("_private/originals", m.original))
  .rotate()
  .resize({ width: 1200, height: 630, fit: "cover", position: "centre" })
  .linear(1.03, -(128 * 0.03))
  .sharpen({ sigma: 0.6, m1: 0.4, m2: 1.4 })
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile(out);
console.log("social card", info.width + "x" + info.height, Math.round(info.size / 1024) + " KB");
