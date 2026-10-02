#!/usr/bin/env node
// Builds the whole blog into dist/ from the content repository.
//
//   node scripts/build.mjs                    blog-data next to this repo (or $BLOG_DATA)
//   node scripts/build.mjs --data ../blog-data --out dist
//   node scripts/build.mjs --preview          also writes dist/preview.html: the whole
//                                             site in one file, for a quick look anywhere
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadContent } from './lib/content.mjs';
import { plainText } from './lib/markdown.mjs';
import { atomFeed, sitemap, manifest, serviceWorker } from './lib/extras.mjs';
import { coverSVG } from './lib/covers.mjs';
import * as R from '../src/render.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'blog.config.json'), 'utf8'));
const DATA = path.resolve(ROOT, opt('--data', process.env.BLOG_DATA || config.dataDir));
const OUT = path.resolve(ROOT, opt('--out', 'dist'));
const PREVIEW = args.includes('--preview');
// Where the site lives below its host: '' on its own domain, '/blog' while it is
// a GitHub Pages project site (the deploy workflow passes what Pages reports).
const BASE = String(opt('--base', process.env.BASE_PATH || '')).replace(/\/+$/, '').replace(/^(?=[^/])/, '/');
const NOW = process.env.SOURCE_DATE_EPOCH ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000) : new Date();

const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);
const write = (rel, body) => {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
};

// ---------- content ----------
const content = loadContent(DATA);
// Every post gets drawn cover art; scripts/covers.json says what to draw.
const COVERS = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/covers.json'), 'utf8'));
const coverPath = slug => `/covers/posts/${encodeURIComponent(slug)}.svg`;
const posts = content.posts.map((p, n) => ({ ...p, n, cover: coverPath(p.slug) }));
const since = posts.reduce((min, p) => (p.created && p.created < min ? p.created : min), posts[0]?.created || NOW.toISOString());
const strip = ({ html, toc, ...meta }) => meta;
const site = {
  config: {
    name: config.name, host: config.host.replace(/\/$/, ''), description: config.description, author: config.author,
    email: config.email, github: config.github, website: config.website, nav: config.nav, giscus: config.giscus, analytics: config.analytics,
    base: BASE,
  },
  generated: NOW.toISOString(),
  since,
  posts: posts.map(strip),
  pages: content.pages.map(({ id, title }) => ({ id, title })),
  tags: content.tags,
  categories: content.categories,
  books: content.books,
};
const postBody = p => ({ html: p.html, toc: p.toc });

// ---------- assets ----------
// The browser bundle is render.js followed by app.js, as one module.
const bundle = ['src/render.js', 'src/app.js']
  .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^export\s+/gm, ''))
  .join('\n');
const css = fs.readFileSync(path.join(ROOT, 'src/style.css'), 'utf8');
const build = hash(bundle + css + JSON.stringify(site) + posts.map(p => p.html).join(''));
const assets = { js: `/assets/app.${hash(bundle)}.js`, css: `/assets/style.${hash(css)}.css` };

// dist/ is wiped first; refuse anything that would take the code or the content with it.
const inside = (child, parent) => !path.relative(parent, child).startsWith('..') && !path.isAbsolute(path.relative(parent, child));
if (inside(ROOT, OUT) || inside(DATA, OUT) || inside(OUT, DATA) || OUT === path.parse(OUT).root) {
  throw new Error(`输出目录 ${OUT} 会覆盖代码或内容，换一个目录（默认是 dist/）。`);
}
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(ROOT, 'public'), OUT, { recursive: true });
if (fs.existsSync(content.coversDir)) fs.cpSync(content.coversDir, path.join(OUT, 'covers'), { recursive: true });
write(assets.js, bundle);
const svgs = new Map(posts.map(p => [p.cover, coverSVG(p, COVERS[p.slug] || {})]));
for (const p of posts) write(`covers/posts/${p.slug}.svg`, svgs.get(p.cover));
write(assets.css, css);

