'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// THE FINE SCREEN: the game is drawn on a canvas ART_R times finer than its 400 x 224 world (1200 x 672), and
// everything still draws in game units (render() sets the scale). Old art drawn at 1x just comes out ART_R times
// bigger, pixel for pixel; fine art (painted ART_R times finer, like 3-4's bedroom) is wrapped in a HiRes, which
// knows its own scale: drawImage puts it down at its size in game units, so it drops in anywhere a 1x canvas went.
// ═══════════════════════════════════════════════════════════════════════════
const ART_R = 3;
// how much finer than the art the screen itself is drawn: 1-3, picked by fit() (boot.js) to match the real display, so
// the art lands on whole screen pixels and text and live shapes come out sharp at full resolution (render())
let SCREEN_K = 1;
class HiRes {
  constructor(canvas, r = ART_R) { this.canvas = canvas; this.r = r; this.width = canvas.width / r; this.height = canvas.height / r; }
  getContext(k, o) { return this.canvas.getContext(k, o); }
}
const hiRes = (canvas, r = ART_R) => new HiRes(canvas, r);
// a blank fine canvas `w` x `h` game pixels big (its context is already scaled: draw on it in game units)
function makeHiCanvas(w, h, r = ART_R) {
  const c = makeCanvas(Math.ceil(w * r), Math.ceil(h * r)), g = c.getContext('2d');
  g.imageSmoothingEnabled = false; g.setTransform(r, 0, 0, r, 0, 0);
  return new HiRes(c, r);
}
// Smooth native-size character painter shared by the band, crowd and Magmaw.
// Cached vector paths use one fine outline and shaded fills at 6x art resolution.
function smoothPainter(w,h,ox=0,oy=0) {
  const art = makeHiCanvas(w, h, ART_R * 2), g = art.getContext('2d');
  g.translate(ox, oy); g.lineCap = 'round'; g.lineJoin = 'round';
  const ink = '#272536';
  const finish = (fill, stroke = ink, width = 0.65) => {
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = width; g.stroke(); }
  };
  const path = (d, fill, stroke = ink, width = 0.65) => {
    const t = d.match(/[MLCQZ]|-?\d*\.?\d+/g); let i = 0;
    g.beginPath();
    while (i < t.length) {
      const c = t[i++], n = c === 'C' ? 6 : c === 'Q' ? 4 : c === 'Z' ? 0 : 2;
      const a = t.slice(i, i + n).map(Number); i += n;
      if (c === 'M') g.moveTo(...a); else if (c === 'L') g.lineTo(...a);
      else if (c === 'C') g.bezierCurveTo(...a); else if (c === 'Q') g.quadraticCurveTo(...a); else g.closePath();
    }
    finish(fill, stroke, width);
  };
  const ell = (x,y,rx,ry,fill,stroke=ink,width=0.65,rot=0) => {
    g.beginPath(); g.ellipse(x,y,rx,ry,rot,0,Math.PI*2); finish(fill,stroke,width);
  };
  const line = (x,y,xx,yy,color=ink,width=0.6) => path(`M ${x} ${y} L ${xx} ${yy}`,null,color,width);
  const grad = (y0,y1,top,bottom) => {const c=g.createLinearGradient(-6,y0,8,y1);c.addColorStop(0,top);c.addColorStop(1,bottom);return c;};
  return {art,g,ink,path,ell,line,grad};
}
if (typeof CanvasRenderingContext2D !== 'undefined') {
  const draw = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (img, a0, a1, a2, a3, a4, a5, a6, a7) {
    if (img && img.r !== undefined && img.canvas) {
      const r = img.r;
      if (a2 === undefined) return draw.call(this, img.canvas, a0, a1, img.width, img.height);
      if (a4 === undefined) return draw.call(this, img.canvas, a0, a1, a2, a3);
      return draw.call(this, img.canvas, a0 * r, a1 * r, a2 * r, a3 * r, a4, a5, a6, a7);
    }
    if (a2 === undefined) return draw.call(this, img, a0, a1);
    if (a4 === undefined) return draw.call(this, img, a0, a1, a2, a3);
    return draw.call(this, img, a0, a1, a2, a3, a4, a5, a6, a7);
  };
}
// draw in art pixels (1/ART_R of a game pixel) from the game point (x, y): for live fine detail
function fine(ctx, x, y, fn) { ctx.save(); ctx.translate(x, y); ctx.scale(1 / ART_R, 1 / ART_R); fn(ctx); ctx.restore(); }

