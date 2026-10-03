// Run with `npm test`. Builds the fixture content in test/fixtures/blog-data
// and checks the rules the old server guaranteed: addresses, anchors, feed
// order, markdown compatibility, and that nothing private leaks into the site.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { renderMarkdown, slugify, sanitizeHTML } from '../scripts/lib/markdown.mjs';
import { cleanSlug, parseFrontMatter } from '../scripts/lib/content.mjs';
import { atomFeed } from '../scripts/lib/extras.mjs';
import { matchRoute, findPost, filterPosts, postPath } from '../src/render.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = path.join(ROOT, 'test/fixtures/blog-data');
let OUT;
const read = rel => fs.readFileSync(path.join(OUT, rel), 'utf8');

before(() => {
  OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-build-'));
  execFileSync(process.execPath, ['scripts/build.mjs', '--data', FIXTURE, '--out', OUT, '--preview'], { cwd: ROOT, env: { ...process.env, SOURCE_DATE_EPOCH: '1790000000' } });
});

test('markdown: line breaks, smartypants and emoji shortcodes like editor.md', () => {
  const { html } = renderMarkdown('一\n二 -- "引" it\'s ... :fa-rocket: :tw-1f606:');
  assert.match(html, /一<br>二/);
  assert.match(html, /— “引” it’s …/);
  assert.match(html, /🚀/);
  assert.match(html, /😆/);
});

test('markdown: code stays verbatim and is highlighted', () => {
  const { html } = renderMarkdown('```go\nfunc main() { a := "--" }\n```\n\n`x -- y`');
  assert.match(html, /<figure class="code" data-lang="go">/);
  assert.match(html, /hljs-keyword/);
  assert.match(html, /&quot;--&quot;/);
  assert.match(html, /<code>x -- y<\/code>/);
});

test('markdown: heading ids follow the old rules, duplicates get a number', () => {
  const { html, toc } = renderMarkdown('#### 1. 打开配置文件(windows在右下角)：\n\n## Hello World\n\n## Hello World');
  assert.equal(toc[0].id, '1-打开配置文件windows在右下角');
  assert.deepEqual(toc.slice(1).map(t => t.id), ['hello-world', 'hello-world-2']);
  assert.match(html, /id="hello-world-2"/);
  assert.equal(slugify('  A  B  '), 'a-b');
});

test('markdown: task lists, tables and links', () => {
  const { html } = renderMarkdown('- [x] a\n- [ ] b\n\n| a |\n|---|\n| 1 |\n\n[x](https://github.com) [y](/posts/a) me@example.com');
  assert.match(html, /<li class="task-list-item"><input type="checkbox" disabled checked>/);
  assert.match(html, /<div class="table-wrap"><table>/);
  assert.match(html, /href="https:\/\/github.com" target="_blank" rel="noopener"/);
  assert.match(html, /<a href="\/posts\/a">y<\/a>/);
  assert.match(html, /mailto:me@example.com/);
});

test('markdown: inline HTML is kept, active content is not', () => {
  const { html } = renderMarkdown('<b onclick="x()">hi</b><script>alert(1)</script>\n\n[x](javascript:alert(1))');
  assert.doesNotMatch(html, /<script|onclick|javascript:/i);
  assert.match(html, /<b>hi<\/b>/);
  assert.equal(sanitizeHTML('<img src="javascript:x" onerror=y>'), '<img src="#">');
});

test('content: front matter and slugs', () => {
  const { data, body } = parseFrontMatter('---\ntitle: "a: b"\ntag_ids: [1, 2]\n---\nbody');
  assert.deepEqual(data, { title: 'a: b', tag_ids: [1, 2] });
  assert.equal(body, 'body');
  assert.equal(cleanSlug('cloudflare-tunnel '), 'cloudflare-tunnel');
  assert.equal(cleanSlug('api-design-openapi&grpc'), 'api-design-openapi&grpc');
});

