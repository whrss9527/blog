// The browser side. Pages arrive pre-rendered; after that, following a link
// renders the next page here (with the same views as the build) and swaps it
// in with a view transition, so the blog behaves like an app without a server.
// The build concatenates src/render.js in front of this file.

const PREVIEW = Boolean(window.__PREVIEW__);
const BUILD = document.documentElement.dataset.build || 'dev';
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// The site may live below its host (a GitHub Pages project site before the domain moves).
const BASE = PREVIEW ? '' : document.documentElement.dataset.base || '';
const ctx = { link: p => (PREVIEW ? `#${p}` : BASE + p), asset: p => (PREVIEW ? window.__ASSETS__?.[p] || p : BASE + p) };
const pathOf = url => (BASE && url.pathname.startsWith(BASE) ? url.pathname.slice(BASE.length) || '/' : url.pathname);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

let site = window.__SITE__ || null;
let fullText = null;
const contentCache = new Map();
let currentKey = '';

// ---------- data ----------
async function fetchJSON(url) {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}
let sitePromise = null;
function loadSite() {
  if (site) return Promise.resolve(site);
  sitePromise ||= fetchJSON(`${BASE}/data/site.json?v=${BUILD}`).then(s => (site = s));
  return sitePromise;
}
function loadContent(kind, id) {
  const key = `${kind}:${id}`;
  if (contentCache.has(key)) return contentCache.get(key);
  let p;
  if (window.__CONTENT__) p = Promise.resolve(window.__CONTENT__[key] || null);
  else p = fetchJSON(`${BASE}/data/${kind}/${encodeURIComponent(id)}.json?v=${BUILD}`).catch(() => null);
  contentCache.set(key, p);
  p.then(v => { if (!v) contentCache.delete(key); });
  return p;
}
let fullTextPromise = null;
function loadFullText() {
  if (fullText) return Promise.resolve(fullText);
  if (window.__SEARCH__) return Promise.resolve((fullText = window.__SEARCH__));
  fullTextPromise ||= fetchJSON(`${BASE}/data/search.json?v=${BUILD}`).then(v => (fullText = v)).catch(() => null);
  return fullTextPromise;
}

// ---------- locations ----------
function currentURL() {
  if (PREVIEW) return new URL(location.hash.startsWith('#/') ? location.hash.slice(1) : '/', 'https://preview.local');
  return new URL(location.href);
}
function toURL(href) {
  if (PREVIEW) {
    const h = href.startsWith('#') ? href.slice(1) : href;
    return new URL(h || '/', 'https://preview.local');
  }
  return new URL(href, location.href);
}
const keyOf = url => url.pathname + url.search;

// ---------- head ----------
function setMeta(view, url) {
  document.title = view.title;
  const set = (sel, attr, value) => { const el = $(sel); if (el && value) el.setAttribute(attr, value); };
  set('meta[name="description"]', 'content', view.description);
  set('meta[property="og:title"]', 'content', view.title);
  set('meta[property="og:description"]', 'content', view.description);
  if (!PREVIEW && site) {
    const canonical = site.config.host + pathOf(url);
    set('link[rel="canonical"]', 'href', canonical);
    set('meta[property="og:url"]', 'content', canonical);
  }
  document.body.className = view.bodyClass || '';
}

// ---------- navigation ----------
let navToken = 0;
async function navigate(href, { replace = false, restore = null, fromPop = false } = {}) {
  const url = toURL(href);
  const route = matchRoute(pathOf(url));
  const token = ++navToken;

  if (route.name === 'random') {
    await loadSite();
    const pool = site.posts.filter(p => pathOf(currentURL()) !== postPath(p));
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return navigate(ctx.link(postPath(pick)), { replace });
  }
  const sameDoc = keyOf(url) === currentKey;
  if (sameDoc && url.hash && !fromPop) { scrollToHash(url.hash); if (!PREVIEW) history.pushState({ y: 0 }, '', url); return; }

  let content = null;
  try {
    await loadSite();
    if (route.name === 'post') {
      const post = findPost(site, route.slug);
      if (post) content = await loadContent('posts', post.slug);
      if (post && !content && !PREVIEW) { location.href = url.href; return; } // offline or missing: let the browser try
      if (post && post.slug !== route.slug) { url.pathname = BASE + postPath(post); replace = true; }
    } else if (route.name === 'page') {
      content = await loadContent('pages', route.id);
    }
    if (route.name === 'home' && (url.searchParams.get('keyword') || url.searchParams.get('q'))) await loadFullText();
  } catch (err) {
    if (!PREVIEW) { location.href = url.href; return; }
    throw err;
  }
  if (token !== navToken) return; // a newer navigation won

  if (!fromPop) {
    if (!PREVIEW) history.replaceState({ ...(history.state || {}), y: scrollY }, '');
    const target = PREVIEW ? `#${url.pathname}${url.search}` : url.pathname + url.search + url.hash;
    setHistory(target, replace);
  }

  const view = renderRoute(site, route, ctx, { query: url.searchParams, content, fullText });
  const swap = () => {
    $('#main').innerHTML = view.main;
    setMeta(view, url);
    currentKey = keyOf(url);
    if (restore != null) scrollTo(0, restore);
    else if (url.hash) scrollToHash(url.hash, true);
    else scrollTo(0, 0);
    afterRender(view, url);
  };
  if (document.startViewTransition && !reduceMotion()) {
    document.documentElement.dataset.nav = fromPop ? 'back' : 'forward';
    document.startViewTransition(swap).finished.finally(() => delete document.documentElement.dataset.nav);
  } else swap();
  track(url);
}

