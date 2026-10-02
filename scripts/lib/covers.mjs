// Cover art for every post, drawn at build time as SVG: a dark "terminal /
// blueprint" frame with a seeded background (grid, traces, dust) and a motif
// that says what the post is about. scripts/covers.json picks the motif and
// the caption for each post; posts it doesn't list get one from their tags.
//
// The covers are dark in both site themes, like code blocks, and use only a
// generic monospace stack: an SVG shown through <img> can't load web fonts.

const W = 1200;
const H = 525;
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
const SANS = "-apple-system, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif";
const SERIF = "'Songti SC', 'STSong', 'Noto Serif CJK SC', serif";

// cold palette; each post leans on one of these as its signal colour
const TINTS = [
  { a: '#3fe0ff', b: '#2f7bff' }, // cyan / blue
  { a: '#5aa8ff', b: '#3fe0ff' }, // blue / cyan
  { a: '#7ce7ff', b: '#4d6bff' }, // ice / indigo-blue
  { a: '#2ed8c3', b: '#3a8dff' }, // teal / blue
  { a: '#9cc3ff', b: '#36c8ff' }, // steel / cyan
];
const INK = '#d6e6f5';
const DIM = '#5f7690';
const LINE = '#1a2b3d';
const AMBER = '#ffb547';

const x = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function seedOf(s) {
  let h = 2166136261;
  for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = seed || 1;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];
const f = n => Number(n.toFixed(1));

// ---------- background ----------
function background(r, t, uid) {
  let traces = '';
  for (let i = 0; i < 9; i++) {
    let px = f(r() * W), py = f(r() * H);
    let d = `M${px} ${py}`;
    for (let k = 0; k < 3 + Math.floor(r() * 3); k++) {
      if (k % 2) px = f(Math.min(W, Math.max(0, px + (r() - 0.5) * 360))); else py = f(Math.min(H, Math.max(0, py + (r() - 0.5) * 220)));
      d += ` L${px} ${py}`;
    }
    traces += `<path d="${d}" fill="none" stroke="${t.b}" stroke-opacity="0.16" stroke-width="1.2"/><circle cx="${px}" cy="${py}" r="2.6" fill="${t.a}" fill-opacity="0.45"/>`;
  }
  let dust = '';
  for (let i = 0; i < 60; i++) dust += `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(0.6 + r() * 1.2)}" fill="${INK}" fill-opacity="${f(0.08 + r() * 0.22)}"/>`;
  const gx = f(200 + r() * 800), gy = f(80 + r() * 300);
  return `<defs>
    <linearGradient id="bg${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b121c"/><stop offset="1" stop-color="#060a10"/></linearGradient>
    <radialGradient id="glow${uid}" cx="${gx}" cy="${gy}" r="520" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${t.b}" stop-opacity="0.32"/><stop offset="1" stop-color="${t.b}" stop-opacity="0"/></radialGradient>
    <pattern id="grid${uid}" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${LINE}" stroke-width="1"/></pattern>
    <linearGradient id="fade${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060a10" stop-opacity="0"/><stop offset="1" stop-color="#060a10" stop-opacity="0.75"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg${uid})"/>
  <rect width="${W}" height="${H}" fill="url(#grid${uid})" opacity="0.7"/>
  <rect width="${W}" height="${H}" fill="url(#glow${uid})"/>
  ${traces}${dust}`;
}