test('routes: old addresses still resolve', () => {
  assert.deepEqual(matchRoute('/'), { name: 'home' });
  assert.deepEqual(matchRoute('/posts/hello-world'), { name: 'post', slug: 'hello-world' });
  assert.deepEqual(matchRoute('/posts/odd%20name%20'), { name: 'post', slug: 'odd name ' }); // findPost matches it to odd-name
  assert.deepEqual(matchRoute('/posts/hello-world.html'), { name: 'post', slug: 'hello-world' });
  assert.deepEqual(matchRoute('/pages/about'), { name: 'page', id: 'about' });
  for (const p of ['archive', 'tags', 'reading', 'stats', 'random']) assert.equal(matchRoute(`/${p}`).name, p);
  assert.equal(matchRoute('/archive/').name, 'archive');
  assert.equal(matchRoute('/nope').name, 'notfound');
});

test('build: one page per post, drafts left out, odd file names cleaned', () => {
  assert.ok(fs.existsSync(path.join(OUT, 'posts/hello-world.html')));
  assert.ok(fs.existsSync(path.join(OUT, 'posts/odd-name.html')));
  assert.ok(!fs.existsSync(path.join(OUT, 'posts/draft.html')));
  const site = JSON.parse(read('data/site.json'));
  assert.deepEqual(site.posts.map(p => p.slug), ['odd-name', 'hello-world', 'pinned']);
  const odd = findPost(site, 'odd name ');
  assert.equal(odd.slug, 'odd-name');
  assert.equal(postPath(odd), '/posts/odd-name');
  // unused tags and empty categories are not shown; names are trimmed
  assert.deepEqual(site.tags.map(t => t.name).sort(), ['blog', 'go']);
  assert.deepEqual(site.categories.map(c => c.name), ['技术', '生活']);
  assert.equal(findPost(site, 'hello-world').views, 1234);
});