// A sandboxed frame (the one-file preview inside another page) may refuse
// pushState; then the preview moves the hash itself and ignores the echo.
let ignoreHash = null;
function setHistory(target, replace) {
  try {
    if (replace) history.replaceState({ y: 0 }, '', target);
    else history.pushState({ y: 0 }, '', target);
  } catch {
    if (!PREVIEW) { location.href = target; return; }
    ignoreHash = target;
    if (replace) location.replace(target); else location.hash = target.slice(1);
  }
}

function scrollToHash(hash, instant = false) {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  const el = id && document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: instant || reduceMotion() ? 'auto' : 'smooth', block: 'start' });
}

function isInternal(a) {
  if (!a || a.target === '_blank' || a.hasAttribute('download') || a.hasAttribute('data-external')) return false;
  const href = a.getAttribute('href');
  if (!href) return false;
  if (PREVIEW) return href.startsWith('#/');
  if (href.startsWith('#')) return false;
  const url = new URL(href, location.href);
  if (url.origin !== location.origin || (BASE && !url.pathname.startsWith(`${BASE}/`) && url.pathname !== BASE)) return false;
  const p = pathOf(url);
  if (/\.(xml|json|png|jpe?g|gif|webp|svg|ico|txt|webmanifest|zip)$/i.test(p)) return false;
  if (/^\/(intro|feed|covers|assets|data)(\/|$)/.test(p)) return false;
  return true;
}

document.addEventListener('click', e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a');
  if (!a) return;
  const href = a.getAttribute('href') || '';
  if (href.startsWith('#') && !href.startsWith('#/')) { // in-page anchors
    e.preventDefault();
    scrollToHash(href);
    if (!PREVIEW) try { history.replaceState(history.state, '', href); } catch {}
    closeToc();
    return;
  }
  if (!isInternal(a)) return;
  e.preventDefault();
  closeMenu();
  navigate(href);
});

addEventListener('popstate', e => {
  if (PREVIEW) return; // the preview follows hashchange instead
  navigate(location.href, { fromPop: true, restore: e.state?.y ?? 0 });
});
if (PREVIEW) addEventListener('hashchange', () => {
  if (ignoreHash && location.hash === ignoreHash) { ignoreHash = null; return; }
  if (location.hash.startsWith('#/') && keyOf(currentURL()) !== currentKey) navigate(location.hash, { fromPop: true });
});

// Prefetch the body of a post when the pointer settles on a link to it.
document.addEventListener('pointerover', e => {
  const a = e.target.closest?.('a[href]');
  if (!a || !site || !isInternal(a)) return;
  const route = matchRoute(pathOf(toURL(a.getAttribute('href'))));
  if (route.name === 'post') { const p = findPost(site, route.slug); if (p) loadContent('posts', p.slug); }
}, { passive: true });

// ---------- after each render ----------
let observers = [];
function afterRender(view, url) {
  observers.forEach(o => o.disconnect());
  observers = [];
  markNav(url);
  setupReveal();
  setupCounters();
  setupSegments();
  if (document.body.classList.contains('is-post') || document.body.classList.contains('is-page')) {
    enhanceProse();
    setupToc();
    setupComments();
  }
  onScroll();
}

