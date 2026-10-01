// Markdown to HTML at build time. Every post was written against marked (the
// parser inside editor.md, the old admin editor) with gfm + breaks +
// smartypants, so marked renders them here too and they read the way their
// author saw them. Code is highlighted now, so readers download no highlighter.
import { Marked, Renderer } from 'marked';
import hljs from 'highlight.js';

const LANG_ALIASES = { yml: 'yaml', sh: 'bash', shell: 'bash', zsh: 'bash', cmd: 'dos', golang: 'go', js: 'javascript', ts: 'typescript', py: 'python' };

// editor.md's FontAwesome shortcodes, shown as the closest emoji (the font is gone).
const FA_EMOJI = {
  'hand-o-right': '👉', 'hand-o-left': '👈', 'hand-o-up': '👆', 'hand-o-down': '👇',
  check: '✅', 'check-circle': '✅', 'check-square': '✅', times: '❌', 'times-circle': '❌', close: '❌',
  warning: '⚠️', 'exclamation-triangle': '⚠️', 'exclamation-circle': '❗', 'info-circle': 'ℹ️',
  'question-circle': '❓', star: '⭐', heart: '❤️', 'thumbs-up': '👍', 'thumbs-o-up': '👍',
  'thumbs-down': '👎', 'lightbulb-o': '💡', bolt: '⚡', fire: '🔥', rocket: '🚀', bug: '🐛',
  link: '🔗', lock: '🔒', key: '🔑', book: '📖', pencil: '✏️', flag: '🚩', bell: '🔔',
  'smile-o': '🙂', 'frown-o': '🙁', coffee: '☕', github: '🐙', 'arrow-right': '➡️', 'arrow-left': '⬅️',
  'arrow-up': '⬆️', 'arrow-down': '⬇️', 'chevron-circle-right': '▶️', 'chevron-right': '▶️', 'angle-right': '▶️',
  envelope: '✉️', 'envelope-o': '✉️', calendar: '📅', 'clock-o': '🕒', comment: '💬', comments: '💬',
  home: '🏠', search: '🔍', cog: '⚙️', gear: '⚙️', download: '⬇️', upload: '⬆️', tag: '🏷️', tags: '🏷️',
};

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ESCAPES[c]);

export function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

export function plainText(html) {
  return decodeEntities(String(html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

// Same rules as the old renderer (and its article.js), so #anchors in old links still land.
export function slugify(text) {
  return String(text).trim().toLowerCase().split(/\s+/).join('-')
    .replace(/[^\p{L}\p{N}_-]+/gu, '').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
}

// marked's smartypants rules: curly quotes, "--" to an em dash, "..." to an ellipsis.
function smartypants(text) {
  return text
    .replace(/--/g, '—')
    .replace(/(^|[-—/([{"\s])'/g, '$1‘').replace(/'/g, '’')
    .replace(/(^|[-—/([{‘\s])"/g, '$1“').replace(/"/g, '”')
    .replace(/\.\.\./g, '…');
}

function shortcodes(text) {
  return text.replace(/:(fa|tw)-([a-z0-9-]+):/g, (m, kind, name) => {
    if (kind === 'fa') return FA_EMOJI[name] ?? '';
    const points = name.split('-').map(h => parseInt(h, 16));
    if (points.some(p => !Number.isFinite(p) || p > 0x10ffff)) return m;
    const s = String.fromCodePoint(...points);
    return points.length === 1 ? s + '️' : s;
  });
}

// Authors may write inline HTML, but never active content.
export function sanitizeHTML(html) {
  return String(html)
    .replace(/<\s*(script|style|iframe|object|embed|form|base|meta|link)\b[\s\S]*?(<\s*\/\s*\1\s*>|$)/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|base|meta|link)\b[^>]*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|src|xlink:href|formaction)\s*=\s*("|')\s*(javascript|vbscript|data:text\/html)[^"']*\2/gi, ' $1="#"');
}

const safeURL = href => (/^\s*(javascript|vbscript|data:text\/html)/i.test(href || '') ? '#' : href);
const isExternal = href => /^https?:\/\//i.test(href) && !/^https?:\/\/(blog\.)?whrss\.com(\/|$)/i.test(href);

export function renderMarkdown(source) {
  const toc = [];
  const seen = new Set();
  let images = 0;
  const marked = new Marked({ gfm: true, breaks: true });

  marked.use({
    renderer: {
      text(token) {
        if (token.tokens) return this.parser.parseInline(token.tokens);
        if (token.escaped) return token.text;
        return escapeHTML(shortcodes(smartypants(token.text)));
      },
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const label = plainText(inner);
        const base = slugify(label) || `section-${toc.length + 1}`;
        let id = base;
        for (let n = 2; seen.has(id); n++) id = `${base}-${n}`;
        seen.add(id);
        toc.push({ level: depth, id, text: label });
        return `<h${depth} id="${escapeHTML(id)}"><a class="anchor" href="#${escapeHTML(id)}" aria-hidden="true" tabindex="-1">#</a>${inner}</h${depth}>\n`;
      },
      code({ text, lang }) {
        const name = (lang || '').trim().split(/\s+/)[0].toLowerCase();
        const language = LANG_ALIASES[name] || name;
        let body;
        if (language && hljs.getLanguage(language)) {
          body = hljs.highlight(text, { language, ignoreIllegals: true }).value;
        } else {
          body = escapeHTML(text);
        }
        const label = name ? escapeHTML(name) : '';
        return `<figure class="code" data-lang="${label}"><pre><code class="hljs${language && hljs.getLanguage(language) ? ` language-${escapeHTML(language)}` : ''}">${body}</code></pre></figure>\n`;
      },
      codespan({ text }) {
        return `<code>${text}</code>`;
      },
      image({ href, title, text }) {
        const src = safeURL(href);
        const eager = images++ === 0;
        const t = title ? ` title="${escapeHTML(title)}"` : '';
        return `<img src="${escapeHTML(src)}" alt="${escapeHTML(text)}"${t} loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens);
        const url = safeURL(href);
        const t = title ? ` title="${escapeHTML(title)}"` : '';
        const ext = isExternal(url) ? ' target="_blank" rel="noopener"' : '';
        return `<a href="${escapeHTML(url)}"${t}${ext}>${inner}</a>`;
      },
      table(token) {
        // Let marked build the table, then give it a scrolling frame on narrow screens.
        const html = Renderer.prototype.table.call(this, token);
        return `<div class="table-wrap">${html}</div>\n`;
      },
      html({ text }) {
        return sanitizeHTML(text);
      },
      checkbox({ checked }) {
        return `<input type="checkbox" disabled${checked ? ' checked' : ''}>`;
      },
    },
  });

  // Same clean-up marked did in the browser before lexing.
  const src = String(source).replace(/\r\n|\r/g, '\n').replace(/ /g, ' ').replace(/␤/g, '\n');
  const html = marked.parse(src).replace(/<li>(\s*(?:<p>)?\s*<input type="checkbox")/g, '<li class="task-list-item">$1');
  return { html, toc };
}
