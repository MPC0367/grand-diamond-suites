/* Local stand-in for GitHub Pages: serves docs/ under the same base path the
   live site uses, with directory indexes, gzip and the 404 page.
   Usage: node tools/serve.mjs [port]            (default 8321) */
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "docs");
const BASE = "/grand-diamond-suites/";
const PORT = Number(process.argv[2] || process.env.PORT || 8321);

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8", ".webmanifest": "application/manifest+json",
};
const GZIP = new Set([".html", ".css", ".js", ".json", ".svg", ".txt", ".xml"]);

async function send(req, res, file, status = 200) {
  const ext = path.extname(file).toLowerCase();
  let body = await readFile(file);
  const headers = { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": "no-cache" };
  if (GZIP.has(ext) && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
    body = zlib.gzipSync(body);
    headers["Content-Encoding"] = "gzip";
  }
  headers["Content-Length"] = body.length;
  res.writeHead(status, headers);
  res.end(req.method === "HEAD" ? undefined : body);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    let p = decodeURIComponent(url.pathname);
    if (p === "/") { res.writeHead(302, { Location: BASE }); return res.end(); }
    if (p + "/" === BASE) { res.writeHead(301, { Location: BASE }); return res.end(); }
    if (!p.startsWith(BASE)) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found (outside the site base path)"); }
    const rel = p.slice(BASE.length);
    let file = path.resolve(ROOT, rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    let st = null;
    try { st = await stat(file); } catch (e) {}
    if (st && st.isDirectory()) {
      if (!p.endsWith("/")) { res.writeHead(301, { Location: p + "/" + url.search }); return res.end(); }
      file = path.join(file, "index.html");
      try { st = await stat(file); } catch (e) { st = null; }
    }
    if (!st || !st.isFile()) return await send(req, res, path.join(ROOT, "404.html"), 404);
    await send(req, res, file);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Server error: " + err.message);
  }
});

server.listen(PORT, () => console.log(`Serving docs/ at http://localhost:${PORT}${BASE}`));