const DREAM_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
// a pixel painter: shapes are filled pixel by pixel (no anti-aliasing). Options: only (paint over just these
// colours; null = empty), dither (0..1 coverage, ordered), a (blend over what's there: light and shadow), rot.
function dreamPix(w, h, flat = false) {   // (flat: no dithering -- soft blends become clean edges, gradients go smooth)
  const buf = new Uint32Array(w * h), cache = {};
  const col = c => {
    if (typeof c === 'number') return c;
    let v = cache[c];
    if (v === undefined) { const n = parseInt(c.slice(1), 16); v = cache[c] = (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0; }
    return v;
  };
  const mix = (d, s, a) => {
    const ch = sh => Math.round(((d >>> sh) & 255) * (1 - a) + ((s >>> sh) & 255) * a);
    return (0xff000000 | (ch(16) << 16) | (ch(8) << 8) | ch(0)) >>> 0;
  };
  const put = (x, y, c, o) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const k = y * w + x, d = buf[k];
    if (o) {
      if (o.only && !o.only.includes(d)) return;
      if (o.dither !== undefined && (flat ? 0.5 : DREAM_BAYER[(y & 3) * 4 + (x & 3)]) >= o.dither) return;
      if (o.a !== undefined) { if (d) buf[k] = mix(d, c, o.a); return; }
    }
    buf[k] = c;
  };
  const prep = o => o && o.only ? Object.assign({}, o, { only: o.only.map(c => c ? col(c) : 0) }) : o;
  const P = {
    w, h, buf, col,
    // f(x, y) -> a colour (or null) for each pixel of [x0, x1) x [y0, y1)
    fill(x0, y0, x1, y1, f, o) {
      o = prep(o);
      for (let y = Math.max(0, Math.floor(y0)); y < Math.min(h, Math.ceil(y1)); y++)
        for (let x = Math.max(0, Math.floor(x0)); x < Math.min(w, Math.ceil(x1)); x++) { const c = f(x, y); if (c) put(x, y, col(c), o); }
      return P;
    },
    rect(x, y, rw, rh, c, o) { x = Math.round(x); y = Math.round(y); c = col(c); return P.fill(x, y, x + Math.round(rw), y + Math.round(rh), () => c, o); },
    inEll(cx, cy, rx, ry, rot = 0) {
      const cs = Math.cos(rot), sn = Math.sin(rot);
      return (x, y) => { const dx = x + 0.5 - cx, dy = y + 0.5 - cy, u = (dx * cs + dy * sn) / rx, v = (dy * cs - dx * sn) / ry; return u * u + v * v <= 1; };
    },
    ell(cx, cy, rx, ry, c, o) { const R = Math.max(rx, ry) + 1, inside = P.inEll(cx, cy, rx, ry, o && o.rot); c = col(c); return P.fill(cx - R, cy - R, cx + R, cy + R, (x, y) => inside(x, y) ? c : null, o); },
    inPoly(pts) {
      return (x, y) => {
        const px = x + 0.5, py = y + 0.5; let ins = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins; }
        return ins;
      };
    },
    poly(pts, c, o) { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), inside = P.inPoly(pts); c = col(c); return P.fill(Math.min(...xs), Math.min(...ys), Math.max(...xs) + 1, Math.max(...ys) + 1, (x, y) => inside(x, y) ? c : null, o); },
    // a vertical gradient through the colours, ordered-dithered between each pair
    vgrad(x, y, rw, rh, cols, o) {
      if (flat) return P.fill(x, y, x + rw, y + rh, (px, py) => { const t = (py - y) / Math.max(1, rh - 1) * (cols.length - 1), i = Math.min(cols.length - 2, Math.floor(t)); return lerpColor(cols[i], cols[i + 1], t - i); }, o);   // (smooth)
      const cs = cols.map(col);
      return P.fill(x, y, x + rw, y + rh, (px, py) => { const t = (py - y) / Math.max(1, rh - 1) * (cs.length - 1), i = Math.min(cs.length - 2, Math.floor(t)); return t - i > DREAM_BAYER[(py & 3) * 4 + (px & 3)] ? cs[i + 1] : cs[i]; }, o);
    },
    line(x0, y0, x1, y1, c, o) {
      c = col(c); o = prep(o);
      const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      for (let i = 0; i <= n; i++) put(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c, o);
      return P;
    },
    // a 1px ink line around everything painted so far
    outline(c) {
      c = col(c); const src = buf.slice();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const k = y * w + x;
        if (!src[k] && ((x > 0 && src[k - 1]) || (x < w - 1 && src[k + 1]) || (y > 0 && src[k - w]) || (y < h - 1 && src[k + w]))) buf[k] = c;
      }
      return P;
    },
    blit(sub, x0, y0, flip) {
      for (let y = 0; y < sub.h; y++) for (let x = 0; x < sub.w; x++) { const c = sub.buf[y * sub.w + (flip ? sub.w - 1 - x : x)]; if (c) put(x0 + x, y0 + y, c); }
      return P;
    },
    canvas() {
      const cv = makeCanvas(w, h), g = cv.getContext('2d'), img = g.createImageData(w, h);
      new Uint32Array(img.data.buffer).set(buf); g.putImageData(img, 0, 0);
      return cv;
    },
    hi(r = ART_R) { return hiRes(P.canvas(), r); },
    // a soft round glow (radius r, strength a at its heart, fading smoothly to nothing): over empty pixels too, as
    // see-through colour, so a layer can carry light of its own
    glow(cx, cy, r, c, a) {
      const C = col(c);
      for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(h, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(w, Math.ceil(cx + r)); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
        if (d >= 1) continue;
        const k = a * (1 - d) * (1 - d), i = y * w + x, d0 = buf[i];
        if (!d0) { buf[i] = ((Math.round(k * 255) << 24) | (C & 0xffffff)) >>> 0; continue; }
        const a0 = (d0 >>> 24) / 255, na = a0 + k * (1 - a0);   // light over light (or over solid paint)
        const m = mix(d0, C, k / na);
        buf[i] = ((Math.round(na * 255) << 24) | (m & 0xffffff)) >>> 0;
      }
      return P;
    },
    // see-through colour laid over [x0, y0, x1, y1], its strength pixel by pixel fa(x, y) -> 0..1 (shafts of light,
    // mist): over empty pixels it stays see-through, over paint it blends in
    wash(x0, y0, x1, y1, fa, c) {
      const C = col(c);
      for (let y = Math.max(0, Math.floor(y0)); y < Math.min(h, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(w, Math.ceil(x1)); x++) {
        const k = fa(x, y);
        if (!(k > 0)) continue;
        const i = y * w + x, d0 = buf[i];
        if (!d0) { buf[i] = ((Math.round(Math.min(1, k) * 255) << 24) | (C & 0xffffff)) >>> 0; continue; }
        const a0 = (d0 >>> 24) / 255, na = a0 + k * (1 - a0), m = mix(d0, C, Math.min(1, k / na));
        buf[i] = ((Math.round(na * 255) << 24) | (m & 0xffffff)) >>> 0;
      }
      return P;
    },
    // light (or shade) laid over what's painted, its strength varying pixel by pixel: fa(x, y) -> 0..1 (a smooth glow)
    shine(x0, y0, x1, y1, fa, c) {
      c = col(c);
      for (let y = Math.max(0, Math.floor(y0)); y < Math.min(h, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(w, Math.ceil(x1)); x++) {
        const a = fa(x, y), k = y * w + x;
        if (a > 0 && buf[k]) buf[k] = mix(buf[k], c, Math.min(1, a));
      }
      return P;
    },   // the painting as fine art (hires.js): a HiRes, its size in game units
  };
  return P;
}
// the title's and 1-1's painter: dreamPix without the dithering
const finePix = (w, h) => dreamPix(w, h, true);