test('build: pre-rendered pages carry SEO and the comments thread of the old address', () => {
  const html = read('posts/hello-world.html');
  assert.match(html, /<title>Hello World · 了迹奇有没<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/blog\.whrss\.com\/posts\/hello-world">/);
  assert.match(html, /"@type":"BlogPosting"/);
  assert.match(html, /id="开始-start"/);
  assert.match(html, /data-term="posts\/hello-world"/);
  // the comment thread of a renamed post is still found by its original address
  assert.match(read('posts/odd-name.html'), /data-term="posts\/odd%20name%20"/);
  for (const f of ['index.html', 'archive.html', 'tags.html', 'reading.html', 'stats.html', 'pages/about.html', '404.html', 'random.html', 'offline.html', 'intro/index.html']) {
    assert.ok(fs.existsSync(path.join(OUT, f)), f);
  }
});

test('build: feed ordered like the home page, at /feed.xml and /feed', () => {
  const feed = read('feed.xml');
  assert.equal(read('feed'), feed);
  const links = [...feed.matchAll(/<entry>\s*<title>[^<]*<\/title>\s*<link href="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(links, ['https://blog.whrss.com/posts/pinned', 'https://blog.whrss.com/posts/odd-name', 'https://blog.whrss.com/posts/hello-world']);
  assert.match(feed, /<published>2023-03-10T09:15:55.000Z<\/published>/);
  // a feed reader shows the content away from the site, so links and images from the site root get the host
  assert.match(feed, /href=&quot;https:\/\/blog\.whrss\.com\/posts\/hello-world&quot;/);
  assert.match(feed, /src=&quot;https:\/\/blog\.whrss\.com\/covers\/a\.jpg&quot;/);
  assert.doesNotMatch(feed, /(href|src)=&quot;\/(?!\/)/);
  assert.match(read('sitemap.xml'), /<loc>https:\/\/blog\.whrss\.com\/posts\/hello-world<\/loc>/);
  assert.match(read('robots.txt'), /Sitemap: https:\/\/blog\.whrss\.com\/sitemap\.xml/);
});

test('feed: a category and a tag with the same name are listed once', () => {
  const site = { config: { host: 'https://blog.whrss.com', name: 'n', description: 'd', author: 'a' } };
  const post = { slug: 'p', title: 't', description: 'd', html: '', created: '2026-10-02T02:00:00.000Z', category: { name: '折腾' }, tags: [{ name: '折腾' }, { name: 'blog' }] };
  const feed = atomFeed(site, [post], new Date('2026-10-03T00:00:00Z'));
  assert.equal(feed.match(/<category term="折腾"\/>/g).length, 1);
  assert.match(feed, /<category term="blog"\/>/);
});

test('build: control characters pasted into a post stay out of the feed and the pages', () => {
  // hello-world.md has a stray backspace (\x08) before its heading and a paragraph, like a post
  // pasted into editor.md; XML forbids it, and one of them made the whole feed unreadable
  for (const f of ['feed.xml', 'sitemap.xml', 'posts/hello-world.html', 'data/posts/hello-world.json', 'data/search.json']) {
    assert.doesNotMatch(read(f), /[\x00-\x08\x0B\x0C\x0E-\x1F]/, f);
  }
  assert.match(read('feed.xml'), /&lt;h2 id=&quot;开始-start&quot;&gt;/);
});

test('build: nothing private reaches the site', () => {
  const all = fs.readdirSync(OUT, { recursive: true }).filter(f => fs.statSync(path.join(OUT, f)).isFile());
  assert.ok(!all.some(f => /users\.json$/.test(f)));
  for (const f of all) {
    const body = fs.readFileSync(path.join(OUT, f));
    assert.ok(!body.includes('fixturehash') && !body.includes('secret@example.com'), `${f} leaks users.json`);
  }
  assert.doesNotMatch(read('posts/pinned.html'), /<script>alert|onclick=|href="javascript:/);
});

test('build: covers, assets, preview', () => {
  assert.ok(fs.existsSync(path.join(OUT, 'covers/a.jpg')));
  const index = read('index.html');
  const css = index.match(/href="(\/assets\/style\.[0-9a-f]+\.css)"/)[1];
  const js = index.match(/src="(\/assets\/app\.[0-9a-f]+\.js)"/)[1];
  assert.ok(fs.existsSync(path.join(OUT, css)) && fs.existsSync(path.join(OUT, js)));
  assert.doesNotMatch(read(js), /^\s*export\s/m);
  const preview = read('preview.html');
  assert.match(preview, /window\.__PREVIEW__=true/);
  assert.match(preview, /data:image\/jpeg;base64/);
  assert.doesNotMatch(preview, /<link rel="stylesheet" href="\/assets/);
});

test('home filters: ?tag_id=, ?category_id=, ?keyword= with full text', () => {
  const site = JSON.parse(read('data/site.json'));
  const search = JSON.parse(read('data/search.json'));
  assert.equal(filterPosts(site, new URLSearchParams('tag_id=1')).posts.length, 2);
  assert.equal(filterPosts(site, new URLSearchParams('category_id=2')).label, '生活');
  assert.deepEqual(filterPosts(site, new URLSearchParams('keyword=redis'), search).posts.map(p => p.slug), ['odd-name']);
  assert.equal(filterPosts(site, new URLSearchParams('keyword=redis')).posts.length, 0);
});

test('build: every post gets drawn cover art', () => {
  const site = JSON.parse(read('data/site.json'));
  for (const p of site.posts) {
    assert.equal(p.cover, `/covers/posts/${encodeURIComponent(p.slug)}.svg`);
    const svg = read(`covers/posts/${p.slug}.svg`);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.doesNotMatch(svg, /<script|href="http/);
  }
  assert.match(read('index.html'), /<img src="\/covers\/posts\/hello-world\.svg"/);
  assert.match(read('posts/hello-world.html'), /class="article-cover"/);
  assert.match(read('preview.html'), /data:image\/svg\+xml;base64/);
});