function caption(text, t, { y = H - 44 } = {}) {
  if (!text) return '';
  return `<text x="56" y="${y}" font-family="${MONO}" font-size="24" fill="${t.a}" letter-spacing="0.5"><tspan fill="${DIM}">// </tspan>${x(text)}</text>`;
}
function corners(t) {
  const c = (px, py, sx, sy) => `<path d="M${px} ${py + sy * 22}V${py}H${px + sx * 22}" fill="none" stroke="${t.a}" stroke-opacity="0.6" stroke-width="2"/>`;
  return c(24, 24, 1, 1) + c(W - 24, 24, -1, 1) + c(24, H - 24, 1, -1) + c(W - 24, H - 24, -1, -1);
}
function windowFrame(px, py, w, h, title, t) {
  return `<g>
    <rect x="${px}" y="${py}" width="${w}" height="${h}" rx="14" fill="#0d1622" fill-opacity="0.92" stroke="${t.b}" stroke-opacity="0.35"/>
    <rect x="${px}" y="${py}" width="${w}" height="40" rx="14" fill="#122031"/><rect x="${px}" y="${py + 26}" width="${w}" height="14" fill="#122031"/>
    <circle cx="${px + 24}" cy="${py + 20}" r="6" fill="#ff5f57" fill-opacity="0.85"/><circle cx="${px + 44}" cy="${py + 20}" r="6" fill="#febc2e" fill-opacity="0.85"/><circle cx="${px + 64}" cy="${py + 20}" r="6" fill="#28c840" fill-opacity="0.85"/>
    <text x="${px + w / 2}" y="${py + 26}" text-anchor="middle" font-family="${MONO}" font-size="15" fill="${DIM}">${x(title)}</text>
  </g>`;
}