// ---------- documents ----------
const ctx = { link: p => BASE + p, asset: p => BASE + p };
const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400..800&family=JetBrains+Mono:wght@400;600&display=swap';
const HEAD_SCRIPT = `(function(){var d=document.documentElement;d.classList.remove('no-js');d.classList.add('js');try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')d.setAttribute('data-theme',t);d.dataset.themeChoice=t||'auto'}catch(e){d.dataset.themeChoice='auto'}setTimeout(function(){if(!d.classList.contains('ready'))d.classList.add('no-reveal')},3500)})();`;

function jsonLd(view, url) {
  const host = site.config.host;
  if (view.article) {
    const p = view.article;
    return {
      '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.description || undefined,
      datePublished: p.created, dateModified: p.updated, mainEntityOfPage: url, url, image: p.image || `${host}/logo.png`,
      author: { '@type': 'Person', name: site.config.author, url: `${host}/` },
      publisher: { '@type': 'Person', name: site.config.author, url: `${host}/` },
      keywords: p.tags.map(t => t.name).join(', ') || undefined, wordCount: p.words, inLanguage: config.lang,
    };
  }
  return { '@context': 'https://schema.org', '@type': 'Blog', name: site.config.name, description: site.config.description, url: `${host}/`, inLanguage: config.lang };
}

function documentHTML(view, pathname, { inline = null } = {}) {
  const url = site.config.host + (pathname === '/' ? '/' : pathname);
  const image = view.image || `${site.config.host}/logo.png`;
  const e = R.esc;
  const styles = inline ? `<style>${inline.css}</style>` : `<link rel="stylesheet" href="${BASE}${assets.css}">`;
  const scripts = inline
    ? `<script>${inline.data}</script><script type="module">${inline.js}</script>`
    : `<script type="module" src="${BASE}${assets.js}"></script>`;
  const c = inline ? { link: p => `#${p}`, asset: p => inline.assets[p] || p } : ctx;
  return `<!doctype html>
<html lang="${e(config.lang)}" class="no-js" data-build="${build}"${!inline && BASE ? ` data-base="${e(BASE)}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${e(view.title)}</title>
<meta name="description" content="${e(view.description)}">
<meta name="generator" content="blog ${e(JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version)}">
<meta name="theme-color" content="#e7ecf2">
${inline ? '' : `<link rel="canonical" href="${e(url)}">`}
<meta property="og:type" content="${view.article ? 'article' : 'website'}">
<meta property="og:site_name" content="${e(site.config.name)}">
<meta property="og:title" content="${e(view.title)}">
<meta property="og:description" content="${e(view.description)}">
<meta property="og:url" content="${e(url)}">
<meta property="og:image" content="${e(image)}">
<meta name="twitter:card" content="${view.image ? 'summary_large_image' : 'summary'}">
${view.article ? `<meta property="article:published_time" content="${e(view.article.created)}">\n<meta property="article:modified_time" content="${e(view.article.updated)}">` : ''}
${inline ? `<link rel="icon" href="${e(inline.assets['/logo.png'])}">` : `<link rel="alternate" type="application/atom+xml" title="${e(site.config.name)}" href="${BASE}/feed.xml">
<link rel="icon" href="${BASE}/favicon.ico">
<link rel="apple-touch-icon" href="${BASE}/icons/apple-touch-icon.png">`}
${inline ? '' : `<link rel="manifest" href="${BASE}/manifest.webmanifest">`}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
${styles}
<script>${HEAD_SCRIPT}</script>
${inline ? '' : `<script type="application/ld+json">${JSON.stringify(jsonLd(view, url)).replace(/</g, '\\u003c')}</script>`}
</head>
<body class="${e(view.bodyClass || '')}">
${R.backdropHTML()}
${R.headerHTML(site, c)}
<main id="main" tabindex="-1">${inline ? '' : view.main}</main>
${R.footerHTML(site, c)}
${R.paletteHTML()}
${scripts}
</body>
</html>
`;
}

function page(file, pathname, view) {
  write(file, documentHTML(view, pathname));
}

// ---------- pages ----------
const q = new URLSearchParams();
page('index.html', '/', R.homeView(site, ctx, q));
for (const p of posts) {
  const meta = site.posts[p.n];
  page(`posts/${p.slug}.html`, R.postPath(meta), R.postView(site, meta, postBody(p), ctx, NOW));
  write(`data/posts/${p.slug}.json`, JSON.stringify(postBody(p)));
}
for (const pg of content.pages) {
  page(`pages/${pg.id}.html`, `/pages/${pg.id}`, R.pageView(site, pg, pg, ctx));
  write(`data/pages/${pg.id}.json`, JSON.stringify({ html: pg.html, toc: pg.toc }));
}
page('archive.html', '/archive', R.archiveView(site, ctx));
page('tags.html', '/tags', R.tagsView(site, ctx));
page('reading.html', '/reading', R.readingView(site, ctx, q));
page('stats.html', '/stats', R.statsView(site, ctx));
page('random.html', '/random', R.randomView(site, ctx));
page('offline.html', '/offline', R.offlineView(site, ctx));
page('404.html', '/404', R.notFoundView(site, ctx));

const searchIndex = Object.fromEntries(posts.map(p => [p.slug, plainText(p.html)]));
write('data/site.json', JSON.stringify(site));
// What this build was made from; the scheduled deploy compares it with the live site.
const gitHead = dir => { try { return execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; } };
write('data/version.json', JSON.stringify({ build, site: process.env.GITHUB_SHA || gitHead(ROOT), content: gitHead(DATA), generated: site.generated }));
write('data/search.json', JSON.stringify(searchIndex));

// ---------- feeds and friends ----------
const feed = atomFeed(site, posts, NOW);
write('feed.xml', feed);
write('feed', feed); // the old address, kept for existing subscribers
write('sitemap.xml', sitemap(site, NOW));
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${site.config.host}/sitemap.xml\n`);
write('manifest.webmanifest', manifest(site, BASE));
write('sw.js', serviceWorker(build, BASE, ['/', '/offline', assets.css, assets.js, '/logo.png', '/data/site.json'].map(p => BASE + p)));
write('.nojekyll', '');