function markNav(url) {
  const path = pathOf(url);
  $$('[data-nav] a').forEach(a => {
    const p = a.dataset.path;
    const active = p === '/' ? path === '/' : path === p || path.startsWith(`${p}/`);
    a.classList.toggle('is-active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  moveLens();
}

// The glass lens behind the nav links glides to the hovered or current link.
function moveLens(target) {
  const nav = $('[data-nav]');
  const lens = $('.nav-lens');
  if (!nav || !lens) return;
  const el = target || $('a.is-active', nav);
  if (!el || getComputedStyle(nav).display === 'none' || nav.classList.contains('is-menu')) { lens.style.opacity = '0'; return; }
  const r = el.getBoundingClientRect();
  const n = nav.getBoundingClientRect();
  lens.style.opacity = '1';
  lens.style.transform = `translateX(${r.left - n.left}px)`;
  lens.style.width = `${r.width}px`;
}
document.addEventListener('pointerover', e => { const a = e.target.closest?.('[data-nav] a'); if (a) moveLens(a); });
document.addEventListener('pointerout', e => { if (e.target.closest?.('[data-nav]') && !e.relatedTarget?.closest?.('[data-nav]')) moveLens(); });
addEventListener('resize', () => { moveLens(); setupSegments(); }, { passive: true });

function setupSegments() {
  $$('[data-seg]').forEach(seg => {
    const glider = $('.seg-glider', seg);
    const active = $('.is-active', seg);
    if (!glider || !active) return;
    const s = seg.getBoundingClientRect();
    const r = active.getBoundingClientRect();
    glider.style.transform = `translateX(${r.left - s.left + seg.scrollLeft}px)`;
    glider.style.width = `${r.width}px`;
    glider.style.opacity = '1';
  });
}

function setupReveal() {
  const els = $$('.reveal:not(.in)');
  if (!('IntersectionObserver' in window) || reduceMotion()) { els.forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }, { rootMargin: '0px 0px -40px 0px', threshold: 0 });
  els.forEach(el => io.observe(el));
  observers.push(io);
}

function setupCounters() {
  const els = $$('[data-count]');
  const run = el => {
    const target = Number(el.dataset.count);
    const dec = Number(el.dataset.decimals || 0);
    if (reduceMotion() || !Number.isFinite(target)) return;
    const t0 = performance.now();
    const step = t => {
      const k = Math.min(1, (t - t0) / 1400);
      const v = target * (1 - Math.pow(1 - k, 4));
      el.textContent = dec ? v.toFixed(dec) : Math.round(v).toLocaleString('zh-CN');
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(entries => {
    for (const en of entries) if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
  });
  els.forEach(el => io.observe(el));
  observers.push(io);
}

// ---------- articles ----------
function enhanceProse() {
  const prose = $('#prose') || $('.prose');
  if (!prose) return;
  $$('figure.code', prose).forEach(fig => {
    if ($('.code-bar', fig)) return;
    const bar = document.createElement('div');
    bar.className = 'code-bar';
    bar.innerHTML = `<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="lang">${esc(fig.dataset.lang || 'text')}</span><button type="button" class="code-copy">${icon('copy')}<span>复制</span></button>`;
    fig.prepend(bar);
  });
  $$('img', prose).forEach(img => {
    img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
    if (img.complete) img.classList.add('loaded');
  });
}

document.addEventListener('click', async e => {
  const copyBtn = e.target.closest('.code-copy');
  if (copyBtn) {
    const code = copyBtn.closest('figure').querySelector('code').innerText;
    await copyText(code);
    copyBtn.classList.add('done');
    copyBtn.querySelector('span').textContent = '已复制';
    setTimeout(() => { copyBtn.classList.remove('done'); copyBtn.querySelector('span').textContent = '复制'; }, 1600);
    return;
  }
  const img = e.target.closest('.prose img');
  if (img && !img.closest('a')) { openLightbox(img); return; }
  const share = e.target.closest('[data-share]');
  if (share) {
    const data = { title: share.dataset.title, url: share.dataset.url };
    if (navigator.share) navigator.share(data).catch(() => {});
    else { await copyText(data.url); toast('链接已复制，去分享吧'); }
    return;
  }
  const copyLink = e.target.closest('[data-copy-link]');
  if (copyLink) { await copyText(copyLink.dataset.url); toast('链接已复制'); return; }
  if (e.target.closest('[data-open-search]')) { e.preventDefault(); openSearch(); return; }
  if (e.target.closest('[data-close-search]')) { closeSearch(); return; }
  if (e.target.closest('[data-theme-toggle]')) { cycleTheme(e); return; }
  if (e.target.closest('[data-to-top]')) { scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }); return; }
  if (e.target.closest('[data-toc-toggle]')) { $('.toc')?.classList.toggle('open'); return; }
  if (e.target.closest('[data-menu-toggle]')) { toggleMenu(); return; }
  if (e.target.closest('#lightbox')) closeLightbox();
});

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

function openLightbox(img) {
  const box = $('#lightbox');
  const big = $('img', box);
  big.src = img.currentSrc || img.src;
  big.alt = img.alt;
  box.hidden = false;
  requestAnimationFrame(() => box.classList.add('open'));
}
function closeLightbox() {
  const box = $('#lightbox');
  box.classList.remove('open');
  setTimeout(() => { box.hidden = true; }, reduceMotion() ? 0 : 260);
}

// Table of contents: highlight the section being read.
function setupToc() {
  const links = $$('[data-toc]');
  if (!links.length) return;
  const byId = new Map(links.map(a => [a.dataset.toc, a]));
  const heads = [...byId.keys()].map(id => document.getElementById(id)).filter(Boolean);
  const visible = new Set();
  const io = new IntersectionObserver(entries => {
    for (const en of entries) en.isIntersecting ? visible.add(en.target.id) : visible.delete(en.target.id);
    let current = heads.find(h => visible.has(h.id));
    if (!current) current = [...heads].reverse().find(h => h.getBoundingClientRect().top < 120) || heads[0];
    links.forEach(a => a.classList.toggle('is-active', a.dataset.toc === current?.id));
    const active = byId.get(current?.id);
    const box = $('.toc-list');
    if (active && box && box.scrollHeight > box.clientHeight) {
      const top = active.offsetTop - box.clientHeight / 2;
      box.scrollTo({ top, behavior: 'smooth' });
    }
  }, { rootMargin: '-80px 0px -65% 0px' });
  heads.forEach(h => io.observe(h));
  observers.push(io);
}
function closeToc() { $('.toc')?.classList.remove('open'); }

// Comments (giscus) load only when the reader gets close to them. The discussion
// is looked up by the post's original address, so existing threads stay attached.
function setupComments() {
  const box = $('.giscus');
  if (!box || !site?.config.giscus || PREVIEW) {
    if (box && PREVIEW) box.innerHTML = '<p class="muted">预览里不加载评论；正式站点上这里是 giscus 评论区。</p>';
    return;
  }
  const load = () => {
    const g = site.config.giscus;
    const s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    Object.entries({
      repo: g.repo, 'repo-id': g.repoId, 'category-id': g.categoryId, mapping: 'specific', term: box.dataset.term,
      strict: '0', 'reactions-enabled': '1', 'emit-metadata': '0', 'input-position': 'top',
      theme: giscusTheme(), lang: 'zh-CN', loading: 'lazy',
    }).forEach(([k, v]) => s.setAttribute(`data-${k}`, v));
    s.crossOrigin = 'anonymous';
    s.async = true;
    box.innerHTML = '';
    box.append(s);
  };
  const io = new IntersectionObserver(en => { if (en[0].isIntersecting) { io.disconnect(); load(); } }, { rootMargin: '600px 0px' });
  io.observe(box);
  observers.push(io);
}
const giscusTheme = () => (effectiveTheme() === 'dark' ? 'transparent_dark' : 'noborder_light');

// ---------- scrolling ----------
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const y = scrollY;
    document.documentElement.classList.toggle('scrolled', y > 12);
    const max = document.documentElement.scrollHeight - innerHeight;
    const page = max > 0 ? Math.min(1, y / max) : 0;
    const top = $('[data-to-top]');
    if (top) { top.classList.toggle('show', y > 640); top.style.setProperty('--p', page); }
    const bar = $('.progress span');
    const prose = $('#prose');
    if (bar && prose) {
      const r = prose.getBoundingClientRect();
      const total = r.height - innerHeight * 0.6;
      const k = total > 0 ? Math.min(1, Math.max(0, (innerHeight * 0.2 - r.top) / total)) : 0;
      bar.style.transform = `scaleX(${k})`;
    }
  });
}
addEventListener('scroll', onScroll, { passive: true });