// ---------- motifs ----------
// Each returns SVG for the area right of / around the caption. Some take
// `lines` from covers.json; all have sensible defaults.
const M = {
  code(r, t, c) {
    const lines = c.lines || ['func main() {', '  ctx := context.Background()', '  if err := run(ctx); err != nil {', '    log.Fatal(err)', '  }', '}'];
    const px = 560, py = 70, w = 580;
    const kw = /\b(func|return|if|err|nil|for|range|go|defer|select|case|type|struct|var|const|package|import|chan|SELECT|FROM|WHERE|INSERT|UPDATE|INTO|VALUES|ON|BEGIN|COMMIT|message|oneof|string|int64)\b/g;
    const body = lines.map((l, i) => {
      const esc = x(l).replace(kw, '<tspan fill="' + t.a + '">$1</tspan>').replace(/(&quot;[^&]*&quot;)/g, `<tspan fill="#9ee6b8">$1</tspan>`).replace(/(\/\/.*)$/, `<tspan fill="${DIM}">$1</tspan>`);
      return `<text x="${px + 56}" y="${py + 84 + i * 34}" font-family="${MONO}" font-size="21" fill="${INK}"><tspan fill="${DIM}" font-size="16">${String(i + 1).padStart(2, ' ')}  </tspan>${esc}</text>`;
    }).join('');
    const h = 110 + lines.length * 34;
    const cur = lines.length - 1;
    return windowFrame(px, py, w, h, c.file || 'main.go', t) + body +
      `<rect x="${px + 56 + 26 + (lines[cur].length + 1) * 12.6}" y="${py + 66 + cur * 34}" width="11" height="24" fill="${t.a}" opacity="0.8"/>`;
  },
  terminal(r, t, c) {
    const lines = c.lines || ['$ ./run', 'ok'];
    const px = 520, py = 80, w = 620;
    const body = lines.map((l, i) => {
      const prompt = l.startsWith('$ ');
      const text = prompt ? `<tspan fill="${t.a}">$</tspan> ${x(l.slice(2))}` : `<tspan fill="${l.startsWith('!') ? AMBER : DIM}">${x(l.replace(/^!/, ''))}</tspan>`;
      return `<text x="${px + 30}" y="${py + 82 + i * 34}" font-family="${MONO}" font-size="21" fill="${INK}">${text}</text>`;
    }).join('');
    const h = 100 + lines.length * 34;
    return windowFrame(px, py, w, h, c.file || 'zsh', t) + body + `<rect x="${px + 30}" y="${py + 64 + lines.length * 34}" width="12" height="24" fill="${t.a}" opacity="0.85"/>`;
  },
  database(r, t, c) {
    const cyl = (cx, cy, w, h, op = 1) => `<g opacity="${op}"><path d="M${cx - w / 2} ${cy}v${h}a${w / 2} ${w / 7} 0 0 0 ${w} 0v-${h}" fill="#0f1b2a" stroke="${t.b}" stroke-width="2"/><ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${w / 7}" fill="#13243a" stroke="${t.a}" stroke-width="2"/><path d="M${cx - w / 2} ${cy + h / 2}a${w / 2} ${w / 7} 0 0 0 ${w} 0" fill="none" stroke="${t.b}" stroke-opacity="0.6"/></g>`;
    if (c.variant === 'shards') {
      let s = cyl(640, 170, 150, 150);
      const outs = [[880, 90], [960, 230], [880, 370], [1060, 140], [1060, 320]];
      for (const [ox, oy] of outs) s += `<path d="M720 245 C 800 245, ${ox - 80} ${oy + 40}, ${ox - 45} ${oy + 40}" fill="none" stroke="${t.a}" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="6 6"/>` + cyl(ox, oy, 80, 70);
      s += outs.map(([ox, oy], i) => `<text x="${ox}" y="${oy + 105}" text-anchor="middle" font-family="${MONO}" font-size="15" fill="${DIM}">t_${i}</text>`).join('');
      return s;
    }
    if (c.variant === 'messages') {
      let s = cyl(1000, 160, 170, 180);
      for (let i = 0; i < 5; i++) {
        const y = 120 + i * 62, w = 220 + (i % 2) * 70, left = i % 2 === 0;
        s += `<rect x="${left ? 560 : 820 - w}" y="${y}" width="${w}" height="40" rx="20" fill="${left ? '#13243a' : t.b}" fill-opacity="${left ? 1 : 0.35}" stroke="${t.a}" stroke-opacity="0.35"/>`;
        s += `<rect x="${(left ? 580 : 840 - w)}" y="${y + 16}" width="${w * 0.6}" height="8" rx="4" fill="${INK}" fill-opacity="0.35"/>`;
      }
      return s + `<path d="M830 250 H 905" stroke="${t.a}" stroke-width="2" marker-end="url(#arrow)"/>`;
    }
    return cyl(760, 140, 200, 220) + cyl(1000, 190, 150, 170, 0.8);
  },
  network(r, t, c) {
    const nodes = c.nodes || ['client', 'proxy', 'server'];
    const n = nodes.length;
    const pts = nodes.map((name, i) => ({ name, px: 560 + (i * 560) / Math.max(1, n - 1), py: 240 + (i % 2 ? -90 : 60) * (n > 3 ? 1 : 0.6) }));
    let s = '';
    for (let i = 0; i < n - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      s += `<path d="M${a.px} ${a.py} L${b.px} ${b.py}" stroke="${t.b}" stroke-width="2.5" stroke-opacity="0.7"/>`;
      s += `<path d="M${a.px} ${a.py} L${b.px} ${b.py}" stroke="${t.a}" stroke-width="3" stroke-dasharray="4 18" stroke-linecap="round"/>`;
    }
    if (c.dashedTo) { const a = pts[c.dashedTo[0]], b = pts[c.dashedTo[1]]; s += `<path d="M${a.px} ${a.py} Q ${(a.px + b.px) / 2} ${Math.max(a.py, b.py) + 150} ${b.px} ${b.py}" fill="none" stroke="${DIM}" stroke-width="2" stroke-dasharray="8 8"/>`; }
    for (const p of pts) {
      s += `<circle cx="${p.px}" cy="${p.py}" r="34" fill="#0f1b2a" stroke="${t.a}" stroke-width="2.5"/><circle cx="${p.px}" cy="${p.py}" r="10" fill="${t.a}" fill-opacity="0.85"/>`;
      s += `<text x="${p.px}" y="${p.py + 64}" text-anchor="middle" font-family="${MONO}" font-size="18" fill="${INK}">${x(p.name)}</text>`;
    }
    return s;
  },
  flow(r, t, c) {
    const lanes = c.nodes || ['order', 'stock', 'pay'];
    const steps = c.steps || [[0, 1, 'prepare'], [1, 0, 'yes'], [0, 2, 'prepare'], [2, 0, 'yes'], [0, 1, 'commit'], [0, 2, 'commit']];
    const lx = i => 600 + (i * 480) / Math.max(1, lanes.length - 1);
    let s = lanes.map((l, i) => `<rect x="${lx(i) - 62}" y="70" width="124" height="40" rx="10" fill="#13243a" stroke="${t.a}" stroke-opacity="0.6"/><text x="${lx(i)}" y="96" text-anchor="middle" font-family="${MONO}" font-size="17" fill="${INK}">${x(l)}</text><path d="M${lx(i)} 112 V 440" stroke="${LINE}" stroke-width="2" stroke-dasharray="4 6"/>`).join('');
    steps.forEach(([a, b, label], i) => {
      const y = 150 + i * 46, x1 = lx(a), x2 = lx(b), dir = x2 > x1 ? 1 : -1;
      s += `<path d="M${x1} ${y} H ${x2 - dir * 10}" stroke="${i % 2 ? t.b : t.a}" stroke-width="2.2"/><path d="M${x2 - dir * 12} ${y - 6} L ${x2} ${y} L ${x2 - dir * 12} ${y + 6}" fill="none" stroke="${i % 2 ? t.b : t.a}" stroke-width="2.2"/>`;
      s += `<text x="${(x1 + x2) / 2}" y="${y - 8}" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${DIM}">${x(label)}</text>`;
    });
    return s;
  },
  signal(r, t, c) {
    let d = 'M540 260';
    for (let px = 540; px <= 900; px += 6) d += ` L${px} ${f(260 + Math.sin((px - 540) / 22) * 70 * Math.exp(-(px - 540) / 900))}`;
    let s = `<path d="${d}" fill="none" stroke="${t.a}" stroke-width="3"/>`;
    s += `<path d="M900 120 V 400" stroke="${AMBER}" stroke-width="2" stroke-dasharray="6 6"/><text x="912" y="140" font-family="${MONO}" font-size="20" fill="${AMBER}">${x(c.mark || 'SIGTERM')}</text>`;
    let d2 = `M900 260`;
    for (let px = 900; px <= 1140; px += 6) d2 += ` L${px} ${f(260 + Math.sin((px - 540) / 22) * 70 * Math.exp(-(px - 900) / 60))}`;
    s += `<path d="${d2}" fill="none" stroke="${t.b}" stroke-width="3" stroke-opacity="0.8"/>`;
    return s + `<text x="1140" y="320" text-anchor="end" font-family="${MONO}" font-size="18" fill="${DIM}">${x(c.after || 'drain → exit 0')}</text>`;
  },
  deadlock(r, t, c) {
    const box = (bx, by, label) => `<rect x="${bx}" y="${by}" width="170" height="70" rx="12" fill="#0f1b2a" stroke="${t.a}" stroke-width="2"/><text x="${bx + 85}" y="${by + 43}" text-anchor="middle" font-family="${MONO}" font-size="20" fill="${INK}">${x(label)}</text>`;
    const [a, b] = c.nodes || ['goroutine A', 'goroutine B'];
    let s = box(600, 110, a) + box(930, 330, b) + box(930, 110, 'mutex 1') + box(600, 330, 'mutex 2');
    const arr = (d, col) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.5"/>`;
    s += arr('M770 145 H 925', t.a) + arr('M1015 180 V 325', AMBER) + arr('M925 365 H 775', t.a) + arr('M685 330 V 185', AMBER);
    s += `<text x="852" y="262" text-anchor="middle" font-family="${MONO}" font-size="40" fill="${AMBER}">⟳</text>`;
    return s;
  },
  key(r, t, c) {
    let s = `<g transform="translate(560 170)"><circle cx="90" cy="90" r="80" fill="none" stroke="${t.a}" stroke-width="10"/><circle cx="90" cy="90" r="30" fill="none" stroke="${t.a}" stroke-width="6"/><path d="M170 90 H 470 M 400 90 V 140 M 440 90 V 130" stroke="${t.a}" stroke-width="14" stroke-linecap="round"/></g>`;
    let hex = '';
    for (let i = 0; i < 4; i++) {
      let line = '';
      for (let k = 0; k < 8; k++) line += Math.floor(r() * 256).toString(16).padStart(2, '0').toUpperCase() + (k < 7 ? ':' : '');
      hex += `<text x="580" y="${400 + i * 26}" font-family="${MONO}" font-size="17" fill="${DIM}">${line}</text>`;
    }
    return s + hex + `<text x="1140" y="130" text-anchor="end" font-family="${MONO}" font-size="20" fill="${INK}">${x(c.mark || 'SHA-256')}</text>`;
  },
  heatmap(r, t, c) {
    let s = '';
    for (let col = 0; col < 26; col++) for (let row = 0; row < 7; row++) {
      const v = r();
      const op = v < 0.35 ? 0.08 : v < 0.6 ? 0.3 : v < 0.85 ? 0.6 : 0.95;
      s += `<rect x="${560 + col * 22}" y="${120 + row * 22}" width="18" height="18" rx="4" fill="${t.a}" fill-opacity="${op}"/>`;
    }
    for (let i = 0; i < 12; i++) { const h = 20 + r() * 90; s += `<rect x="${560 + i * 47}" y="${f(420 - h)}" width="30" height="${f(h)}" rx="5" fill="${t.b}" fill-opacity="0.7"/>`; }
    return s;
  },
  cloud(r, t, c) {
    let s = `<path d="M690 260 a70 70 0 0 1 40 -128 a95 95 0 0 1 180 -20 a80 80 0 0 1 120 70 a64 64 0 0 1 -10 128 Z" fill="#0f1b2a" stroke="${t.a}" stroke-width="3"/>`;
    for (let i = 0; i < 6; i++) s += `<rect x="${760 + (i % 3) * 90}" y="${180 + Math.floor(i / 3) * 60}" width="70" height="44" rx="8" fill="${t.b}" fill-opacity="${0.25 + r() * 0.4}" stroke="${t.a}" stroke-opacity="0.5"/>`;
    s += `<path d="M880 330 V 420" stroke="${t.a}" stroke-width="2.5" stroke-dasharray="5 7"/><rect x="800" y="420" width="160" height="44" rx="10" fill="#13243a" stroke="${t.a}" stroke-opacity="0.6"/><text x="880" y="449" text-anchor="middle" font-family="${MONO}" font-size="18" fill="${INK}">${x(c.mark || 'bucket/')}</text>`;
    return s;
  },
  chip(r, t, c) {
    let s = `<rect x="740" y="140" width="220" height="220" rx="18" fill="#0f1b2a" stroke="${t.a}" stroke-width="3"/><rect x="790" y="190" width="120" height="120" rx="8" fill="${t.b}" fill-opacity="0.25" stroke="${t.a}" stroke-opacity="0.6"/>`;
    for (let i = 0; i < 7; i++) {
      const o = 160 + i * 30, ox = 760 + i * 30;
      s += `<path d="M${ox} 140 V 100 M${ox} 360 V 400 M740 ${o} H 700 M960 ${o} H 1000" stroke="${t.b}" stroke-width="3" stroke-opacity="0.8"/>`;
    }
    s += `<text x="850" y="258" text-anchor="middle" font-family="${MONO}" font-size="22" fill="${INK}">${x(c.mark || 'x86_64')}</text>`;
    return s;
  },
  neural(r, t, c) {
    const layers = [3, 5, 5, 2];
    const pts = layers.map((n, li) => Array.from({ length: n }, (_, k) => [600 + li * 170, 260 + (k - (n - 1) / 2) * 70]));
    let s = '';
    for (let li = 0; li < pts.length - 1; li++) for (const a of pts[li]) for (const b of pts[li + 1]) s += `<path d="M${a[0]} ${a[1]} L${b[0]} ${b[1]}" stroke="${t.b}" stroke-opacity="${f(0.15 + r() * 0.4)}" stroke-width="1.5"/>`;
    for (const layer of pts) for (const [cx, cy] of layer) s += `<circle cx="${cx}" cy="${cy}" r="14" fill="#0f1b2a" stroke="${t.a}" stroke-width="2.5"/><circle cx="${cx}" cy="${cy}" r="5" fill="${t.a}" fill-opacity="${f(0.3 + r() * 0.7)}"/>`;
    return s;
  },
  feed(r, t, c) {
    let s = `<circle cx="720" cy="360" r="22" fill="${t.a}"/>`;
    for (let i = 1; i <= 3; i++) s += `<path d="M${720 - 10} ${360 - 70 * i} A ${70 * i} ${70 * i} 0 0 1 ${720 + 70 * i - 10} 360" fill="none" stroke="${t.a}" stroke-width="18" stroke-opacity="${1 - i * 0.2}" stroke-linecap="round"/>`;
    for (let i = 0; i < 4; i++) s += `<rect x="960" y="${120 + i * 70}" width="180" height="46" rx="10" fill="#13243a" stroke="${t.b}" stroke-opacity="0.5"/><rect x="976" y="${136 + i * 70}" width="${80 + r() * 70}" height="8" rx="4" fill="${INK}" fill-opacity="0.4"/>`;
    return s;
  },
  git(r, t, c) {
    let s = `<path d="M560 260 H 1140" stroke="${t.a}" stroke-width="4"/>`;
    s += `<path d="M680 260 C 720 260, 720 160, 770 160 H 930 C 980 160, 980 260, 1020 260" fill="none" stroke="${t.b}" stroke-width="4"/>`;
    s += `<path d="M760 260 C 800 260, 800 370, 850 370 H 960" fill="none" stroke="${DIM}" stroke-width="4"/>`;
    for (const cx of [600, 680, 760, 880, 1020, 1100]) s += `<circle cx="${cx}" cy="260" r="13" fill="#0b121c" stroke="${t.a}" stroke-width="4"/>`;
    for (const cx of [800, 880]) s += `<circle cx="${cx}" cy="160" r="13" fill="#0b121c" stroke="${t.b}" stroke-width="4"/>`;
    for (const cx of [880, 960]) s += `<circle cx="${cx}" cy="370" r="13" fill="#0b121c" stroke="${DIM}" stroke-width="4"/>`;
    const labels = c.lines || ['main', 'feature', 'hotfix'];
    return s + `<text x="1140" y="240" text-anchor="end" font-family="${MONO}" font-size="17" fill="${t.a}">${x(labels[0])}</text><text x="940" y="140" font-family="${MONO}" font-size="17" fill="${t.b}">${x(labels[1])}</text><text x="980" y="376" font-family="${MONO}" font-size="17" fill="${DIM}">${x(labels[2])}</text>`;
  },
  tests(r, t, c) {
    const lines = c.lines || ['TestParse', 'TestValidate', 'TestSave', 'TestRetry'];
    let s = windowFrame(560, 80, 580, 110 + lines.length * 40, 'go test ./...', t);
    lines.forEach((l, i) => { s += `<text x="600" y="${170 + i * 40}" font-family="${MONO}" font-size="21" fill="${INK}"><tspan fill="${t.a}">✓</tspan>  ${x(l)} <tspan fill="${DIM}">(0.0${Math.floor(r() * 9) + 1}s)</tspan></text>`; });
    return s + `<text x="600" y="${170 + lines.length * 40}" font-family="${MONO}" font-size="21" fill="${t.a}">PASS  ok</text>`;
  },
  receipt(r, t, c) {
    const items = c.lines || ['item 1', 'item 2', 'item 3'];
    let s = `<path d="M720 70 H 1080 V 450 l -20 14 l -20 -14 l -20 14 l -20 -14 l -20 14 l -20 -14 l -20 14 l -20 -14 l -20 14 l -20 -14 l -20 14 l -20 -14 l -20 14 l -20 -14 l -20 14 l -20 -14 l -20 14 l -20 -14 Z" fill="#0f1b2a" stroke="${t.a}" stroke-width="2"/>`;
    s += `<text x="900" y="118" text-anchor="middle" font-family="${MONO}" font-size="20" fill="${INK}">RECEIPT · ${x(c.mark || '')}</text><path d="M750 136 H 1050" stroke="${DIM}" stroke-dasharray="4 6"/>`;
    items.forEach((it, i) => { s += `<text x="750" y="${178 + i * 38}" font-family="${MONO}" font-size="19" fill="${INK}">${x(it.split('|')[0])}</text><text x="1050" y="${178 + i * 38}" text-anchor="end" font-family="${MONO}" font-size="19" fill="${it.includes('✗') ? AMBER : t.a}">${x(it.split('|')[1] || '')}</text>`; });
    return s;
  },
  bike(r, t, c) {
    const w = (cx) => `<circle cx="${cx}" cy="330" r="95" fill="none" stroke="${t.a}" stroke-width="5"/><circle cx="${cx}" cy="330" r="8" fill="${t.a}"/>` + Array.from({ length: 12 }, (_, i) => `<path d="M${cx} 330 L${f(cx + Math.cos(i * Math.PI / 6) * 92)} ${f(330 + Math.sin(i * Math.PI / 6) * 92)}" stroke="${t.b}" stroke-opacity="0.5" stroke-width="1.5"/>`).join('');
    return w(650) + w(1010) + `<path d="M650 330 L760 190 L940 190 L1010 330 M760 190 L830 330 L940 190 M830 330 L650 330 M760 190 L740 150 M710 150 H 780 M940 190 L960 140 L1000 140" fill="none" stroke="${INK}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/><circle cx="830" cy="330" r="22" fill="none" stroke="${INK}" stroke-width="5"/>`;
  },
  stele(r, t, c) {
    const cols = c.lines || ['五人者', '盖当蓼洲周公', '之被逮', '激于义而死焉者也'];
    let s = `<path d="M740 470 V 120 Q 740 70 790 70 H 1010 Q 1060 70 1060 120 V 470 Z" fill="#0f1b2a" stroke="${t.a}" stroke-width="2.5"/><path d="M710 470 H 1090" stroke="${t.a}" stroke-width="4"/>`;
    // one <text> per character: SVG's vertical writing-mode is unreliable in browsers
    cols.forEach((col, i) => [...col].forEach((ch, k) => { s += `<text x="${1000 - i * 64}" y="${132 + k * 42}" text-anchor="middle" font-family="${SERIF}" font-size="32" fill="${i === cols.length - 1 ? t.a : INK}">${x(ch)}</text>`; }));
    return s;
  },
  contour(r, t, c) {
    let s = '';
    const cx = 860 + r() * 120, cy = 260 + r() * 40;
    for (let i = 1; i <= 11; i++) {
      let d = '';
      for (let a = 0; a <= 64; a++) {
        const ang = (a / 64) * Math.PI * 2;
        const rad = i * 26 + Math.sin(ang * 3 + i) * 10 + Math.cos(ang * 5 + i * 0.7) * 6;
        d += `${a ? 'L' : 'M'}${f(cx + Math.cos(ang) * rad * 1.35)} ${f(cy + Math.sin(ang) * rad)}`;
      }
      s += `<path d="${d}Z" fill="none" stroke="${i === 5 ? t.a : t.b}" stroke-opacity="${i === 5 ? 0.9 : 0.35}" stroke-width="${i === 5 ? 2.5 : 1.5}"/>`;
    }
    return s + `<circle cx="${f(cx)}" cy="${f(cy)}" r="5" fill="${t.a}"/>`;
  },
  window(r, t, c) {
    let s = windowFrame(600, 90, 520, 330, c.file || 'app', t);
    s += `<rect x="630" y="160" width="150" height="230" rx="10" fill="#13243a"/>`;
    for (let i = 0; i < 5; i++) s += `<rect x="648" y="${180 + i * 40}" width="${70 + r() * 50}" height="10" rx="5" fill="${i === 1 ? t.a : INK}" fill-opacity="${i === 1 ? 0.9 : 0.3}"/>`;
    s += `<rect x="800" y="160" width="290" height="120" rx="10" fill="${t.b}" fill-opacity="0.25" stroke="${t.a}" stroke-opacity="0.4"/>`;
    for (let i = 0; i < 3; i++) s += `<rect x="800" y="${300 + i * 30}" width="${200 + r() * 90}" height="10" rx="5" fill="${INK}" fill-opacity="0.3"/>`;
    return s;
  },
  alert(r, t, c) {
    const lines = c.lines || ['panic: runtime error', 'goroutine 1 [running]:', 'main.handler()', '    /app/main.go:42'];
    let s = windowFrame(560, 80, 580, 120 + lines.length * 34, c.file || 'stderr', t);
    lines.forEach((l, i) => { s += `<text x="590" y="${162 + i * 34}" font-family="${MONO}" font-size="20" fill="${i === 0 ? AMBER : i % 2 ? DIM : INK}">${x(l)}</text>`; });
    return s + `<path d="M1080 ${120 + lines.length * 34} l 30 -52 l 30 52 z" fill="none" stroke="${AMBER}" stroke-width="3"/><text x="1110" y="${112 + lines.length * 34}" text-anchor="middle" font-family="${MONO}" font-size="24" fill="${AMBER}">!</text>`;
  },
};