// ---------- the one-file preview ----------
if (PREVIEW) {
  const mime = f => ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon' }[path.extname(f).toLowerCase()] || 'application/octet-stream');
  const dataURI = file => `data:${mime(file)};base64,${fs.readFileSync(file).toString('base64')}`;
  const inlineAssets = { '/logo.png': dataURI(path.join(ROOT, 'public/logo.png')) };
  for (const [url, svg] of svgs) inlineAssets[url] = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  for (const b of site.books) {
    const f = b.cover && path.join(DATA, b.cover);
    if (f && fs.existsSync(f)) inlineAssets[b.cover] = dataURI(f);
  }
  const contentMap = {};
  for (const p of posts) contentMap[`posts:${p.slug}`] = postBody(p);
  for (const pg of content.pages) contentMap[`pages:${pg.id}`] = { html: pg.html, toc: pg.toc };
  const data = `window.__PREVIEW__=true;window.__SITE__=${JSON.stringify({ ...site, config: { ...site.config, base: '' } })};window.__CONTENT__=${JSON.stringify(contentMap)};window.__SEARCH__=${JSON.stringify(searchIndex)};window.__ASSETS__=${JSON.stringify(inlineAssets)};`;
  const view = R.homeView(site, ctx, q);
  const html = documentHTML(view, '/', { inline: { css, js: bundle.replace(/<\/script/gi, '<\\/script'), data: data.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--'), assets: inlineAssets } });
  write('preview.html', html);
}

const count = fs.readdirSync(OUT, { recursive: true }).length;
console.log(`已生成 ${path.relative(ROOT, OUT) || '.'}/${BASE ? `（基础路径 ${BASE}）` : ''}：${posts.length} 篇文章，${content.pages.length} 个页面，共 ${count} 个文件（build ${build}）${PREVIEW ? '，含 preview.html' : ''}`);