// ── drawing live in fine pixels, in game units (any fraction): crisp shapes snapped to the art pixel
const fSnap = v => Math.round(v * ART_R) / ART_R;
function fRect(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(fSnap(x), fSnap(y), fSnap(w) || 1 / ART_R, fSnap(h) || 1 / ART_R); }
// a filled ellipse (rows of art pixels, one path: a single fill)
function fEll(ctx, cx, cy, rx, ry, color) {
  const R = ART_R, s = 1 / R, X = cx * R, Y = cy * R, RX = rx * R, RY = ry * R;
  ctx.fillStyle = color; ctx.beginPath();
  for (let y = Math.ceil(Y - RY - 0.5); y <= Math.floor(Y + RY - 0.5); y++) {
    const v = (y + 0.5 - Y) / RY, half = RX * Math.sqrt(Math.max(0, 1 - v * v)), x0 = Math.round(X - half), x1 = Math.round(X + half);
    if (x1 > x0) ctx.rect(x0 * s, y * s, (x1 - x0) * s, s);
  }
  ctx.fill();
}
const fBlob = (ctx, cx, cy, r, color) => fEll(ctx, cx, cy, r, r, color);
// a band of a ring (radii r0..r1, from angle a0 to a1, canvas angles: 0 = right, PI/2 = down)
function fArc(ctx, cx, cy, r0, r1, a0, a1, color, sy = 1) {
  const R = ART_R, s = 1 / R;
  const isFullCircle = (a0 === 0 && a1 >= Math.PI * 2 - 0.002);
  const r0sq = r0 * r0, r1sq = r1 * r1;
  const minY = Math.floor((cy - r1 * sy) * R), maxY = Math.ceil((cy + r1 * sy) * R);
  ctx.fillStyle = color; ctx.beginPath();
  for (let y = minY; y <= maxY; y++) {
    const dy = ((y + 0.5) / R - cy) / sy;
    const dy2 = dy * dy;
    if (dy2 > r1sq) continue;
    if (isFullCircle) {
      const maxDx = Math.sqrt(r1sq - dy2);
      const minDx = dy2 < r0sq ? Math.sqrt(r0sq - dy2) : 0;
      const x0Outer = Math.floor((cx - maxDx) * R), x0Inner = Math.ceil((cx - minDx) * R);
      const x1Inner = Math.floor((cx + minDx) * R), x1Outer = Math.ceil((cx + maxDx) * R);
      if (x0Inner > x0Outer) ctx.rect(x0Outer * s, y * s, (x0Inner - x0Outer) * s, s);
      if (x1Outer > x1Inner) ctx.rect(x1Inner * s, y * s, (x1Outer - x1Inner) * s, s);
      continue;
    }
    const maxDx = Math.sqrt(r1sq - dy2);
    const minX = Math.floor((cx - maxDx) * R), maxX = Math.ceil((cx + maxDx) * R);
    let spanStart = -1;
    for (let x = minX; x <= maxX; x++) {
      const dx = (x + 0.5) / R - cx;
      const d2 = dx * dx + dy2;
      let inRange = d2 >= r0sq && d2 <= r1sq;
      if (inRange) {
        let a = Math.atan2(dy, dx); if (a < a0) a += Math.PI * 2;
        inRange = a <= a1;
      }
      if (inRange) {
        if (spanStart < 0) spanStart = x;
      } else {
        if (spanStart >= 0) {
          ctx.rect(spanStart * s, y * s, (x - spanStart) * s, s);
          spanStart = -1;
        }
      }
    }
    if (spanStart >= 0) {
      ctx.rect(spanStart * s, y * s, (maxX + 1 - spanStart) * s, s);
    }
  }
  ctx.fill();
}
// a line of art pixels from (x0, y0) to (x1, y1), `w` art pixels thick
function fLine(ctx, x0, y0, x1, y1, color, w = 1) {
  const R = ART_R, s = 1 / R, n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * R));
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i <= n; i++) ctx.rect(Math.round((x0 + (x1 - x0) * i / n) * R - (w - 1) / 2) * s, Math.round((y0 + (y1 - y0) * i / n) * R - (w - 1) / 2) * s, w * s, w * s);
  ctx.fill();
}
// many rects of one colour in one fill: list of [x, y, w, h] in game units, snapped to the art pixel
function fRects(ctx, color, list) {
  ctx.fillStyle = color; ctx.beginPath();
  const len = list.length;
  for (let i = 0; i < len; i++) {
    const item = list[i];
    ctx.rect(fSnap(item[0]), fSnap(item[1]), fSnap(item[2]) || 1 / ART_R, fSnap(item[3]) || 1 / ART_R);
  }
  ctx.fill();
}

