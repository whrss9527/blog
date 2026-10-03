// Reads the content repository (blog-data) into one plain object. Everything
// the site shows comes from here; nothing is fetched from a server at runtime.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { renderMarkdown, plainText, stripControls } from './markdown.mjs';

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontMatter(source) {
  const match = source.match(FRONT_MATTER);
  if (!match) return { data: {}, body: source };
  return { data: yaml.load(match[1], { schema: yaml.JSON_SCHEMA }) || {}, body: source.slice(match[0].length) };
}

// The file name is the post's address. A few early posts have characters that
// do not belong in a file name on a static host (a trailing space); they get a
// clean slug and the 404 page sends the old address on.
export function cleanSlug(identity) {
  return identity.trim().replace(/[\s?#%"'<>\\]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
}

const readSource = file => stripControls(fs.readFileSync(file, 'utf8'));

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function toISO(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// First image of the article: used for the card artwork and Open Graph.
function firstImage(html) {
  const m = html.match(/<img[^>]+src="([^"]+)"/);
  return m ? m[1] : null;
}

export function loadContent(dataDir) {
  if (!fs.existsSync(path.join(dataDir, 'posts'))) {
    throw new Error(`没有找到内容目录 ${dataDir}/posts。把 blog-data 克隆到这里，或用 --data 指定位置。`);
  }
  const categories = readJSON(path.join(dataDir, 'categories.json'), []);
  const tags = readJSON(path.join(dataDir, 'tags.json'), []).map(t => ({ ...t, name: String(t.name).trim() }));
  const views = readJSON(path.join(dataDir, 'views.json'), {});
  const books = readJSON(path.join(dataDir, 'books.json'), []);
  const categoryById = new Map(categories.map(c => [c.id, c]));
  const tagById = new Map(tags.map(t => [t.id, t]));

  const posts = [];
  for (const file of fs.readdirSync(path.join(dataDir, 'posts')).sort()) {
    if (!file.endsWith('.md')) continue;
    const identity = file.slice(0, -3);
    const { data, body } = parseFrontMatter(readSource(path.join(dataDir, 'posts', file)));
    if (Number(data.status ?? 1) !== 1) continue; // drafts and hidden posts stay out of the site
    const { html, toc } = renderMarkdown(body);
    const category = categoryById.get(Number(data.category_id));
    const postTags = [...new Set((data.tag_ids || []).map(Number))].map(id => tagById.get(id)).filter(Boolean);
    posts.push({
      identity,
      slug: cleanSlug(identity),
      title: String(data.title ?? identity).trim(),
      description: String(data.description ?? '').trim(),
      created: toISO(data.created_at),
      updated: toISO(data.updated_at) || toISO(data.created_at),
      pinned: Number(data.is_top) === 1,
      category: category ? { id: category.id, name: category.name } : null,
      tags: postTags.map(t => ({ id: t.id, name: t.name })),
      words: Number(data.word_count) || plainText(html).replace(/\s/g, '').length,
      views: Number(views[identity]) || 0,
      hasCode: body.includes('```'),
      image: firstImage(html),
      html,
      toc,
    });
  }
  // Newest first, the order of the home page and the feed (pinned posts lead both).
  posts.sort((a, b) => (b.created || '').localeCompare(a.created || ''));

  const pages = [];
  const pagesDir = path.join(dataDir, 'pages');
  if (fs.existsSync(pagesDir)) {
    for (const file of fs.readdirSync(pagesDir).sort()) {
      if (!file.endsWith('.md')) continue;
      const { data, body } = parseFrontMatter(readSource(path.join(pagesDir, file)));
      const id = cleanSlug(String(data.id ?? file.slice(0, -3)));
      const { html, toc } = renderMarkdown(body);
      pages.push({ id, title: String(data.title ?? id).trim(), html, toc });
    }
  }

  // Only tags and categories that a published post uses are shown.
  const used = new Map();
  for (const p of posts) for (const t of p.tags) used.set(t.id, (used.get(t.id) || 0) + 1);
  const usedTags = tags.filter(t => used.has(t.id)).map(t => ({ id: t.id, name: t.name, count: used.get(t.id) }));
  const usedCategories = categories
    .map(c => ({ id: c.id, name: c.name, count: posts.filter(p => p.category?.id === c.id).length }))
    .filter(c => c.count > 0);

  return {
    posts,
    pages,
    tags: usedTags,
    categories: usedCategories,
    books: books.map(b => ({
      id: b.id, title: b.title, author: b.author || '', cover: b.cover || '', status: Number(b.status),
      progress: Number(b.progress) || 0, rating: Number(b.rating) || 0, comment: b.comment || '',
      start: b.start_date || '', finish: b.finish_date || '', year: b.year || null,
    })),
    coversDir: path.join(dataDir, 'covers'),
  };
}