// A new post that covers.json doesn't know gets a motif from its tags.
const RULES = [
  [/db|mysql|sql|数据库|存储/i, 'database'],
  [/go|golang|gorm|kratos/i, 'code'],
  [/proxy|代理|tunnel|穿透|路由|vpn|clash|网络|nginx|ssh|cdn/i, 'network'],
  [/ai|gpt|openai|chatgpt|whisper/i, 'neural'],
  [/ci|action|workflow|git/i, 'git'],
  [/test|测试/i, 'tests'],
  [/r2|s3|oss|图床|cloud/i, 'cloud'],
  [/feed|rss|订阅/i, 'feed'],
  [/exception|error|异常/i, 'alert'],
  [/硬件|攒机|黑苹果|软路由/i, 'chip'],
];

export function coverSVG(post, spec = {}) {
  const r = rng(seedOf(post.identity || post.slug));
  const t = TINTS[spec.tint ?? (seedOf(post.slug) % TINTS.length)];
  let motif = spec.motif;
  if (!motif || !M[motif]) {
    const hay = `${post.tags.map(t => t.name).join(' ')} ${post.category?.name || ''} ${post.title}`;
    motif = (RULES.find(([re]) => re.test(hay)) || [null, post.category?.name === '技术' ? 'code' : 'contour'])[1];
  }
  const uid = seedOf(post.slug).toString(36);
  const label = spec.label ?? (post.tags[0]?.name ? `#${post.tags[0].name}` : '');
  const kicker = spec.kicker || (post.category?.name ? post.category.name : '');
  const headline = spec.headline || '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${x(post.title)}">
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${t.a}"/></marker></defs>
  ${background(r, t, uid)}
  ${M[motif](r, t, spec)}
  <rect width="${W}" height="${H}" fill="url(#fade${uid})" opacity="0.6"/>
  ${kicker ? `<text x="56" y="88" font-family="${MONO}" font-size="20" fill="${DIM}" letter-spacing="3">${x(kicker.toUpperCase())}</text>` : ''}
  ${headline ? `<text x="54" y="${spec.headlineY || 200}" font-family="${spec.headlineFont === 'sans' ? SANS : MONO}" font-size="${spec.headlineSize || 64}" font-weight="700" fill="${INK}" letter-spacing="-1">${x(headline)}</text>` : ''}
  ${spec.sub ? `<text x="56" y="${(spec.headlineY || 200) + 52}" font-family="${MONO}" font-size="24" fill="${t.a}">${x(spec.sub)}</text>` : ''}
  ${caption(label, t)}
  ${corners(t)}
</svg>`;
}
