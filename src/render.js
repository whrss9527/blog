// Views of the blog, shared by the build (which pre-renders every page) and the
// browser (which renders the next page itself when you follow a link). Each
// view returns { title, description, main, … } where main is an HTML string.
// Keep this file free of imports: the build concatenates it into the bundle.

export const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

const TZ = 'Asia/Shanghai';
const dateParts = iso => {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const get = t => parts.find(p => p.type === t)?.value;
  return { y: get('year'), m: get('month'), d: get('day') };
};
export const fmtDate = iso => { if (!iso) return ''; const p = dateParts(iso); return `${p.y}-${p.m}-${p.d}`; };
export const fmtDateCN = iso => { if (!iso) return ''; const p = dateParts(iso); return `${p.y} 年 ${Number(p.m)} 月 ${Number(p.d)} 日`; };
export const yearOf = iso => (iso ? dateParts(iso).y : '');
export const readingMinutes = words => Math.max(1, Math.round(words / 400));
export const humanCount = n => (n >= 10000 ? `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)} 万` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

// ---------- icons (stroke icons, 24×24, currentColor) ----------
const ICON_PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a7 7 0 0 0 10.7 10.7z"/>',
  auto: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor"/>',
  rss: '<path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.2" fill="currentColor"/>',
  github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  arrowLeft: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.3" fill="currentColor"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6.5A2.5 2.5 0 0 0 4 21.5 2.5 2.5 0 0 0 6.5 24"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  hourglass: '<path d="M6 2h12M6 22h12M7 2v4a5 5 0 0 0 10 0V2M7 22v-4a5 5 0 0 1 10 0v4"/>',
  message: '<path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
};
export const icon = (name, cls = '') =>
  `<svg class="icon${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;

// ---------- routes ----------
// Old goblog addresses stay valid: /posts/<slug>, /pages/<id>, /archive, /tags,
// /reading, /stats, /random and the home page's ?tag_id= / ?category_id= / ?keyword=.
export function matchRoute(pathname) {
  let p = decodeURIComponent(pathname || '/');
  p = p.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  if (p === '' || p === '/') return { name: 'home' };
  let m;
  if ((m = p.match(/^\/posts\/(.+)$/))) return { name: 'post', slug: m[1] };
  if ((m = p.match(/^\/pages\/([^/]+)$/))) return { name: 'page', id: m[1] };
  const simple = { '/archive': 'archive', '/tags': 'tags', '/reading': 'reading', '/stats': 'stats', '/random': 'random', '/offline': 'offline', '/search': 'search' };
  if (simple[p]) return { name: simple[p] };
  return { name: 'notfound' };
}

export const postPath = post => `/posts/${encodeURI(post.slug).replace(/\?/g, '%3F').replace(/#/g, '%23')}`;

// Find a post by any address it ever had (clean slug or original file name).
export function findPost(site, slug) {
  const s = String(slug);
  return site.posts.find(p => p.slug === s || p.identity === s || p.identity.trim() === s.trim()) || null;
}

// ---------- small pieces ----------
const L = (ctx, path) => esc(ctx.link(path));
const A = (ctx, path) => esc(ctx.asset ? ctx.asset(path) : path); // files (images), not pages

function tagChip(ctx, tag, extra = '') {
  return `<a class="chip" href="${L(ctx, `/?tag_id=${tag.id}`)}"${extra}>${icon('tag')}${esc(tag.name)}</a>`;
}

function postMeta(post, { views = true } = {}) {
  return `<span>${icon('calendar')}<time datetime="${esc(post.created)}">${fmtDate(post.created)}</time></span>
    <span>${icon('clock')}${readingMinutes(post.words)} 分钟</span>
    ${views && post.views ? `<span title="阅读 ${post.views} 次（静态版之前的统计）">${icon('eye')}${humanCount(post.views)}</span>` : ''}`;
}

export function postCard(ctx, post, i = 0, opts = {}) {
  const vt = `view-transition-name: t-${post.n}`;
  // Generated artwork sits under the post's own image, so a broken image falls back to it.
  const art = `<div class="card-art card-art-gen" aria-hidden="true" style="--h:${(post.n * 47) % 360}"><span>${esc(post.title.slice(0, 1))}</span>${post.image ? `<img src="${esc(post.image)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}</div>`;
  return `<article class="card glass tilt reveal${opts.big ? ' card-big' : ''}${opts.wide ? ' card-wide' : ''}" style="--i:${i % 12}">
    <a class="card-link" href="${L(ctx, postPath(post))}" aria-label="${esc(post.title)}"></a>
    ${art}
    <div class="card-body">
      <div class="card-kicker">${post.category ? `<span class="kicker-cat">${esc(post.category.name)}</span>` : ''}${post.pinned ? `<span class="kicker-pin">${icon('sparkles')}置顶</span>` : ''}</div>
      <h3 class="card-title"><span style="${vt}">${esc(post.title)}</span></h3>
      ${post.description ? `<p class="card-desc">${esc(post.description)}</p>` : ''}
      <div class="card-meta">${postMeta(post)}</div>
      ${post.tags.length ? `<div class="card-tags">${post.tags.slice(0, 3).map(t => tagChip(ctx, t, ' tabindex="-1"')).join('')}</div>` : ''}
    </div>
  </article>`;
}

function emptyState(title, text, ctx) {
  return `<div class="empty glass reveal"><div class="empty-orb" aria-hidden="true"></div><h2>${esc(title)}</h2><p>${text}</p>
    <a class="btn btn-glass" href="${L(ctx, '/')}">${icon('arrowLeft')}回到首页</a></div>`;
}

// ---------- home ----------
export function filterPosts(site, query, fullText) {
  const tagId = Number(query.get('tag_id')) || null;
  const categoryId = Number(query.get('category_id')) || null;
  const keyword = (query.get('keyword') || query.get('q') || '').trim();
  let posts = site.posts;
  let label = '';
  let kind = '';
  if (tagId) {
    posts = posts.filter(p => p.tags.some(t => t.id === tagId));
    label = site.tags.find(t => t.id === tagId)?.name || `#${tagId}`;
    kind = 'tag';
  } else if (categoryId) {
    posts = posts.filter(p => p.category?.id === categoryId);
    label = site.categories.find(c => c.id === categoryId)?.name || `#${categoryId}`;
    kind = 'category';
  }
  if (keyword) {
    const words = keyword.toLowerCase().split(/\s+/).filter(Boolean);
    posts = posts.filter(p => {
      const hay = `${p.title} ${p.description} ${p.category?.name || ''} ${p.tags.map(t => t.name).join(' ')} ${fullText?.[p.slug] || ''}`.toLowerCase();
      return words.every(w => hay.includes(w));
    });
    label = keyword;
    kind = 'keyword';
  }
  return { posts, label, kind, tagId, categoryId, keyword };
}

export function homeView(site, ctx, query = new URLSearchParams(), fullText = null) {
  const f = filterPosts(site, query, fullText);
  const filtered = Boolean(f.kind);
  const words = site.posts.reduce((a, p) => a + p.words, 0);
  const years = Math.max(0.1, (new Date(site.generated) - new Date(site.since)) / (365.25 * 86400000));

  const hero = filtered ? '' : `
  <section class="hero">
    <div class="hero-card glass glass-strong reveal">
      <div class="orb" aria-hidden="true"><div class="orb-core"><img src="${A(ctx, '/logo.png')}" alt="" width="96" height="96"></div></div>
      <div class="hero-text">
        <p class="eyebrow">${icon('sparkles')}${esc(site.config.host.replace(/^https?:\/\//, ''))}</p>
        <h1 class="hero-title"><span class="shimmer">${esc(site.config.name)}</span></h1>
        <p class="hero-sub">${esc(site.config.description)}</p>
        <div class="hero-stats">
          <span class="stat-pill"><b data-count="${site.posts.length}">${site.posts.length}</b> 篇文章</span>
          <span class="stat-pill"><b data-count="${Math.round(words / 1000) / 10}" data-decimals="1">${(words / 10000).toFixed(1)}</b> 万字</span>
          <span class="stat-pill">写了 <b data-count="${years.toFixed(1)}" data-decimals="1">${years.toFixed(1)}</b> 年</span>
        </div>
        <div class="hero-actions">
          <a class="btn btn-primary" href="${L(ctx, '/random')}" data-random>${icon('shuffle')}随便读读</a>
          <button type="button" class="btn btn-glass" data-open-search>${icon('search')}搜索<kbd>⌘K</kbd></button>
          <a class="btn btn-glass" href="${L(ctx, '/feed.xml')}" data-external>${icon('rss')}RSS</a>
        </div>
      </div>
      <div class="hero-stack" aria-label="最近写的">
        <p class="stack-label">${icon('clock')}最近写的</p>
        <div class="stack">${site.posts.slice(0, 3).map((p, k) => `<a class="stack-card glass glass-strong" style="--k:${k}" href="${L(ctx, postPath(p))}">
          <span class="stack-date">${fmtDate(p.created)}${p.category ? ` · ${esc(p.category.name)}` : ''}</span><b>${esc(p.title)}</b></a>`).join('')}</div>
      </div>
    </div>
  </section>`;

  const cats = `<nav class="filters glass reveal" aria-label="按分类筛选">
      <div class="seg" data-seg>
        <a class="seg-item${!f.categoryId && !f.tagId && !f.keyword ? ' is-active' : ''}" href="${L(ctx, '/')}">全部<small>${site.posts.length}</small></a>
        ${site.categories.map(c => `<a class="seg-item${f.categoryId === c.id ? ' is-active' : ''}" href="${L(ctx, `/?category_id=${c.id}`)}">${esc(c.name)}<small>${c.count}</small></a>`).join('')}
        <span class="seg-glider" aria-hidden="true"></span>
      </div>
      <a class="filters-more" href="${L(ctx, '/tags')}">${icon('tag')}全部标签</a>
    </nav>`;

  const banner = filtered ? `<div class="filter-banner glass reveal">
      <span class="filter-kind">${f.kind === 'tag' ? `${icon('tag')}标签` : f.kind === 'category' ? `${icon('folder')}分类` : `${icon('search')}搜索`}</span>
      <h1 class="filter-label">${esc(f.label)}</h1>
      <span class="filter-count">${f.posts.length} 篇</span>
      <a class="icon-btn" href="${L(ctx, '/')}" aria-label="清除筛选">${icon('x')}</a>
    </div>` : '';

  let list;
  if (!f.posts.length) {
    list = emptyState('没有找到文章', f.kind === 'keyword' ? '换个关键词试试，或者按 <kbd>⌘K</kbd> 搜全文。' : '这里暂时还是空的。', ctx);
  } else if (filtered) {
    list = `<div class="grid">${f.posts.map((p, i) => postCard(ctx, p, i)).join('')}</div>`;
  } else {
    const pinned = f.posts.filter(p => p.pinned);
    const groups = new Map();
    for (const p of f.posts.filter(p => !p.pinned)) {
      const y = yearOf(p.created);
      if (!groups.has(y)) groups.set(y, []);
      groups.get(y).push(p);
    }
    list = (pinned.length ? `<section class="year"><div class="grid">${pinned.map((p, i) => postCard(ctx, p, i, { big: true })).join('')}</div></section>` : '') +
      [...groups].map(([y, ps]) => `<section class="year" aria-labelledby="y-${y}">
        <h2 class="year-label reveal" id="y-${y}"><span>${esc(y)}</span><small>${ps.length} 篇</small></h2>
        <div class="grid">${ps.map((p, i) => postCard(ctx, p, i, { wide: ps.length === 1, big: i === 0 && ps.length >= 2 && y === yearOf(f.posts[0].created) })).join('')}</div>
      </section>`).join('');
  }

  return {
    title: filtered ? `${f.label} · ${site.config.name}` : site.config.name,
    description: site.config.description,
    main: `${hero}<div class="container">${cats}${banner}${list}</div>`,
    bodyClass: 'is-home',
  };
}

// ---------- post ----------
function relatedPosts(site, post, limit = 3) {
  const tagIds = new Set(post.tags.map(t => t.id));
  return site.posts
    .filter(p => p.slug !== post.slug)
    .map(p => ({ p, score: p.tags.filter(t => tagIds.has(t.id)).length * 3 + (p.category && post.category && p.category.id === post.category.id ? 1 : 0) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.p.created || '').localeCompare(a.p.created || ''))
    .slice(0, limit)
    .map(x => x.p);
}

function outdatedYears(post, now) {
  if (!post.created) return 0;
  const created = new Date(post.created);
  if (now - created < 2 * 365 * 24 * 3600 * 1000) return 0;
  if (!post.hasCode && !(post.category?.name || '').includes('技术')) return 0;
  let years = now.getFullYear() - created.getFullYear();
  const anniversary = new Date(created); anniversary.setFullYear(created.getFullYear() + years);
  if (now < anniversary) years--;
  return years;
}

export function tocHTML(toc) {
  if (!toc || toc.length < 2) return '';
  const top = Math.min(...toc.map(t => t.level));
  const items = toc.filter(t => t.level <= top + 2);
  return `<ol class="toc-list">${items.map(t => `<li class="toc-l${t.level - top}"><a href="#${esc(t.id)}" data-toc="${esc(t.id)}">${esc(t.text)}</a></li>`).join('')}</ol>`;
}

export function postView(site, post, content, ctx, now = new Date()) {
  const idx = site.posts.indexOf(post);
  const newer = idx > 0 ? site.posts[idx - 1] : null;
  const older = idx >= 0 && idx < site.posts.length - 1 ? site.posts[idx + 1] : null;
  const related = relatedPosts(site, post);
  const outdated = outdatedYears(post, now);
  const toc = tocHTML(content.toc);
  const url = `${site.config.host}${postPath(post)}`;
  const updated = post.updated && fmtDate(post.updated) !== fmtDate(post.created) ? `<span title="最后更新">${icon('sparkles')}更新于 ${fmtDate(post.updated)}</span>` : '';

  const main = `<div class="progress" aria-hidden="true"><span></span></div>
  <div class="container article-layout${toc ? ' has-toc' : ''}">
    <article class="article">
      <header class="article-head reveal">
        <a class="back" href="${L(ctx, '/')}" data-back>${icon('arrowLeft')}全部文章</a>
        <div class="article-kicker">
          ${post.category ? `<a class="chip chip-accent" href="${L(ctx, `/?category_id=${post.category.id}`)}">${icon('folder')}${esc(post.category.name)}</a>` : ''}
          ${post.tags.map(t => tagChip(ctx, t)).join('')}
        </div>
        <h1 class="article-title"><span style="view-transition-name: t-${post.n}">${esc(post.title)}</span></h1>
        ${post.description ? `<p class="article-lede">${esc(post.description)}</p>` : ''}
        <div class="article-meta">
          ${postMeta(post)}
          <span>${icon('book')}${post.words.toLocaleString('zh-CN')} 字</span>
          ${updated}
        </div>
      </header>
      ${outdated > 0 ? `<aside class="notice glass reveal" role="note">${icon('hourglass')}<span>这篇文章写于 <strong>${outdated} 年前</strong>，其中的版本、命令或结论可能已经过时，请注意甄别。</span></aside>` : ''}
      <div class="prose glass glass-paper reveal" id="prose">${content.html}</div>
      <footer class="article-foot reveal">
        <div class="license glass">
          <p><span>本文链接</span><a href="${esc(url)}">${esc(decodeURI(url))}</a></p>
          <p><span>版权声明</span>本文采用 <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-Hans" target="_blank" rel="noopener license">CC BY-NC-SA 4.0</a> 许可协议，转载请注明出处。</p>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-glass" data-share data-title="${esc(post.title)}" data-url="${esc(url)}">${icon('share')}分享</button>
          <button type="button" class="btn btn-glass" data-copy-link data-url="${esc(url)}">${icon('link')}<span>复制链接</span></button>
          <a class="btn btn-glass" href="#comments">${icon('message')}评论</a>
        </div>
      </footer>
      ${newer || older ? `<nav class="post-nav reveal" aria-label="上一篇 / 下一篇">
        ${older ? `<a class="post-nav-item glass tilt" rel="prev" href="${L(ctx, postPath(older))}"><span class="pn-label">${icon('arrowLeft')}上一篇</span><span class="pn-title">${esc(older.title)}</span></a>` : '<span></span>'}
        ${newer ? `<a class="post-nav-item glass tilt is-next" rel="next" href="${L(ctx, postPath(newer))}"><span class="pn-label">下一篇${icon('arrowRight')}</span><span class="pn-title">${esc(newer.title)}</span></a>` : '<span></span>'}
      </nav>` : ''}
      ${related.length ? `<section class="related reveal" aria-labelledby="related-h"><h2 class="section-title" id="related-h">${icon('sparkles')}相关文章</h2>
        <div class="grid grid-3">${related.map((p, i) => postCard(ctx, p, i)).join('')}</div></section>` : ''}
      <section class="comments glass reveal" id="comments" aria-labelledby="comments-h">
        <h2 class="section-title" id="comments-h">${icon('message')}评论</h2>
        <div class="giscus" data-term="${esc(`posts/${encodeURI(post.identity)}`)}"><p class="muted">评论区快到眼前时才会加载。</p></div>
        <noscript>评论区需要启用 JavaScript。</noscript>
      </section>
    </article>
    ${toc ? `<aside class="toc glass" aria-label="目录"><div class="toc-head">${icon('list')}目录</div>${toc}</aside>
    <button type="button" class="toc-fab glass" data-toc-toggle aria-label="目录">${icon('list')}</button>` : ''}
  </div>`;

  return {
    title: `${post.title} · ${site.config.name}`,
    description: post.description || site.config.description,
    image: post.image,
    main,
    bodyClass: 'is-post',
    article: post,
  };
}

// ---------- archive ----------
export function archiveView(site, ctx) {
  const groups = new Map();
  for (const p of site.posts) {
    const y = yearOf(p.created);
    if (!groups.has(y)) groups.set(y, []);
    groups.get(y).push(p);
  }
  const main = `<div class="container narrow">
    <header class="page-head reveal"><p class="eyebrow">${icon('calendar')}归档</p><h1>${site.posts.length} 篇文章，按时间排好</h1></header>
    <div class="timeline">
    ${[...groups].map(([y, ps]) => `<section class="tl-year reveal">
      <h2 class="tl-year-label glass"><span>${esc(y)}</span><small>${ps.length} 篇</small></h2>
      <ol class="tl-list">${ps.map((p, i) => `<li class="tl-item reveal" style="--i:${i % 12}">
        <a class="tl-link glass" href="${L(ctx, postPath(p))}">
          <time datetime="${esc(p.created)}">${fmtDate(p.created).slice(5)}</time>
          <span class="tl-title" style="view-transition-name: t-${p.n}">${esc(p.title)}</span>
          ${p.category ? `<span class="tl-cat">${esc(p.category.name)}</span>` : ''}
        </a></li>`).join('')}</ol>
    </section>`).join('')}
    </div></div>`;
  return { title: `归档 · ${site.config.name}`, description: `${site.config.name}的全部文章`, main, bodyClass: 'is-archive' };
}

// ---------- tags ----------
export function tagsView(site, ctx) {
  const max = Math.max(...site.tags.map(t => t.count), 1);
  const tags = [...site.tags].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
  const main = `<div class="container narrow">
    <header class="page-head reveal"><p class="eyebrow">${icon('tag')}标签与分类</p><h1>${site.categories.length} 个分类，${site.tags.length} 个标签</h1></header>
    <div class="cat-grid">${site.categories.map((c, i) => `<a class="cat-card glass tilt reveal" style="--i:${i};--h:${(i * 83 + 200) % 360}" href="${L(ctx, `/?category_id=${c.id}`)}">
      <span class="cat-glow" aria-hidden="true"></span><span class="cat-name">${esc(c.name)}</span><span class="cat-count">${c.count}<small> 篇</small></span></a>`).join('')}</div>
    <div class="cloud glass reveal">${tags.map((t, i) => {
      const w = 0.85 + (t.count / max) * 0.9;
      return `<a class="cloud-tag" href="${L(ctx, `/?tag_id=${t.id}`)}" style="--w:${w.toFixed(2)};--i:${i % 20}">${esc(t.name)}<sup>${t.count}</sup></a>`;
    }).join('')}</div>
  </div>`;
  return { title: `标签 · ${site.config.name}`, description: `${site.config.name}的分类和标签`, main, bodyClass: 'is-tags' };
}

// ---------- reading ----------
const BOOK_STATUS = { 1: '在读', 2: '读完', 3: '想读', 4: '放下了' };
export function readingView(site, ctx, query = new URLSearchParams()) {
  const status = Number(query.get('status')) || 0;
  const books = [...site.books].sort((a, b) => (a.status === 1 ? -1 : 0) - (b.status === 1 ? -1 : 0) || String(b.finish || b.start).localeCompare(String(a.finish || a.start)));
  const shown = status ? books.filter(b => b.status === status) : books;
  const counts = s => site.books.filter(b => b.status === s).length;
  const tabs = [[0, '全部', site.books.length], ...[1, 2, 3, 4].filter(s => counts(s)).map(s => [s, BOOK_STATUS[s], counts(s)])];
  const main = `<div class="container">
    <header class="page-head reveal"><p class="eyebrow">${icon('book')}阅读</p><h1>书架上的 ${site.books.length} 本书</h1></header>
    <nav class="filters glass reveal" aria-label="按状态筛选"><div class="seg" data-seg>
      ${tabs.map(([s, name, n]) => `<a class="seg-item${status === s ? ' is-active' : ''}" href="${L(ctx, s ? `/reading?status=${s}` : '/reading')}">${name}<small>${n}</small></a>`).join('')}
      <span class="seg-glider" aria-hidden="true"></span></div></nav>
    <div class="shelf">${shown.map((b, i) => `<article class="book glass tilt reveal" style="--i:${i % 12}">
      <div class="book-cover">${b.cover ? `<img src="${A(ctx, b.cover)}" alt="《${esc(b.title)}》封面" loading="lazy" decoding="async">` : `<span>${esc(b.title.slice(0, 2))}</span>`}<span class="book-shine" aria-hidden="true"></span></div>
      <div class="book-info">
        <span class="book-status s${b.status}">${BOOK_STATUS[b.status] || ''}</span>
        <h3>${esc(b.title)}</h3>
        ${b.author ? `<p class="muted">${esc(b.author)}</p>` : ''}
        <div class="ring" style="--p:${Math.min(100, b.progress)}" role="img" aria-label="进度 ${b.progress}%"><span>${b.progress}%</span></div>
        <p class="book-dates">${b.start ? esc(b.start) : ''}${b.finish ? ` → ${esc(b.finish)}` : b.status === 1 ? ' → 进行中' : ''}</p>
        ${b.comment ? `<p class="book-comment">${esc(b.comment)}</p>` : ''}
      </div></article>`).join('') || emptyState('这里还没有书', '换个分类看看。', ctx)}</div>
  </div>`;
  return { title: `阅读 · ${site.config.name}`, description: `${site.config.name}的阅读清单`, main, bodyClass: 'is-reading' };
}

// ---------- stats ----------
export function statsView(site, ctx) {
  const posts = site.posts;
  const words = posts.reduce((a, p) => a + p.words, 0);
  const views = posts.reduce((a, p) => a + p.views, 0);
  const days = Math.floor((new Date(site.generated) - new Date(site.since)) / 86400000);
  const byYear = new Map();
  for (const p of posts) {
    const y = yearOf(p.created);
    const v = byYear.get(y) || { posts: 0, words: 0 };
    v.posts++; v.words += p.words; byYear.set(y, v);
  }
  const years = [...byYear].sort((a, b) => a[0].localeCompare(b[0]));
  const maxPosts = Math.max(...years.map(([, v]) => v.posts), 1);
  // month grid: one row per year, a cell per month
  const monthCount = new Map();
  for (const p of posts) { const k = fmtDate(p.created).slice(0, 7); monthCount.set(k, (monthCount.get(k) || 0) + 1); }
  const maxMonth = Math.max(...monthCount.values(), 1);
  const topRead = [...posts].filter(p => p.views).sort((a, b) => b.views - a.views).slice(0, 8);
  const maxViews = Math.max(...topRead.map(p => p.views), 1);
  const topTags = [...site.tags].sort((a, b) => b.count - a.count).slice(0, 10);
  const maxTag = Math.max(...topTags.map(t => t.count), 1);
  const longest = [...posts].sort((a, b) => b.words - a.words)[0];

  const tile = (label, value, sub = '', dec = 0) => `<div class="tile glass reveal"><span class="tile-label">${label}</span><b class="tile-value" data-count="${value}" data-decimals="${dec}">${dec ? value.toFixed(dec) : value.toLocaleString('zh-CN')}</b>${sub ? `<span class="tile-sub">${sub}</span>` : ''}</div>`;
  const main = `<div class="container">
    <header class="page-head reveal"><p class="eyebrow">${icon('sparkles')}统计</p><h1>写了 ${days.toLocaleString('zh-CN')} 天，这些是留下来的</h1></header>
    <div class="tiles">
      ${tile('文章', posts.length, '篇')}
      ${tile('总字数', Math.round(words / 1000) / 10, '万字', 1)}
      ${tile('标签', site.tags.length, `${site.categories.length} 个分类`)}
      ${tile('读过的书', site.books.length, `${site.books.filter(b => b.status === 2).length} 本读完`)}
      ${views ? tile('阅读', Math.round(views / 1000) / 10, '万次 · 截至改版', 1) : ''}
      ${tile('平均每篇', Math.round(words / Math.max(posts.length, 1)), '字')}
    </div>
    <div class="charts">
      <section class="chart glass reveal" aria-labelledby="c-year"><h2 id="c-year">每年写了多少</h2>
        <div class="bars">${years.map(([y, v], i) => `<div class="bar-col" style="--v:${v.posts / maxPosts};--i:${i}"><span class="bar-val">${v.posts}</span><span class="bar" title="${y} 年 ${v.posts} 篇，${v.words.toLocaleString('zh-CN')} 字"></span><span class="bar-key">${y}</span></div>`).join('')}</div>
      </section>
      <section class="chart glass reveal" aria-labelledby="c-cal"><h2 id="c-cal">落笔的月份</h2>
        <div class="months" role="img" aria-label="每月发文数量">
          <span></span>${Array.from({ length: 12 }, (_, m) => `<span class="m-key">${m + 1}</span>`).join('')}
          ${years.map(([y]) => `<span class="m-year">${y}</span>${Array.from({ length: 12 }, (_, m) => {
            const n = monthCount.get(`${y}-${String(m + 1).padStart(2, '0')}`) || 0;
            return `<span class="m-cell" style="--v:${n / maxMonth}" title="${y} 年 ${m + 1} 月：${n} 篇"></span>`;
          }).join('')}`).join('')}
        </div>
      </section>
      <section class="chart glass reveal" aria-labelledby="c-tags"><h2 id="c-tags">最常写的话题</h2>
        <ol class="hbars">${topTags.map((t, i) => `<li style="--v:${t.count / maxTag};--i:${i}"><a href="${L(ctx, `/?tag_id=${t.id}`)}">${esc(t.name)}</a><span class="hbar"></span><b>${t.count}</b></li>`).join('')}</ol>
      </section>
      ${topRead.length ? `<section class="chart glass reveal" aria-labelledby="c-read"><h2 id="c-read">读的人最多</h2>
        <ol class="hbars">${topRead.map((p, i) => `<li style="--v:${p.views / maxViews};--i:${i}"><a href="${L(ctx, postPath(p))}">${esc(p.title)}</a><span class="hbar"></span><b>${humanCount(p.views)}</b></li>`).join('')}</ol>
      </section>` : ''}
    </div>
    ${longest ? `<p class="muted center reveal">最长的一篇是《<a href="${L(ctx, postPath(longest))}">${esc(longest.title)}</a>》，${longest.words.toLocaleString('zh-CN')} 字。</p>` : ''}
  </div>`;
  return { title: `统计 · ${site.config.name}`, description: `${site.config.name}的写作统计`, main, bodyClass: 'is-stats' };
}

// ---------- pages, 404, random, offline ----------
export function pageView(site, page, content, ctx) {
  const main = `<div class="container narrow">
    <header class="page-head reveal"><p class="eyebrow">${icon('sparkles')}${esc(site.config.name)}</p><h1>${esc(page.title)}</h1></header>
    <div class="prose glass glass-paper reveal">${content.html}</div>
  </div>`;
  return { title: `${page.title} · ${site.config.name}`, description: site.config.description, main, bodyClass: 'is-page' };
}

export function notFoundView(site, ctx) {
  const main = `<div class="container narrow">${emptyState('这一页走丢了', `地址可能变了，也可能从来没有过。试试 <button type="button" class="link-btn" data-open-search>搜索</button>，或者从这些文章读起：`, ctx)}
    <div class="grid grid-3">${site.posts.slice(0, 3).map((p, i) => postCard(ctx, p, i)).join('')}</div></div>`;
  return { title: `找不到页面 · ${site.config.name}`, description: site.config.description, main, bodyClass: 'is-404', status: 404 };
}

export function randomView(site, ctx) {
  const main = `<div class="container narrow"><div class="empty glass reveal"><div class="empty-orb spinning" aria-hidden="true"></div><h2>正在挑一篇……</h2>
    <p class="muted">如果没有跳转，<a href="${L(ctx, '/archive')}">去归档里挑一篇</a>。</p></div></div>`;
  return { title: `随便读读 · ${site.config.name}`, description: site.config.description, main, bodyClass: 'is-random' };
}

export function offlineView(site, ctx) {
  const main = `<div class="container narrow">${emptyState('现在没有网络', '读过的文章在离线时也能打开。网络恢复后刷新就好。', ctx)}</div>`;
  return { title: `离线 · ${site.config.name}`, description: site.config.description, main, bodyClass: 'is-offline' };
}

// ---------- page shell ----------
export function headerHTML(site, ctx) {
  return `<a class="skip" href="#main">跳到正文</a>
  <header class="topbar" id="topbar">
    <nav class="nav glass glass-strong" aria-label="主导航">
      <a class="brand" href="${L(ctx, '/')}" aria-label="${esc(site.config.name)}，首页"><img src="${A(ctx, '/logo.png')}" alt="" width="28" height="28"><span>${esc(site.config.name)}</span></a>
      <div class="nav-links" data-nav>
        ${site.config.nav.map(n => `<a href="${L(ctx, n.href)}" data-path="${esc(n.href)}">${esc(n.label)}</a>`).join('')}
        <span class="nav-lens" aria-hidden="true"></span>
      </div>
      <div class="nav-tools">
        <button type="button" class="icon-btn" data-open-search aria-label="搜索（⌘K）">${icon('search')}</button>
        <button type="button" class="icon-btn" data-theme-toggle aria-label="切换明暗">${icon('auto', 'i-auto')}${icon('sun', 'i-light')}${icon('moon', 'i-dark')}</button>
        <button type="button" class="icon-btn nav-menu" data-menu-toggle aria-label="菜单" aria-expanded="false">${icon('menu')}</button>
      </div>
    </nav>
  </header>`;
}

export function footerHTML(site, ctx) {
  const days = Math.floor((new Date(site.generated) - new Date(site.since)) / 86400000);
  const c = site.config;
  return `<footer class="footer">
    <div class="footer-inner glass">
      <div class="footer-brand"><img src="${A(ctx, '/logo.png')}" alt="" width="36" height="36"><div><b>${esc(c.name)}</b><span class="muted">已经写了 ${days.toLocaleString('zh-CN')} 天</span></div></div>
      <nav class="footer-links" aria-label="站外链接">
        ${c.website ? `<a href="${esc(c.website)}" target="_blank" rel="noopener">${icon('globe')}官网</a>` : ''}
        <a href="${L(ctx, '/feed.xml')}" data-external>${icon('rss')}RSS</a>
        ${c.github ? `<a href="${esc(c.github)}" target="_blank" rel="noopener">${icon('github')}GitHub</a>` : ''}
        ${c.email ? `<a href="mailto:${esc(c.email)}">${icon('mail')}邮箱</a>` : ''}
        <a href="${L(ctx, '/intro')}" data-external>${icon('sparkles')}简历</a>
      </nav>
      <p class="footer-note muted">文章采用 <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-Hans" target="_blank" rel="noopener license">CC BY-NC-SA 4.0</a> 许可 · © ${new Date(site.generated).getFullYear()} ${esc(c.author)}</p>
    </div>
  </footer>
  <button type="button" class="to-top glass" data-to-top aria-label="回到顶部"><svg class="to-top-ring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18"/></svg>${icon('arrowUp')}</button>`;
}

export function backdropHTML() {
  return `<div class="backdrop" aria-hidden="true">
    <div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div><div class="blob b4"></div>
    <div class="spotlight"></div><div class="grain"></div>
  </div>`;
}

export function paletteHTML() {
  return `<div class="palette" id="palette" hidden>
    <div class="palette-scrim" data-close-search></div>
    <div class="palette-box glass glass-strong" role="dialog" aria-modal="true" aria-label="搜索">
      <label class="palette-input">${icon('search')}<input type="search" id="palette-q" placeholder="搜索标题、标签和全文……" autocomplete="off" spellcheck="false" aria-controls="palette-list"><kbd>Esc</kbd></label>
      <ul class="palette-list" id="palette-list" role="listbox"></ul>
      <div class="palette-foot muted"><span><kbd>↑</kbd><kbd>↓</kbd> 选择</span><span><kbd>↵</kbd> 打开</span><span><kbd>⌘K</kbd> 随时呼出</span></div>
    </div>
  </div>
  <div class="lightbox" id="lightbox" hidden><img alt=""><button type="button" class="icon-btn" aria-label="关闭">${icon('x')}</button></div>
  <div class="toast glass glass-strong" id="toast" role="status" aria-live="polite"></div>`;
}

// Render the view for a route. content is the post/page body when the route needs one.
export function renderRoute(site, route, ctx, { query, content, fullText, now } = {}) {
  switch (route.name) {
    case 'home': return homeView(site, ctx, query, fullText);
    case 'search': return homeView(site, ctx, query, fullText);
    case 'post': {
      const post = findPost(site, route.slug);
      return post && content ? postView(site, post, content, ctx, now) : notFoundView(site, ctx);
    }
    case 'page': {
      const page = site.pages.find(p => p.id === route.id);
      return page && content ? pageView(site, page, content, ctx) : notFoundView(site, ctx);
    }
    case 'archive': return archiveView(site, ctx);
    case 'tags': return tagsView(site, ctx);
    case 'reading': return readingView(site, ctx, query);
    case 'stats': return statsView(site, ctx);
    case 'random': return randomView(site, ctx);
    case 'offline': return offlineView(site, ctx);
    default: return notFoundView(site, ctx);
  }
}