// ---------- light and glass ----------
// A soft light follows the pointer across the background, and glass cards tilt
// toward it with a moving sheen. Skipped for touch and reduced motion.
let lightRAF = 0;
let lastPointer = null;
addEventListener('pointermove', e => {
  if (e.pointerType === 'touch' || reduceMotion()) return;
  lastPointer = e;
  if (lightRAF) return;
  lightRAF = requestAnimationFrame(() => {
    lightRAF = 0;
    const p = lastPointer;
    const root = document.documentElement.style;
    root.setProperty('--mx', `${p.clientX}px`);
    root.setProperty('--my', `${p.clientY}px`);
    const card = p.target.closest?.('.tilt');
    if (card) {
      const r = card.getBoundingClientRect();
      const x = (p.clientX - r.left) / r.width;
      const y = (p.clientY - r.top) / r.height;
      card.style.setProperty('--px', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--py', `${(y * 100).toFixed(1)}%`);
      card.style.setProperty('--rx', `${((0.5 - y) * 7).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${((x - 0.5) * 9).toFixed(2)}deg`);
      card.classList.add('is-lit');
    }
  });
}, { passive: true });
document.addEventListener('pointerout', e => {
  const card = e.target.closest?.('.tilt');
  if (card && !card.contains(e.relatedTarget)) {
    card.classList.remove('is-lit');
    card.style.removeProperty('--rx');
    card.style.removeProperty('--ry');
  }
});

// ---------- theme ----------
const THEMES = ['auto', 'light', 'dark'];
const storedTheme = () => { try { return localStorage.getItem('theme') || 'auto'; } catch { return 'auto'; } };
const effectiveTheme = () => {
  const t = storedTheme();
  return t === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t;
};
function applyTheme(t) {
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t);
  root.dataset.themeChoice = t;
  $('meta[name="theme-color"]')?.setAttribute('content', effectiveTheme() === 'dark' ? '#0b0d16' : '#eef0f6');
  const frame = $('iframe.giscus-frame');
  frame?.contentWindow?.postMessage({ giscus: { setConfig: { theme: giscusTheme() } } }, 'https://giscus.app');
}
function cycleTheme(e) {
  const next = THEMES[(THEMES.indexOf(storedTheme()) + 1) % THEMES.length];
  const apply = () => { try { localStorage.setItem('theme', next); } catch {} applyTheme(next); };
  const btn = e.target.closest('[data-theme-toggle]').getBoundingClientRect();
  const root = document.documentElement.style;
  root.setProperty('--tx', `${btn.left + btn.width / 2}px`);
  root.setProperty('--ty', `${btn.top + btn.height / 2}px`);
  toast({ auto: '跟随系统', light: '浅色', dark: '深色' }[next]);
  if (document.startViewTransition && !reduceMotion()) {
    document.documentElement.dataset.nav = 'theme';
    document.startViewTransition(apply).finished.finally(() => delete document.documentElement.dataset.nav);
  } else apply();
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(storedTheme()));