// ── smoothUp: old 1x pixel art up to fine, as if it had been drawn with a smooth hand. Each art pixel takes the colour
// that "wins" round it: every source pixel nearby votes for its colour (transparent counts as one), weighted by a soft
// bell on its distance, the one underneath getting a little extra so fine details (eyes, glints, 1px lines) survive.
// The result: staircases straighten into slopes, square corners round off, outlines stay crisp, no new colours.
const SMOOTH_SIGMA2 = 2 * 0.7 * 0.7, SMOOTH_OWN = 0.1;
const SMOOTH_TABS = new Map();
function getSmoothTabs(R) {
  let tabs = SMOOTH_TABS.get(R);
  if (tabs) return tabs;
  tabs = [];
  for (let sy = 0; sy < R; sy++) for (let sx = 0; sx < R; sx++) {
    const u = (sx + 0.5) / R - 0.5, v = (sy + 0.5) / R - 0.5, t = [];
    for (let j = -1; j <= 2; j++) for (let i = -1; i <= 2; i++) {
      const d2 = (i - u) ** 2 + (j - v) ** 2, wgt = Math.exp(-d2 / SMOOTH_SIGMA2);
      if (wgt > 0.01) t.push([i, j, wgt]);
    }
    tabs.push(t);
  }
  SMOOTH_TABS.set(R, tabs);
  return tabs;
}
function smoothUp(src, R = ART_R, edge = 'clear') {   // edge: 'clear' (sprites), 'clamp' (tiles: the edge carries on), 'wrapx' (parallax layers: they repeat sideways)
  const w = src.width, h = src.height;
  if (!w || !h) return src;
  let data;
  try { data = new Uint32Array(src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data.buffer); } catch (e) { return src; }
  // colour indices (0 = clear)
  const idx = new Int32Array(w * h), cols = [0], seen = new Map();
  for (let i = 0; i < w * h; i++) {
    const c = data[i] >>> 0;
    if ((c >>> 24) < 8) continue;
    let k = seen.get(c);
    if (k === undefined) { k = cols.length; cols.push(c); seen.set(c, k); }
    idx[i] = k;
  }
  const at = edge === 'clamp' ? (x, y) => idx[clamp(y, 0, h - 1) * w + clamp(x, 0, w - 1)]
    : edge === 'wrapx' ? (x, y) => idx[clamp(y, 0, h - 1) * w + ((x % w) + w) % w]
    : (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : idx[y * w + x];
  const tabs = getSmoothTabs(R);
  const W = w * R, H = h * R, out = makeCanvas(W, H), og = out.getContext('2d'), img = og.createImageData(W, H), px = new Uint32Array(img.data.buffer);
  const score = new Float32Array(cols.length), touched = new Int32Array(17);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // a pixel whose whole neighbourhood is one colour needs no vote
    const own = idx[y * w + x];
    let flat = true;
    let same = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (i || j) { if (at(x + i, y + j) === own) same++; else flat = false; }
    // thin things (a 1px line, a dot, an eye) hold on to their pixels; broad shapes let their corners round off
    const ownBias = SMOOTH_OWN + (same <= 2 ? 0.45 : same <= 3 ? 0.25 : same <= 4 ? 0.1 : 0);
    for (let sy = 0; sy < R; sy++) for (let sx = 0; sx < R; sx++) {
      let best = own;
      if (!flat) {
        const t = tabs[sy * R + sx];
        let nTouched = 0;
        for (let m = 0; m < t.length; m++) {
          const item = t[m], k = at(x + item[0], y + item[1]);
          if (score[k] === 0) touched[nTouched++] = k;
          score[k] += item[2];
        }
        if (score[own] === 0) touched[nTouched++] = own;
        score[own] += ownBias;
        let bs = -1;
        for (let m = 0; m < nTouched; m++) {
          const k = touched[m], sc = score[k];
          if (sc > bs) { bs = sc; best = k; }
          score[k] = 0;
        }
      }
      if (best) px[(y * R + sy) * W + x * R + sx] = cols[best];
    }
  }
  og.putImageData(img, 0, 0);
  return hiRes(out, R);
}

