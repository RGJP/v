'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 3. UTILITIES & PIXEL FONT
// ═══════════════════════════════════════════════════════════════════════════
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const oneOf = v => (Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v);   // a list -> one at random
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const pad = (n, len) => String(Math.max(0, Math.floor(n))).padStart(len, '0');

// Player-facing numbering follows the campaign order; saved progress and stage-specific logic
// keep their stable registry keys. Developer rooms do not consume a campaign number.
function levelLabel(def) {
  const index = LEVELS.filter(level => !level.dev).indexOf(def);
  if (index < 0) return def.id;
  let n = index + 1, label = '';
  for (const [value, numeral] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) {
    while (n >= value) { label += numeral; n -= value; }
  }
  return label;
}

function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));   // '#rrggbb' -> [r, g, b]
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
// Crisp filled circle built from horizontal spans (no anti-aliasing).
function blob(ctx, cx, cy, r, color) {
  if (ctx.getTransform && Math.abs(ctx.getTransform().a) >= 2) { fBlob(ctx, Math.round(cx), Math.round(cy), r + 0.45, color); return; }   // (on the fine screen: a smooth disc, hires.js)
  ctx.fillStyle = color;
  cx = Math.round(cx); cy = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
  }
}
const safeStorage = {
  get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
};

// 5x7 bitmap font. Each glyph is 7 rows of 5-bit masks (bit 4 = leftmost pixel).
const FONT = {
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 2, 4, 8, 31],
  '3': [31, 2, 4, 2, 1, 17, 14], '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8], '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 2, 12],
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14],
  D: [28, 18, 17, 17, 17, 18, 28], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  ' ': [0, 0, 0, 0, 0, 0, 0], '-': [0, 0, 0, 31, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12],
  ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0], '!': [4, 4, 4, 4, 4, 0, 4],
  '?': [14, 17, 1, 2, 4, 0, 4], '/': [1, 1, 2, 4, 8, 16, 16], "'": [4, 4, 8, 0, 0, 0, 0], '%': [24, 25, 2, 4, 8, 19, 3],
  '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '>': [8, 4, 2, 1, 2, 4, 8],
  '<': [2, 4, 8, 16, 8, 4, 2], '+': [0, 4, 4, 31, 4, 4, 0], '=': [0, 0, 31, 0, 31, 0, 0],
  '*': [0, 17, 10, 4, 10, 17, 0], '&': [12, 18, 20, 8, 21, 18, 13],
  '←': [0, 4, 8, 31, 8, 4, 0], '→': [0, 4, 2, 31, 2, 4, 0], '↑': [4, 14, 21, 4, 4, 4, 0],
  '↓': [0, 4, 4, 4, 21, 14, 4],
  '^': [4, 10, 17, 0, 0, 0, 0], '_': [0, 0, 0, 0, 0, 0, 31], '#': [10, 10, 31, 10, 31, 10, 10],
};
// A compact 4x6 font for speech bubbles (bit 8 = leftmost pixel): smaller than the 5x7 one, but
// wide enough that M, N, W, 0 and friends stay distinct.
const FONT_SMALL = {
  A: [6, 9, 9, 15, 9, 9], B: [14, 9, 14, 9, 9, 14], C: [7, 8, 8, 8, 8, 7], D: [14, 9, 9, 9, 9, 14],
  E: [15, 8, 14, 8, 8, 15], F: [15, 8, 14, 8, 8, 8], G: [7, 8, 11, 9, 9, 7], H: [9, 9, 15, 9, 9, 9],
  I: [14, 4, 4, 4, 4, 14], J: [3, 1, 1, 1, 9, 6], K: [9, 10, 12, 10, 9, 9], L: [8, 8, 8, 8, 8, 15],
  M: [17, 27, 21, 17, 17, 17], N: [9, 13, 11, 9, 9, 9], O: [6, 9, 9, 9, 9, 6], P: [14, 9, 9, 14, 8, 8],
  Q: [6, 9, 9, 9, 10, 5], R: [14, 9, 9, 14, 10, 9], S: [7, 8, 6, 1, 1, 14], T: [14, 4, 4, 4, 4, 4],
  U: [9, 9, 9, 9, 9, 6], V: [17, 17, 17, 10, 10, 4], W: [17, 17, 17, 21, 21, 10], X: [9, 9, 6, 6, 9, 9],
  Y: [10, 10, 10, 4, 4, 4], Z: [15, 1, 2, 4, 8, 15],
  '0': [6, 9, 11, 13, 9, 6], '1': [4, 12, 4, 4, 4, 14], '2': [6, 9, 2, 4, 8, 15], '3': [14, 1, 6, 1, 1, 14],
  '4': [9, 9, 15, 1, 1, 1], '5': [15, 8, 14, 1, 1, 14], '6': [6, 8, 14, 9, 9, 6], '7': [15, 1, 2, 4, 4, 4],
  '8': [6, 9, 6, 9, 9, 6], '9': [6, 9, 9, 7, 1, 6],
  ' ': [0, 0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 0, 4], ',': [0, 0, 0, 0, 4, 8], '!': [4, 4, 4, 4, 0, 4],
  '?': [6, 9, 2, 4, 0, 4], "'": [4, 4, 8, 0, 0, 0], '-': [0, 0, 14, 0, 0, 0], ':': [0, 4, 0, 0, 4, 0], ';': [0, 4, 0, 0, 4, 8],
  '+': [0, 4, 14, 4, 0, 0], '/': [1, 2, 2, 4, 4, 8], '(': [2, 4, 4, 4, 4, 2], ')': [4, 2, 2, 2, 2, 4],
  '%': [9, 1, 2, 4, 8, 9], '=': [0, 15, 0, 15, 0, 0], '*': [0, 10, 4, 10, 0, 0], '&': [4, 10, 4, 10, 10, 5],
  '>': [8, 4, 2, 4, 8, 0], '<': [2, 4, 8, 4, 2, 0], '_': [0, 0, 0, 0, 0, 15], '^': [4, 10, 0, 0, 0, 0], '#': [5, 15, 5, 15, 5, 0],
};
const SMALL_WIDE = new Set(['M', 'V', 'W']);   // drawn 5 wide (bit 16 = leftmost)
const smallW = ch => SMALL_WIDE.has(ch) ? 5 : 4;
const glyphCache = new Map();
function glyph(ch, color, small) {
  const key = ch + color + (small ? 's' : '');
  let c = glyphCache.get(key);
  if (c) return c;
  const [w, h, font, bit] = small ? [smallW(ch), 6, FONT_SMALL, smallW(ch) - 1] : [5, 7, FONT, 4];
  c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = color;
  const rows = font[ch] || font['?'];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((rows[y] >> (bit - x)) & 1) g.fillRect(x, y, 1, 1);
  glyphCache.set(key, c);
  return c;
}
// width in px; pass scale 'small' for the 4x6 speech-bubble font
const textWidth = (s, scale = 1) => {
  if (scale !== 'small') return (s.length * 6 - 1) * scale;
  const u = String(s).toUpperCase();
  let n = -1;
  for (let i = 0; i < u.length; i++) n += smallW(u[i]) + 1;
  return n;
};
const TEXT_LAYOUT_CACHE = new Map();
function getTextLayout(str, sm, s) {
  const key = str + (sm ? '\x01s' : '\x01') + s;
  let lay = TEXT_LAYOUT_CACHE.get(key);
  if (lay) return lay;
  const n = str.length, target = textWidth(str, sm ? 'small' : s), adv = new Float64Array(n);
  let natural = 0;
  for (let i = 0; i < n; i++) {
    const ch = str[i], a = ch === ' ' ? (sm ? 4 : 5) * s : glyphMetrics(ch, sm, s).adv;
    adv[i] = a; natural += a;
  }
  const gap = n > 1 ? clamp((target - natural) / (n - 1), -0.45 * s, 1.4 * s) : 0;   // (wide words: a little tighter, then a little wider
  const full = natural + gap * (n - 1), sq = n > 1 ? Math.min(1, target * 1.08 / full) : 1, width = full * sq;   // than their old cells, squeezed only past that)
  lay = { n, target, adv, gap, sq, width };
  if (TEXT_LAYOUT_CACHE.size > 2000) TEXT_LAYOUT_CACHE.clear();
  TEXT_LAYOUT_CACHE.set(key, lay);
  return lay;
}
function drawText(ctx, str, x, y, color = '#ffffff', o = {}) {
  const s = o.scale || 1, sm = !!o.small;
  str = String(str).toUpperCase();
  // letters at their natural widths (glyphMetrics, hires.js), spread or tightened to the string's old fixed-cell width
  const { n, target, adv, gap, sq, width } = getTextLayout(str, sm, s);
  if (o.align === 'center') x -= width / 2;
  else if (o.align === 'right') x -= width;
  else if (n === 1) x += Math.max(0, (target - width) / 2);   // (a lone sign keeps the middle of its old cell)
  x = Math.round(x * ART_R) / ART_R; y = Math.round(y);
  const visible = o.reveal == null ? n : clamp(Math.floor(o.reveal), 0, n);
  const sh = o.shadow, shOff = s / 3;
  for (let i = 0; i < visible; i++) {
    const ch = str[i];
    if (ch !== ' ') {
      if (sh) {
        const sImg = fineGlyph(ch, sh, sm, s);
        if (sq === 1) ctx.drawImage(sImg, x + shOff + sImg.ox, y + shOff);
        else ctx.drawImage(sImg, x + shOff + sImg.ox * sq, y + shOff, sImg.width * sq, sImg.height);
      }
      const img = fineGlyph(ch, color, sm, s);
      if (sq === 1) ctx.drawImage(img, x + img.ox, y);
      else ctx.drawImage(img, x + img.ox * sq, y, img.width * sq, img.height);
    }
    x += (adv[i] + gap) * sq;
  }
}

// Copy the methods of `part` onto `target`'s prototype. Lets one big class (Game) live in several files.
function mixin(target, part) {
  for (const k of Object.getOwnPropertyNames(part.prototype)) {
    if (k !== 'constructor') Object.defineProperty(target.prototype, k, Object.getOwnPropertyDescriptor(part.prototype, k));
  }
}