// ---------- menu (narrow screens) ----------
function toggleMenu(force) {
  const nav = $('.nav');
  const open = force ?? !nav.classList.contains('menu-open');
  nav.classList.toggle('menu-open', open);
  $('[data-menu-toggle]')?.setAttribute('aria-expanded', String(open));
}
const closeMenu = () => toggleMenu(false);

// ---------- search palette ----------
let results = [];
let selected = 0;
function openSearch() {
  const pal = $('#palette');
  pal.hidden = false;
  requestAnimationFrame(() => pal.classList.add('open'));
  const input = $('#palette-q');
  input.value = '';
  input.focus();
  loadSite().then(() => runSearch(''));
  loadFullText().then(() => runSearch(input.value));
}
function closeSearch() {
  const pal = $('#palette');
  pal.classList.remove('open');
  setTimeout(() => { pal.hidden = true; }, reduceMotion() ? 0 : 200);
}
function highlight(text, words) {
  let out = esc(text);
  for (const w of words) if (w) out = out.replace(new RegExp(esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`);
  return out;
}
function snippet(text, word) {
  const i = text.toLowerCase().indexOf(word);
  if (i < 0) return '';
  const start = Math.max(0, i - 24);
  return (start ? '…' : '') + text.slice(start, i + word.length + 48) + '…';
}
function runSearch(q) {
  if (!site) return;
  const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const list = $('#palette-list');
  if (!words.length) {
    results = [
      ...site.config.nav.map(n => ({ href: n.href, title: n.label, kind: '页面' })),
      ...site.posts.slice(0, 6).map(p => ({ href: postPath(p), title: p.title, kind: fmtDate(p.created) })),
    ];
  } else {
    const scored = [];
    for (const p of site.posts) {
      const text = fullText?.[p.slug] || '';
      let score = 0;
      let hint = '';
      for (const w of words) {
        const t = p.title.toLowerCase().includes(w) ? 10 : 0;
        const g = p.tags.some(x => x.name.toLowerCase().includes(w)) || (p.category?.name || '').toLowerCase().includes(w) ? 6 : 0;
        const d = p.description.toLowerCase().includes(w) ? 4 : 0;
        const f = text.toLowerCase().includes(w) ? 2 : 0;
        if (!(t || g || d || f)) { score = 0; break; }
        score += t + g + d + f;
        if (!t && !hint) hint = snippet(d ? p.description : text, w);
      }
      if (score) scored.push({ href: postPath(p), title: p.title, kind: p.category?.name || '文章', hint, score });
    }
    scored.sort((a, b) => b.score - a.score);
    const tags = site.tags.filter(t => words.every(w => t.name.toLowerCase().includes(w))).slice(0, 4)
      .map(t => ({ href: `/?tag_id=${t.id}`, title: `#${t.name}`, kind: `${t.count} 篇` }));
    results = [...scored.slice(0, 12), ...tags];
    if (!results.length) results = [{ href: `/?keyword=${encodeURIComponent(q.trim())}`, title: `在全部文章里找“${q.trim()}”`, kind: '全文' }];
  }
  selected = 0;
  list.innerHTML = results.map((r, i) => `<li role="option" aria-selected="${i === 0}" data-i="${i}"><a href="${esc(ctx.link(r.href))}">
    <span class="r-title">${highlight(r.title, words)}</span>${r.hint ? `<span class="r-hint">${highlight(r.hint, words)}</span>` : ''}<span class="r-kind">${esc(r.kind)}</span></a></li>`).join('');
}
function moveSelection(d) {
  const items = $$('#palette-list li');
  if (!items.length) return;
  selected = (selected + d + items.length) % items.length;
  items.forEach((li, i) => li.setAttribute('aria-selected', String(i === selected)));
  items[selected].scrollIntoView({ block: 'nearest' });
}
document.addEventListener('input', e => { if (e.target.id === 'palette-q') runSearch(e.target.value); });
document.addEventListener('keydown', e => {
  const pal = $('#palette');
  const open = pal && !pal.hidden;
  if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !open && !/input|textarea|select/i.test(e.target.tagName))) {
    e.preventDefault();
    open ? closeSearch() : openSearch();
    return;
  }
  if (e.key === 'Escape') {
    if (open) closeSearch();
    if (!$('#lightbox').hidden) closeLightbox();
    closeToc(); closeMenu();
    return;
  }
  if (!open) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1); }
  if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1); }
  if (e.key === 'Enter') {
    const r = results[selected];
    if (r) { e.preventDefault(); closeSearch(); navigate(ctx.link(r.href)); }
  }
});
document.addEventListener('click', e => { if (e.target.closest('#palette-list a')) closeSearch(); });