// ── Text, drawn from the bundled typeface (fonts.js) at the screen's real resolution (SCREEN_K), so it stays sharp on
// any display. Letters keep their natural widths (an I is narrow, a W wide; digits all as wide as a 0 so counters don't
// jiggle), and a string as a whole still takes the old fixed-cell width (`textWidth`), so layouts don't move: drawText.
const FINE_GLYPHS = new Map();
function fineGlyph(ch, color, small, s = 1) {
  const K = SCREEN_K, key = ch + color + (small ? 's' : '') + s + '@' + K;
  let img = FINE_GLYPHS.get(key);
  if (img) return img;
  const h = small ? 6 : 7, px = ART_R * K, r = px * s;   // (px: canvas pixels per game unit)
  const m = glyphMetrics(ch, small, s);
  const pad = Math.ceil(r * 0.5), W = Math.max(1, Math.ceil((m.right - m.left) * px) + pad * 2);
  const c = makeCanvas(W, Math.ceil((h + 2) * r)), g = c.getContext('2d');
  g.font = glyphFont(h * r);
  g.textBaseline = 'alphabetic'; g.fillStyle = color;
  g.translate(pad - m.left * px, h * r);
  g.scale(1, m.sy);
  g.fillText(ch, 0, 0);
  img = hiRes(c, px);
  img.ox = m.left - pad / px;   // where the pen sits, from the image's left edge (negative: game units)
  FINE_GLYPHS.set(key, img);
  return img;
}
const glyphFont = h => `800 ${h / 0.72}px "Chickaroo Text", sans-serif`;
// a glyph's advance and ink in game units at scale s (measured once, at a fixed size, so it doesn't depend on SCREEN_K)
const GLYPH_METRICS = new Map();
let glyphMeasure = null;
function glyphMetrics(ch, small, s = 1) {
  const key = ch + (small ? 's' : '') + s;
  let m = GLYPH_METRICS.get(key);
  if (m) return m;
  const h = small ? 6 : 7, Q = 24;   // measured with a cap height of Q px
  const g = glyphMeasure || (glyphMeasure = makeCanvas(1, 1).getContext('2d'));
  g.font = glyphFont(Q);
  const cap = g.measureText('H').actualBoundingBoxAscent || Q, u = h * s / Q;   // (u: game units per measured px)
  const mt = g.measureText(ch), num = ch >= '0' && ch <= '9', zero = num ? g.measureText('0').width : 0;
  let adv = (num ? zero : mt.width) * u;
  if (!(adv > 0)) adv = (small ? smallW(ch) : 5) * s;
  const shift = num ? (zero - mt.width) / 2 * u : 0;   // a digit sits in the middle of a 0's width
  const l = -(mt.actualBoundingBoxLeft || 0) * u, rr = (mt.actualBoundingBoxRight !== undefined ? mt.actualBoundingBoxRight : mt.width) * u;
  m = { adv, left: Math.min(0, l) + shift, right: Math.max(adv, rr) + shift, sy: Q / cap };   // (sy: the cap height made exactly h)
  GLYPH_METRICS.set(key, m);
  return m;
}
// a batch of fine rects: add(x, y, w, h, colour) collects them by colour, flush(ctx) fills each colour in one go (in the
// order the colours were first used -- flush between layers when a colour comes back on top of others)
function fineBatch() {
  const m = new Map(), add = (x, y, w, h, c) => { let l = m.get(c); if (!l) m.set(c, l = []); l.push([x, y, w, h]); };
  add.flush = ctx => { for (const [c, l] of m) fRects(ctx, c, l); m.clear(); };
  return add;
}
// a rounded rectangle in rows of art pixels: filled (inset 0), or just its rim `ring` art pixels wide
function fRoundRect(ctx, x, y, w, h, r, color, ring = 0) {
  const R = ART_R, s = 1 / R, X = Math.round(x * R), Y = Math.round(y * R), W = Math.round(w * R), H = Math.round(h * R), rr = r * R;
  const span = (j, inset) => {   // the row's [left, right] (art px, relative), inset by `inset` all round, or null
    const jj = j - inset, hh = H - inset * 2, ww = W - inset * 2, rad = Math.max(0, rr - inset);
    if (jj < 0 || jj >= hh) return null;
    const dy = jj + 0.5 < rad ? rad - jj - 0.5 : jj + 0.5 > hh - rad ? jj + 0.5 - (hh - rad) : 0;
    const cut = dy > 0 ? rad - Math.sqrt(Math.max(0, rad * rad - dy * dy)) : 0, c = Math.round(cut);
    return [inset + c, inset + ww - c];
  };
  ctx.fillStyle = color; ctx.beginPath();
  for (let j = 0; j < H; j++) {
    const o = span(j, 0);
    if (!o) continue;
    const i = ring ? span(j, ring) : null;
    if (!ring) ctx.rect((X + o[0]) * s, (Y + j) * s, (o[1] - o[0]) * s, s);
    else if (!i) ctx.rect((X + o[0]) * s, (Y + j) * s, (o[1] - o[0]) * s, s);
    else { ctx.rect((X + o[0]) * s, (Y + j) * s, (i[0] - o[0]) * s, s); ctx.rect((X + i[1]) * s, (Y + j) * s, (o[1] - i[1]) * s, s); }
  }
  ctx.fill();
}
// a little heart centred on (x, y), `w` game px across: two round lobes and a tapered point, a shine on the left lobe
function fineHeart(ctx, x, y, w, color, shine = '#ffe1eb') {
  const r = w * 0.29;
  fBlob(ctx, x - r * 0.95, y - r * 0.35, r, color); fBlob(ctx, x + r * 0.95, y - r * 0.35, r, color);
  const n = Math.round(w * ART_R * 0.55);
  fRects(ctx, color, Array.from({ length: n }, (_, j) => { const k = j / n, hw = (1 - k) * r * 1.95; return [x - hw, y - r * 0.35 + j / ART_R, hw * 2, 1 / ART_R]; }));
  fBlob(ctx, x - r * 1.15, y - r * 0.6, r * 0.32, shine);
}
// a filled polygon in rows of art pixels (crisp, one fill), points in game units
const FPOLY_CUTS = [];
function fPoly(ctx, pts, color) {
  const n = pts.length;
  if (n < 3) return;
  let minY = pts[0][1], maxY = minY;
  for (let i = 1; i < n; i++) { const y = pts[i][1]; if (y < minY) minY = y; else if (y > maxY) maxY = y; }
  const R = ART_R, s = 1 / R, lo = Math.floor(minY * R), hi = Math.ceil(maxY * R);
  ctx.fillStyle = color; ctx.beginPath();
  for (let ay = lo; ay < hi; ay++) {
    const sy = (ay + 0.5) * s;
    FPOLY_CUTS.length = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const a = pts[j], b = pts[i], ay0 = a[1], by0 = b[1];
      if ((ay0 <= sy && by0 > sy) || (by0 <= sy && ay0 > sy)) FPOLY_CUTS.push(a[0] + (sy - ay0) * (b[0] - a[0]) / (by0 - ay0));
    }
    const cl = FPOLY_CUTS.length;
    if (cl === 2) {
      let c0 = FPOLY_CUTS[0], c1 = FPOLY_CUTS[1];
      if (c0 > c1) { const tmp = c0; c0 = c1; c1 = tmp; }
      const x0 = Math.round(c0 * R), x1 = Math.round(c1 * R);
      if (x1 > x0) ctx.rect(x0 * s, ay * s, (x1 - x0) * s, s);
    } else if (cl > 2) {
      FPOLY_CUTS.sort((a, b) => a - b);
      for (let i = 0; i + 1 < cl; i += 2) { const x0 = Math.round(FPOLY_CUTS[i] * R), x1 = Math.round(FPOLY_CUTS[i + 1] * R); if (x1 > x0) ctx.rect(x0 * s, ay * s, (x1 - x0) * s, s); }
    }
  }
  ctx.fill();
}
// an old 1x drawing routine lifted to the fine screen: fn(ctx) draws once onto a small 1x canvas (w x h game px),
// which is smoothed up (smoothUp) and kept under `key`
const CAPTURED = new Map();
function capturedArt(key, w, h, fn) {
  let img = CAPTURED.get(key);
  if (img) return img;
  const c = makeCanvas(w, h), g = c.getContext('2d', { willReadFrequently: true });
  fn(g);
  img = smoothUp(c);
  if (CAPTURED.size > 400) CAPTURED.clear();
  CAPTURED.set(key, img);
  return img;
}
// decor that never moves (game-decor.js): drawn once into a box this big (game px), its foot at (DECOR_BOX[0], [1])
const STATIC_DECOR = new Set(['saguaro', 'barrel', 'skull', 'dgrass', 'pebble', 'urn', 'shards', 'agave']);
const DECOR_BOX = [32, 72, 96, 112];
// an entity's own 1x drawing, lifted to the fine screen frame by frame: drawn (fn(c), in world coordinates) into a
// little 1x canvas covering [x0, y0, w, h] round it, smoothed up (smoothUp), and kept under `sig` -- everything that
// changes how it looks goes in `sig`, so each look is worked out once
const LIVE_ART = new Map();
function drawLifted(ctx, sig, x0, y0, w, h, fn) {
  x0 = Math.round(x0); y0 = Math.round(y0);
  let img = LIVE_ART.get(sig);
  if (!img) {
    const c = makeCanvas(w, h), g = c.getContext('2d', { willReadFrequently: true });
    g.translate(-x0, -y0); fn(g);
    img = smoothUp(c);
    if (LIVE_ART.size > 1500) LIVE_ART.clear();
    LIVE_ART.set(sig, img);
  }
  ctx.drawImage(img, x0, y0);
}
// ── lifting an entity's live 1x drawing automatically: each frame it's drawn into a little 1x canvas round it, and
// whatever it came out as is looked up by its pixels -- a new look is smoothed up once (smoothUp) and kept, a look
// seen before costs nothing more. liftDraws(Class, [left, top, right, bottom], when?) wraps a class's draw(ctx, g):
// the margins round its box must hold everything it draws; `when(e)` (optional) says which ones to lift.
const AUTO_ART = new Map(), AUTO_POOL = new Map();
function drawAuto(ctx, x0, y0, w, h, fn) {
  x0 = Math.round(x0); y0 = Math.round(y0); w = Math.ceil(w); h = Math.ceil(h);
  const pk = w + 'x' + h;
  let c = AUTO_POOL.get(pk);
  if (!c) { c = makeCanvas(w, h); AUTO_POOL.set(pk, c); }
  const g = c.getContext('2d', { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, w, h); g.translate(-x0, -y0);
  g.imageSmoothingEnabled = false;
  fn(g);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  let d;
  try { d = new Uint32Array(g.getImageData(0, 0, w, h).data.buffer); } catch (e) { ctx.drawImage(c, x0, y0); return; }
  let hs = (2166136261 ^ w ^ (h << 12)) >>> 0, any = false;
  for (let i = 0; i < d.length; i++) { const v = d[i]; if (v) any = true; hs ^= v; hs = Math.imul(hs, 16777619); }
  if (!any) return;
  const key = pk + ':' + (hs >>> 0);
  let img = AUTO_ART.get(key);
  if (!img) { img = smoothUp(c); if (AUTO_ART.size > 2500) AUTO_ART.clear(); AUTO_ART.set(key, img); }
  ctx.drawImage(img, x0, y0);
}
function liftDraws(C, m, when, sigFn) {
  const live = C.prototype.draw;
  C.prototype.drawLive = live;
  C.prototype.draw = function (ctx, g) {
    if (when && !when(this)) return live.call(this, ctx, g);
    if (sigFn) {
      drawLifted(ctx, sigFn(this), this.x - m[0], this.y - m[1], this.w + m[0] + m[2], this.h + m[1] + m[3], c => live.call(this, c, g));
      return;
    }
    drawAuto(ctx, this.x - m[0], this.y - m[1], this.w + m[0] + m[2], this.h + m[1] + m[3], c => live.call(this, c, g));
  };
}
// a soft round glow: colour `color` at strength `a` in its middle, fading smoothly to nothing at radius r (no rings)
// a four-point sparkle (a twinkle), r game pixels from its middle to each tip
function fSparkle(ctx, x, y, r, color = '#ffffff') {
  const w = Math.max(0.34, r * 0.22);
  fPoly(ctx, [[x, y - r], [x + w, y - w], [x + r, y], [x + w, y + w], [x, y + r], [x - w, y + w], [x - r, y], [x - w, y - w]], color);
}
const GLOW_RGB_CACHE = Object.create(null);
const GLOW_CANVAS_CACHE = Object.create(null);
function fGlow(ctx, x, y, r, color, a = 1) {
  if (r <= 0 || a <= 0.001) return;
  let glowCanvas = GLOW_CANVAS_CACHE[color];
  if (!glowCanvas) {
    let rgb = GLOW_RGB_CACHE[color];
    if (rgb === undefined) {
      const n = parseInt(color.slice(1), 16);
      rgb = GLOW_RGB_CACHE[color] = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
    }
    const sz = 128, half = 64;
    glowCanvas = makeCanvas(sz, sz);
    const gc = glowCanvas.getContext('2d');
    const gr = gc.createRadialGradient(half, half, 0, half, half, half);
    gr.addColorStop(0, `rgba(${rgb},1)`);
    gr.addColorStop(0.5, `rgba(${rgb},0.45)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    gc.fillStyle = gr;
    gc.beginPath();
    gc.arc(half, half, half, 0, Math.PI * 2);
    gc.fill();
    GLOW_CANVAS_CACHE[color] = glowCanvas;
  }
  const oldAlpha = ctx.globalAlpha;
  ctx.globalAlpha = oldAlpha * a;
  ctx.drawImage(glowCanvas, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = oldAlpha;
}
