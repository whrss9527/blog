#!/usr/bin/env node
// Serves dist/ the way GitHub Pages does: /posts/x answers with posts/x.html,
// /intro answers with intro/index.html, anything else gets 404.html.
//   node scripts/serve.mjs [--port 4173] [--dir dist] [--base /goblog]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const DIR = path.resolve(ROOT, opt('--dir', 'dist'));
const PORT = Number(opt('--port', process.env.PORT || 4173));
const BASE = String(opt('--base', '')).replace(/\/+$/, '');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.webp': 'image/webp',
};

function resolve(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch { return null; }
  const file = path.join(DIR, p);
  if (!file.startsWith(DIR)) return null;
  const candidates = [file, `${file}.html`, path.join(file, 'index.html')];
  for (const c of candidates) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (BASE) {
    if (!url.pathname.startsWith(`${BASE}/`) && url.pathname !== BASE) { res.writeHead(404); return res.end(); }
    url.pathname = url.pathname.slice(BASE.length) || '/';
  }
  if (url.pathname !== '/' && !url.pathname.endsWith('/') && fs.existsSync(path.join(DIR, decodeURIComponent(url.pathname), 'index.html'))) {
    res.writeHead(301, { Location: `${BASE}${url.pathname}/${url.search}` });
    return res.end();
  }
  const file = resolve(url.pathname);
  const status = file ? 200 : 404;
  const target = file || path.join(DIR, '404.html');
  res.writeHead(status, { 'Content-Type': TYPES[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(target).pipe(res);
}).listen(PORT, () => console.log(`http://localhost:${PORT}${BASE}/  (${path.relative(ROOT, DIR)})`));