// ---------- analytics ----------
const LOCAL = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])|\.local$/;
let gaReady = false;
function setupAnalytics() {
  const id = site?.config.analytics || document.documentElement.dataset.ga;
  if (!id || PREVIEW || LOCAL.test(location.hostname)) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.append(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id);
  gaReady = true;
}
function track(url) {
  if (gaReady) window.gtag('event', 'page_view', { page_location: url.href, page_path: url.pathname + url.search, page_title: document.title });
}

// ---------- boot ----------
async function boot() {
  try { history.scrollRestoration = 'manual'; } catch {}
  applyTheme(storedTheme());
  const url = currentURL();
  currentKey = keyOf(url);
  const route = matchRoute(pathOf(url));
  const main = $('#main');
  // Pages the host could not pre-render for this exact address: the preview
  // shell, filtered home pages, the 404 page (old addresses), random.
  const needsRender = PREVIEW || !main.children.length
    || (route.name === 'home' && [...url.searchParams.keys()].some(k => ['tag_id', 'category_id', 'keyword', 'q'].includes(k)))
    || (route.name === 'reading' && url.searchParams.get('status'))
    || document.body.classList.contains('is-404') || route.name === 'random';
  if (needsRender) {
    await navigate(PREVIEW ? `#${url.pathname}${url.search}` : url.href, { replace: true });
  } else {
    afterRender({}, url);
    if (url.hash) requestAnimationFrame(() => scrollToHash(url.hash, true));
  }
  loadSite().then(() => { setupAnalytics(); }).catch(() => {});
  if (!PREVIEW && 'serviceWorker' in navigator && !LOCAL.test(location.hostname)) {
    addEventListener('load', () => navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).catch(() => {}));
  }
  document.documentElement.classList.add('ready');
}
boot();
