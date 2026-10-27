'use strict';
// The meadow, painted fine (ART_R x the game's resolution, in the style of 3-4's bedroom: hard pixels, light from the
// upper left) but with no dithering: smooth gradients on the big surfaces, clean bands of shade on things. The title
// screen and 1-1 use it.
//  - meadowFineBackground(): the sky (and 1-1's dawn / golden hour / sunset skies), far mountains, clouds and hills,
//    as the tileable parallax layers getBackground('meadow') hands out (backgrounds.js)
//  - meadowSun(colours): the sun, baked once per colour

// a periodic ridge (in art pixels): the same terms as backgrounds.js's periodic(), in game units, plus fine crags
function fineRidge(base, terms, x, R = ART_R) { return R * (base - periodic(x / R, terms)); }
// a value from -1 to 1 that repeats every `w` pixels: smooth noise for tileable textures
function loopNoise(x, w, seed) {
  let v = 0;
  for (const [k, a, p] of [[3, 0.5, 0.3], [7, 0.3, 1.9], [13, 0.2, 4.1], [29, 0.12, 2.6]]) v += a * Math.sin((x / w) * Math.PI * 2 * k + p + seed);
  return v;
}

function meadowFineBackground() {
  const R = ART_R, W = BG_W * R, H = VIEW_H * R;
  const sky = stops => { const P = finePix(VIEW_W * R, H); P.vgrad(0, 0, VIEW_W * R, H, stops); return hiRes(P.canvas()); };

  // ── far mountains: lit faces to the upper left, snow on the high peaks, a haze toward their feet; then a band of
  // far blue-green hills in front of them, softer still
  const mount = finePix(W, H);
  {
    const terms = [[22, 2, 0.5], [12, 5, 1.7], [5, 11, 0.2], [1.6, 23, 2.2], [0.7, 41, 0.9]];
    const top = x => fineRidge(150, terms, ((x % W) + W) % W);
    const tops = Array.from({ length: W }, (_, x) => top(x));
    const slope = x => (tops[(x + 4) % W] - tops[(x - 4 + W) % W]) / 8;   // < 0: the ridge climbs to the right (a face lit from the left)
    const C = { lit: '#bccdf0', mid: '#a6bbe8', shade: '#8ea6dc', deep: '#7e97d2', haze: '#c8d6f4', snow: '#f4f7ff', snowS: '#d2ddf4', rim: '#dde7fa' };
    mount.fill(0, 0, W, H, (x, y) => {
      const t = tops[x];
      if (y < t) return null;
      const d = y - t, fx = Math.round(x - d * 0.55), s = slope(((fx % W) + W) % W) + loopNoise(x + y * 0.4, W, 1) * 0.25;   // facets that slant down the slopes
      let c = s < -0.35 ? C.lit : s < 0.15 ? C.mid : s < 0.6 ? C.shade : C.deep;
      const snowLine = 336 + loopNoise(x, W, 3) * 18 + (x % 5);   // (the high peaks only)
      if (t < 342 && y < snowLine && d < 22 + loopNoise(x * 1.7, W, 5) * 12) c = s < 0.15 ? C.snow : C.snowS;
      if (d < 2) c = t < 342 ? C.snow : C.rim;
      const hz = clamp((y - 400) / 110, 0, 1);   // haze toward the feet
      if (hz > 0) c = lerpColor(c, C.haze, hz);
      return c;
    });
    // far hills: a soft blue-green band
    const ft = [[7, 3, 1.1], [4, 8, 0.4], [1.5, 17, 2.8]];
    mount.fill(0, 0, W, H, (x, y) => {
      const t = fineRidge(186, ft, x);
      if (y < t) return null;
      const k = clamp((y - t) / 50, 0, 1);
      return y - t < 2 ? '#c2e6c8' : k < 0.5 ? lerpColor('#a8d8b8', '#93cdaa', k * 2) : lerpColor('#93cdaa', '#7fbf9a', k * 2 - 1);
    });
    // little round trees dotted along the far hills
    const rng = mulberry32(911);
    for (let i = 0; i < 46; i++) {
      const x = Math.floor(rng() * W), t = fineRidge(186, ft, x), r = 3 + rng() * 4;
      for (const ox of [-W, 0, W]) {
        mount.ell(x + ox, t + r * 0.4, r, r * 1.1, '#6aa888');
        mount.ell(x + ox - r * 0.3, t + r * 0.2, r * 0.6, r * 0.6, '#88c2a0', { only: ['#6aa888'] });
      }
    }
  }

  // ── clouds: fat cumulus, a shadowed flat underside, the light catching their tops, drifting
  const clouds = finePix(W, H);
  {
    const C = { under: '#bcd1ee', shade: '#d6e5f7', body: '#f3f8fe', light: '#ffffff' };
    const list = [[120, 102, 1.05], [520, 176, 0.7], [890, 78, 1.3], [1300, 150, 0.9]];
    const PUFFS = [[0, 0, 30], [40, -16, 38], [86, -2, 30], [-34, 8, 22], [122, 12, 22], [62, 10, 26], [14, 14, 24]];
    for (const [cx, cy, s] of list) for (const ox of [-W, 0, W]) {
      const puffs = PUFFS.map(([dx, dy, r]) => [cx + ox + dx * s, cy + dy * s, r * s]);
      const base = cy + 26 * s;
      const inside = (x, y, grow = 0, dx = 0, dy = 0) => y < base + grow && puffs.some(([px, py, r]) => (x + 0.5 - px - dx) ** 2 + (y + 0.5 - py - dy) ** 2 <= (r + grow) ** 2);
      const x0 = cx + ox - 80 * s, x1 = cx + ox + 170 * s, y0 = cy - 70 * s, y1 = base + 4;
      clouds.fill(x0, y0, x1, y1, (x, y) => {
        if (!inside(x, y)) return null;
        if (y > base - 6 * s) return y > base - 3 * s ? C.under : C.shade;   // the flat underside
        if (inside(x, y, -3 * s, -6 * s, -7 * s)) return C.light;
        if (inside(x, y, -2 * s, -3 * s, -3 * s)) return C.body;
        return C.shade;
      });
    }
  }

  // ── hills: rolling green, a bright rim where the light catches the crest, deeper toward the bottom, with round
  // trees, dark hedgerows following the slopes and specks of wildflowers
  const hills = finePix(W, H);
  {
    const terms = [[16, 3, 0], [9, 7, 2], [4, 13, 1], [0.8, 29, 0.4]];
    const tops = Array.from({ length: W }, (_, x) => fineRidge(176, terms, x));
    const C = ['#9ee59a', '#7fd486', '#68c477', '#58b96b', '#4caa62', '#3f9a58'];
    hills.fill(0, 0, W, H, (x, y) => {
      const t = tops[x];
      if (y < t) return null;
      const d = y - t;
      if (d < 2) return C[0];
      const s = (tops[(x + 3) % W] - tops[(x - 3 + W) % W]) / 6, lit = clamp(-s * 0.6, -0.5, 0.5);   // slopes facing the light are brighter
      const u = clamp(d / 160 - lit * 0.4, 0, 1) * 4 + 1;   // 1 (crest) .. 5 (deep)
      const i = Math.min(5, Math.floor(u)), f = u - Math.floor(u);
      return i < 5 ? lerpColor(C[i], C[i + 1], f) : C[5];
    });
    const rng = mulberry32(4242);
    // hedgerows: rows of little round shrubs following the slope a little way down
    for (let i = 0; i < 9; i++) {
      const x0 = Math.floor(rng() * W), len = 50 + rng() * 110, dd = 24 + rng() * 60;
      for (let x = x0; x < x0 + len; x += 4 + Math.floor(rng() * 3)) {
        const xx = ((x % W) + W) % W, y = tops[xx] + dd + Math.sin(x * 0.05) * 3, r = 2.5 + rng() * 1.5;
        for (const ox of [-W, 0, W]) { hills.ell(xx + ox, y, r, r * 0.85, '#3d8c50'); hills.ell(xx + ox - 0.8, y - 0.8, r * 0.55, r * 0.45, '#5aa864', { only: ['#3d8c50'] }); }
      }
    }
    // round trees on the crests and slopes
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(rng() * W), r = 7 + rng() * 6, t = tops[x] + 2 + rng() * 20;
      for (const ox of [-W, 0, W]) {
        const X = x + ox;
        hills.rect(X - 1, t, 3, r * 0.8, '#6a4a2a');
        hills.ell(X, t - r * 0.4, r, r * 0.9, '#3a8a4c');
        hills.ell(X - r * 0.15, t - r * 0.5, r * 0.85, r * 0.75, '#4fa45c', { only: ['#3a8a4c'] });
        hills.ell(X - r * 0.25, t - r * 0.6, r * 0.65, r * 0.55, '#4fa45c', { only: ['#3a8a4c'] });
        hills.ell(X - r * 0.4, t - r * 0.75, r * 0.35, r * 0.28, '#78c878', { only: ['#4fa45c'] });
      }
    }
    // wildflower specks
    for (let i = 0; i < 260; i++) {
      const x = Math.floor(rng() * W), y = tops[x] + 6 + rng() * 140;
      hills.rect(x, y, 1, 1, ['#ffffff', '#fff3a0', '#ffb6d0', '#cfe8ff'][i % 4]);
    }
  }

  return {
    sky: sky(['#3f8fe8', '#4f9ff0', '#64b0f4', '#7cc0f6', '#98cff8', '#b6def9', '#d2ebfb']),
    layers: [{ c: hiRes(mount.canvas()), f: 0.12 }, { c: hiRes(clouds.canvas()), f: 0.2, drift: 0.08 }, { c: hiRes(hills.canvas()), f: 0.4 }],
    live: drawMeadowSky,
    // (1-1's day: the sky at dawn, in the golden afternoon and at sunset, faded in over the blue -- see drawMeadowSky)
    dawn: sky(['#6a74d0', '#9a88d8', '#d09ec8', '#f4b0a8', '#ffd0a0', '#ffe4bc']),
    gold: sky(['#4a8ee8', '#6aa6ea', '#9cbede', '#d2cfb4', '#f0d49a', '#f8dca4']),
    dusk: sky(['#34307e', '#5a4696', '#94589e', '#d06a8e', '#f48a72', '#ffae6a', '#ffcc80']),
  };
}

// the sun: a hot disc with a lit rim up top-left (baked per colour set; its soft glow is drawn see-through, live)
const MEADOW_SUNS = new Map();
function meadowSun(col) {
  const key = col.join();
  if (MEADOW_SUNS.has(key)) return MEADOW_SUNS.get(key);
  if (MEADOW_SUNS.size > 64) MEADOW_SUNS.clear();
  const R = ART_R, S = 48, P = finePix(S * R, S * R), c = S * R / 2;
  P.ell(c, c, 14 * R, 14 * R, col[0]);
  P.ell(c, c, 13 * R, 13 * R, col[1]);
  P.ell(c - 2 * R, c - 2 * R, 10 * R, 10 * R, col[2], { only: [col[1]] });
  P.ell(c - 2.5 * R, c - 2.5 * R, 8 * R, 8 * R, col[2], { only: [col[1]] });
  const img = hiRes(P.canvas());
  MEADOW_SUNS.set(key, img);
  return img;
}

// ── the meadow's tiles, fine: 16 x 16 game pixels each, painted in art pixels. A grassy top tile is taller than its
// cell (`oy`: blades of grass stand up over the top edge, drawn over whatever's above). Every tile tiles seamlessly.
const MF = {
  soil: ['#7a4024', '#9a5634', '#b86c40', '#c97f4a', '#d8935c', '#e8aa72'],
  grass: ['#23803e', '#2f9a49', '#43b452', '#5fd068', '#86e27e', '#b8f5a0'],
  pebble: ['#5e3a24', '#8a6448', '#b08a68', '#d8b890'],
};
// smooth blotchy noise that repeats every `p` pixels both ways (-1 .. 1): value noise on a grid of `cells`, two octaves
function loopNoise2(x, y, p, seed, cells = 4) {
  const oct = (n, sd) => {
    const cs = p / n, gx = x / cs, gy = y / cs, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const val = (i, j) => { const h = hashStr(sd + ':' + (((i % n) + n) % n) + ',' + (((j % n) + n) % n)); return (h % 1000) / 500 - 1; };
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = val(x0, y0) + (val(x0 + 1, y0) - val(x0, y0)) * sx, b = val(x0, y0 + 1) + (val(x0 + 1, y0 + 1) - val(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
  return oct(cells, seed) * 0.65 + oct(cells * 2, seed + 0.5) * 0.35;
}
// the soil: warm earth in soft patches, pebbles, the odd root (variant v)
function paintFineSoil(P, v, oy = 0) {
  const S = 16 * ART_R, C = MF.soil, rng = mulberry32(1300 + v * 71);
  P.fill(0, oy, S, oy + S, (x, y) => {
    const yy = y - oy, n = loopNoise2(x, yy, S, v), d = 0.5;
    const u = n * 1.5 + 3;   // around the base tone
    const i = clamp(Math.floor(u), 1, 4);
    return C[u - Math.floor(u) > d ? Math.min(5, i + 1) : i];
  });
  // specks of grit
  for (let k = 0; k < 14; k++) { const x = Math.floor(rng() * S), y = oy + Math.floor(rng() * S); P.rect(x, y, 1, 1, rng() < 0.5 ? C[1] : C[5]); }
  // pebbles, kept clear of the edges so the tiles meet cleanly
  const n = 1 + (v % 3);
  for (let k = 0; k < n; k++) {
    const r = 2.2 + rng() * 2.6, x = 6 + rng() * (S - 12), y = oy + 6 + rng() * (S - 12), Pb = MF.pebble;
    P.ell(x + 0.8, y + 1, r + 0.6, r * 0.75 + 0.6, C[0]);
    P.ell(x, y, r, r * 0.75, Pb[1]);
    P.ell(x - r * 0.25, y - r * 0.25, r * 0.6, r * 0.42, Pb[2], { only: [P.col(Pb[1])] });
    P.rect(Math.round(x - r * 0.45), Math.round(y - r * 0.45), 1, 1, Pb[3]);
  }
  if (v === 3 || v === 6) {   // a thin root wandering through
    let x = 4 + rng() * 10, y = oy + 8 + rng() * 20;
    for (let k = 0; k < 26 && x < S - 3; k++) { P.rect(Math.round(x), Math.round(y), 1, 1, C[1]); P.rect(Math.round(x), Math.round(y) - 1, 1, 1, C[4], { only: [P.col(C[3]), P.col(C[2])] }); x += 1; y += Math.sin(k * 0.6 + v) * 0.7; }
  }
}
// the grass cap: blades standing up over the top, a lit crest, then a lower edge of hanging tufts and a shadow on the earth
const FINE_GRASS_UP = 4;   // game pixels the blades stand above the tile
function paintFineGrass(P, v, oy) {
  const S = 16 * ART_R, G = MF.grass, rng = mulberry32(2100 + v * 37);
  const edge = Array.from({ length: S }, (_, x) => 14 + Math.round(3 * (Math.sin(x * Math.PI * 2 / S * 2 + v) * 0.5 + Math.sin(x * Math.PI * 2 / S * 5 + v * 2) * 0.5)));
  // tufts that hang lower here and there
  for (let k = 0; k < 3; k++) { const x0 = 3 + Math.floor(rng() * (S - 10)), w = 3 + Math.floor(rng() * 4), dd = 3 + Math.floor(rng() * 5); for (let i = 0; i < w; i++) edge[x0 + i] += Math.round(dd * Math.sin(Math.PI * (i + 0.5) / w)); }
  // the earth's shadow under the grass
  for (let x = 0; x < S; x++) for (let k = 0; k < 4; k++) { const y = oy + edge[x] + k; if (k < 2 || 0.5 < 0.5 - k * 0.12) P.rect(x, y, 1, 1, MF.soil[k < 1 ? 0 : 1]); }
  // the grass itself: fine vertical streaks of blades, lit at the top, darkening down
  P.fill(0, oy, S, oy + 24, (x, y) => {
    const yy = y - oy;
    if (yy >= edge[x]) return null;
    const d = 0.5, streak = ((x * 7 + (x >> 2) * 3) % 5) / 5, k = yy / edge[x];
    if (yy >= edge[x] - 2) return G[0];
    let u = 4.2 - k * 3.2 + (streak - 0.5) * 1.1;
    if (yy < 2) u = 5;
    const i = clamp(Math.floor(u), 0, 5);
    return G[u - Math.floor(u) > d ? Math.min(5, i + 1) : i];
  });
  // blades standing up over the top edge (none at the tile's very edges, so neighbours line up)
  for (let x = 2; x < S - 2; x++) {
    if (rng() < 0.45) continue;
    const h = 2 + Math.floor(rng() * (FINE_GRASS_UP * ART_R - 2)), lean = rng() < 0.5 ? -1 : 1;
    for (let j = 0; j < h; j++) {
      const bx = x + (j > h * 0.6 ? lean : 0);
      P.rect(bx, oy - 1 - j, 1, 1, j === h - 1 ? G[5] : j > h / 2 ? G[4] : G[3]);
    }
  }
  // a wildflower in the grass now and then
  if (v === 2 || v === 5) {
    const x = 10 + (v * 13) % 26, y = oy - 4;
    P.rect(x, y + 1, 1, 4, G[1]);
    P.ell(x + 0.5, y, 1.8, 1.8, v === 2 ? '#ffffff' : '#ffb6d0'); P.rect(x, y - 1, 1, 1, '#ffd84a');
  }
}
// a ragged, chipped edge (mask: 1 left, 2 right, 4 bottom) on a fine tile: the profile wanders, the rim darkens
function chipFine(src, th, mask, seed, rimCol) {
  const R = src.r, cv = src.canvas, w = cv.width, h = cv.height, oy = (src.oy || 0) * R;
  const out = makeCanvas(w, h), g = out.getContext('2d');
  g.drawImage(cv, 0, 0);
  const img = g.getImageData(0, 0, w, h), px = new Uint32Array(img.data.buffer);
  const rng = mulberry32(seed), dark = P32(rimCol || th.ground[1]), rimGrass = P32(th.top ? th.top[1] : MF.grass[0]);
  const profile = n => {
    const a = []; let d = rng() * 3 + 1;
    for (let i = 0; i < n; i++) {
      const r = rng(); d += r < 0.3 ? -1 : r < 0.6 ? 1 : 0;
      if (rng() < 0.05) d += 3;                       // the odd bigger bite
      d = clamp(d, 0, 4 * R); a.push(Math.round(d));
    }
    for (let k = 0; k < 2; k++) for (let i = 1; i < n - 1; i++) a[i] = Math.round((a[i - 1] + a[i] * 2 + a[i + 1]) / 4);   // smoothed: crumbly, not noisy
    return a;
  };
  const clear = (x, y) => { if (x >= 0 && x < w && y >= 0 && y < h) px[y * w + x] = 0; };
  const rim = (x, y) => { if (x >= 0 && x < w && y >= 0 && y < h && px[y * w + x]) px[y * w + x] = oy && y < oy + 15 ? rimGrass : dark; };
  if (mask & 1) { const pr = profile(h); for (let y = 0; y < h; y++) { for (let x = 0; x < pr[y]; x++) clear(x, y); rim(pr[y], y); if (y >= oy) rim(pr[y] + 1, y); } }
  if (mask & 2) { const pr = profile(h); for (let y = 0; y < h; y++) { for (let x = 0; x < pr[y]; x++) clear(w - 1 - x, y); rim(w - 1 - pr[y], y); if (y >= oy) rim(w - 2 - pr[y], y); } }
  if (mask & 4) { const pr = profile(w); for (let x = 0; x < w; x++) { for (let y = 0; y < pr[x]; y++) clear(x, h - 1 - y); rim(x, h - 1 - pr[x]); rim(x, h - 2 - pr[x]); } }
  g.putImageData(img, 0, 0);
  const res = hiRes(out, R); res.oy = src.oy || 0;
  return res;
}
const P32 = c => { const n = parseInt(c.slice(1), 16); return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0; };

// the mystery block: a rounded amber block, bevelled, with a four-point sparkle that twinkles (frames 0-2)
function paintFineQuestion(f) {
  const R = ART_R, S = 16 * R, P = finePix(S, S), c = S / 2;
  const round = (x, y, r = 4) => { const dx = Math.max(0, Math.max(r - x - 0.5, x + 0.5 - (S - r))), dy = Math.max(0, Math.max(r - y - 0.5, y + 0.5 - (S - r))); return dx * dx + dy * dy <= r * r; };
  P.fill(0, 0, S, S, (x, y) => round(x, y) ? '#6a340e' : null);
  const face = [['#ffcf80', '#ffb347', '#f29a34'], ['#ffd896', '#ffc062', '#f8a842'], ['#ffe2a8', '#ffcf80', '#ffb85a']][f];
  P.vgrad(2, 2, S - 4, S - 4, face, { only: [P.col('#6a340e')] });
  P.fill(0, 0, S, S, (x, y) => round(x, y, 5) && x >= 2 && y >= 2 && x < S - 2 && y < S - 2 && (x < 5 || y < 5) && x + y < S * 1.4 ? '#fff0c8' : null);   // the lit bevel
  P.fill(0, 0, S, S, (x, y) => x >= 2 && y >= 2 && x < S - 2 && y < S - 2 && (x >= S - 5 || y >= S - 5) && x + y > S * 0.6 ? '#d97e22' : null);   // the shaded bevel
  for (const [x, y] of [[6, 6], [S - 8, 6], [6, S - 8], [S - 8, S - 8]]) { P.rect(x, y, 2, 2, '#c46a1a'); P.rect(x, y, 1, 1, '#fff0c8'); }   // rivets
  // the sparkle: a soft glow, its shadow, the star (slim points, a fat middle), a bright core
  const star = (x, y, r) => { const dx = Math.abs(x + 0.5 - c), dy = Math.abs(y + 0.5 - c); return Math.pow(dx / r, 0.5) + Math.pow(dy / r, 0.5) <= 1; };
  const r = [19, 20, 21][f];
  P.fill(0, 0, S, S, (x, y) => star(x - 2, y - 2, r) ? '#c4661a' : null, { only: face.map(P.col) });
  P.fill(0, 0, S, S, (x, y) => star(x, y, r) ? (f ? '#ffffff' : '#fff6dc') : null);
  P.ell(c, c, 2.5, 2.5, '#ffffff');
  if (f === 2) { P.rect(8, 9, 2, 2, '#ffffff'); P.rect(S - 11, S - 13, 2, 2, '#ffffff'); }
  return P.hi();
}
// the crate: a framed box of three planks with a diagonal brace, grain, nail heads
function paintFineCrate(th) {
  const R = ART_R, S = 16 * R, P = finePix(S, S), [b, d, l] = th.brick;
  P.rect(0, 0, S, S, '#2e1a0c');
  P.rect(2, 2, S - 4, S - 4, d);
  P.rect(2, 2, S - 4, 2, l); P.rect(2, 2, 2, S - 4, l);   // the frame's lit edges
  P.rect(8, 8, S - 16, S - 16, b);
  for (const y of [8 + 10, 8 + 21]) { P.rect(8, y, S - 16, 1, '#7a4a24'); P.rect(8, y + 1, S - 16, 1, '#e8b47c'); }   // plank seams
  const rng = mulberry32(57);
  for (let k = 0; k < 16; k++) { const x = 9 + Math.floor(rng() * (S - 20)), y = 9 + Math.floor(rng() * (S - 18)); P.rect(x, y, 2 + Math.floor(rng() * 5), 1, rng() < 0.5 ? '#b47a42' : '#e0aa70', { only: [P.col(b)] }); }   // grain
  for (let i = -1; i <= 1; i++) P.line(8, S - 9 + i, S - 9 + i, 8, i ? d : '#7a4a24', { only: [P.col(b), P.col('#b47a42'), P.col('#e0aa70'), P.col('#7a4a24'), P.col('#e8b47c')] });   // the brace
  P.line(9, S - 9, S - 9, 9, l, { only: [P.col(d)] });
  for (const [x, y] of [[4, 4], [S - 7, 4], [4, S - 7], [S - 7, S - 7]]) { P.ell(x + 1.5, y + 1.5, 1.7, 1.7, '#5a3a20'); P.rect(x + 1, y + 1, 1, 1, '#f3e2bd'); }
  return P.hi();
}
// a spent block: dull and dark, the sparkle pressed into it
function paintFineUsed() {
  const R = ART_R, S = 16 * R, P = finePix(S, S), c = S / 2;
  const round = (x, y, r = 4) => { const dx = Math.max(0, Math.max(r - x - 0.5, x + 0.5 - (S - r))), dy = Math.max(0, Math.max(r - y - 0.5, y + 0.5 - (S - r))); return dx * dx + dy * dy <= r * r; };
  P.fill(0, 0, S, S, (x, y) => round(x, y) ? '#3e2616' : null);
  P.vgrad(2, 2, S - 4, S - 4, ['#b08a60', '#a67c52', '#906844'], { only: [P.col('#3e2616')] });
  P.rect(2, 2, S - 4, 2, '#c9a073'); P.rect(2, 2, 2, S - 4, '#c9a073'); P.rect(2, S - 4, S - 4, 2, '#7a5535'); P.rect(S - 4, 2, 2, S - 4, '#7a5535');
  const star = (x, y, r) => { const dx = Math.abs(x + 0.5 - c), dy = Math.abs(y + 0.5 - c); return Math.pow(dx / r, 0.5) + Math.pow(dy / r, 0.5) <= 1; };
  P.fill(0, 0, S, S, (x, y) => star(x + 1, y + 1, 14) ? '#d4ae84' : null);
  P.fill(0, 0, S, S, (x, y) => star(x, y, 14) ? '#7f5a3a' : null);
  return P.hi();
}
// swap a fine theme's tiles in (getTileset, tiles.js)
function fineMeadowTiles(set, th, name) {
  const R = ART_R, S = 16 * R, UP = FINE_GRASS_UP * R;
  const soil = v => { const P = finePix(S, S); paintFineSoil(P, v); return P.hi(); };
  const top = v => { const P = finePix(S, S + UP); paintFineSoil(P, v, UP); paintFineGrass(P, v, UP); const img = P.hi(); img.oy = FINE_GRASS_UP; return img; };
  for (let v = 0; v < 8; v++) { set['ground' + v] = soil(v); set['groundTop' + v] = top(v); }
  set.ground = set.ground0; set.groundTop = set.groundTop0;
  const chips = new Map();
  set.chip = (key, mask, h) => {
    const v = h & 7, srcKey = set[key + v] ? key + v : key, k = srcKey + '_' + mask;
    if (!chips.has(k)) chips.set(k, chipFine(set[srcKey], th, mask, hashStr(name + k)));
    return chips.get(k);
  };
}

// ── sunflowers, fine: the ring of petals and the seed face are baked (cached); the eyes and smile are drawn live
// a ring of `n` petals round radius `r` (game px), two rows (the back row darker, between the front petals), turned by
// `rot` (snapped to 1/8 of a petal step, so there are only a few to bake), with the ink line round it all
const FLOWER_RINGS = new Map();
function flowerRing(r, n, len, wid, pal, rot) {
  const step = Math.PI * 2 / n, q = Math.round((((rot % step) + step) % step) / step * 8) % 8, key = [r, n, len, wid, pal.join(), q].join('|');
  let img = FLOWER_RINGS.get(key);
  if (img) return img;
  const R = ART_R, G = Math.ceil((r + len) * 2 + 4), P = finePix(G * R, G * R), c = G * R / 2, a0 = q / 8 * step;
  const petal = (a, rr, L, Wd, cols) => {
    const px = c + Math.cos(a) * rr * R, py = c + Math.sin(a) * rr * R;
    P.ell(px, py, L * R, Wd * R, cols[0], { rot: a });                                                                  // shade
    P.ell(px + Math.cos(a) * 0.4 * R, py + Math.sin(a) * 0.4 * R, (L - 0.5) * R, (Wd - 0.6) * R, cols[1], { rot: a, only: [P.col(cols[0])] });
    P.ell(px + Math.cos(a) * 0.6 * R, py + Math.sin(a) * 0.6 * R, (L - 0.9) * R, (Wd - 0.9) * R, cols[1], { rot: a, only: [P.col(cols[0])] });   // body
    P.ell(px + Math.cos(a) * 1.0 * R - 0.35 * R, py + Math.sin(a) * 1.0 * R - 0.35 * R, (L - 1.8) * R, Math.max(0.35, Wd - 1.9) * R, cols[2], { rot: a, only: [P.col(cols[1])] });   // the light along it
  };
  for (let i = 0; i < n; i++) petal(a0 + (i + 0.5) * step, r + 0.6, len, wid, [pal[0], pal[1], pal[2]]);   // back row
  for (let i = 0; i < n; i++) petal(a0 + i * step, r, len, wid, [pal[1], pal[2], pal[3]]);               // front row
  P.outline(INK); P.outline(INK);
  img = P.hi();
  FLOWER_RINGS.set(key, img);
  return img;
}
// the seed face: a dark ring, warm brown with a soft light top-left, seeds spiralling out from the middle
const FLOWER_FACES = new Map();
function flowerFace(r, pal = ['#4a2a10', '#6a3e18', '#7a4a1a', '#9a6230', '#b47a40']) {
  const key = r + pal.join();
  let img = FLOWER_FACES.get(key);
  if (img) return img;
  const R = ART_R, G = Math.ceil(r * 2 + 2), P = finePix(G * R, G * R), c = G * R / 2;
  P.ell(c, c, r * R, r * R, pal[1]);
  P.ell(c - 0.3 * R, c - 0.3 * R, (r - 0.5) * R, (r - 0.5) * R, pal[2], { only: [P.col(pal[1])] });
  P.ell(c - 0.6 * R, c - 0.6 * R, (r - 1) * R, (r - 1) * R, pal[2], { only: [P.col(pal[1])] });
  P.ell(c - r * 0.35 * R, c - r * 0.4 * R, r * 0.55 * R, r * 0.45 * R, pal[3], { only: [P.col(pal[2])] });
  for (let i = 0; i < r * r * 1.6; i++) {   // seeds on the golden angle
    const a = i * 2.39996, d = Math.sqrt(i / (r * r * 1.6)) * (r - 0.8) * R, x = Math.round(c + Math.cos(a) * d), y = Math.round(c + Math.sin(a) * d);
    P.rect(x, y, 1, 1, (x + y) % 3 ? pal[0] : pal[4], { only: [P.col(pal[1]), P.col(pal[2]), P.col(pal[3])] });
  }
  P.outline(INK); P.outline(INK);
  img = P.hi();
  FLOWER_FACES.set(key, img);
  return img;
}
const PETALS_GOLD = ['#c47a00', '#ffb800', '#ffd23f', '#fff0a0'], PETALS_FIRE = ['#a8301a', '#e0562a', '#ffad2a', '#ffe08a'];
// put a baked flower part down centred on (x, y)
const drawCentred = (ctx, img, x, y) => ctx.drawImage(img, fSnap(x - img.width / 2), fSnap(y - img.height / 2));
// a stem from (x0, y0) up to (x1, y1) through the control point (cx, cy): ink-edged, lit on its left
function fineStem(ctx, x0, y0, cx, cy, x1, y1, w = 1.6) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * ART_R * 0.9), pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n, v = 1 - u; pts.push([v * v * x0 + 2 * v * u * cx + u * u * x1, v * v * y0 + 2 * v * u * cy + u * u * y1]); }
  const s = 1 / ART_R;
  fRects(ctx, INK, pts.map(([x, y]) => [x - w - s * 2, y - s, (w + s * 2) * 2, s * 3]));
  fRects(ctx, '#4caf50', pts.map(([x, y]) => [x - w, y, w * 2, s * 2]));
  fRects(ctx, '#86da74', pts.map(([x, y]) => [x - w + s, y, s * 2, s * 2]));
  fRects(ctx, '#2e8a3a', pts.map(([x, y]) => [x + w - s * 2, y, s * 2, s * 2]));
  return pts;
}
// a leaf from (x, y) out along (ux, uy), `len` long: ink-edged, shaded, a vein down the middle
function fineLeaf(ctx, x, y, ux, uy, len, wid, droop = 0) {
  const nx = -uy, ny = ux, pts = [];
  for (let j = 0; j <= 10; j++) { const k = j / 10, w = Math.sin(Math.PI * Math.pow(k, 0.8)) * wid; pts.push([x + ux * len * k, y + uy * len * k + droop * k * k, w]); }
  for (const [lx, ly, w] of pts) fBlob(ctx, lx, ly, w + 0.7, INK);
  for (const [lx, ly, w] of pts) fBlob(ctx, lx, ly, w, '#4fb85c');
  for (const [lx, ly, w] of pts) if (w > 0.8) fBlob(ctx, lx - nx * w * 0.3 - 0.2, ly - Math.abs(ny) * w * 0.4 - 0.3, w * 0.55, '#78d878');
  for (let j = 1; j < pts.length - 1; j++) fLine(ctx, pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1], '#2e8a3a');
}

// ── the meadow's ground decor, fine: a bush (baked per size), a wildflower (per colour), a grass tuft
const MEADOW_DECOR = new Map();
const decorArt = (key, paint) => MEADOW_DECOR.get(key) || (MEADOW_DECOR.set(key, paint()), MEADOW_DECOR.get(key));
// a round leafy bush, three lobes, lit from the upper left: dark under-leaves, layered clusters, a few bright leaf tips
function meadowBush(s) {
  return decorArt('bush' + s, () => {
    const R = ART_R, G = { w: 48, h: 24 }, P = finePix(G.w * R, G.h * R), k = 0.8 + s * 0.4, base = (G.h - 1) * R;
    const L = ['#1f6a36', '#2f8a46', '#3f9e52', '#53b462', '#78cc7c', '#a6e69a'];
    const lobes = [[10, -2, 9], [22, -6, 11], [34, -2, 9]].map(([dx, dy, r]) => [dx * R, base + dy * R, r * k * R]);
    for (const [x, y, r] of lobes) P.ell(x, y, r, r, L[1]);
    const rng = mulberry32(400 + s * 1000 | 0);
    for (let i = 0; i < 70; i++) {   // leaf clusters: darker low down, brighter up on the left
      const [lx, ly, lr] = lobes[i % 3], a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * lr * 0.85, x = lx + Math.cos(a) * d, y = ly + Math.sin(a) * d;
      if (y > base - R) continue;
      const light = clamp(((lx - x) / lr * 0.5 + (ly - y) / lr * 0.8 + 0.6) * 2.5 + rng() * 0.6, 0, 4.9);
      P.ell(x, y, 2.6 + rng() * 2.2, 2 + rng() * 1.6, L[1 + Math.floor(light)], { only: L.map(P.col) });
    }
    P.fill(0, base - 3 * R, G.w * R, base + R, (x, y) => y > base - R * 1.2 ? L[0] : null, { only: L.map(P.col) });   // shade along the ground
    for (let i = 0; i < 4; i++) { const [lx, ly, lr] = lobes[i % 3]; P.ell(lx + (rng() - 0.6) * lr, ly - rng() * lr * 0.7, 1.3, 1.3, ['#ffffff', '#ff9ac8', '#fff1a8', '#ffffff'][i]); }   // a few tiny blossoms
    P.outline('#1a4a2a'); P.outline(INK);
    P.fill(0, base, G.w * R, base + R * 2, () => null);   // (nothing below the ground line)
    const img = P.hi(); img.oy = G.h - 1;
    return img;
  });
}
// a little wildflower: a stem with a leaf, five petals round a gold eye
function meadowFlower(c) {
  return decorArt('flower' + c, () => {
    const R = ART_R, P = finePix(7 * R, 11 * R), cx = 3.5 * R, top = 3 * R;
    P.rect(cx - 1, top, 2, 11 * R - top, '#2f9a49'); P.rect(cx - 1, top, 1, 11 * R - top, '#5fd068');
    P.ell(cx + 3, 7.5 * R, 2.4, 1.2, '#3fae4a', { rot: -0.5 });
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2; P.ell(cx + Math.cos(a) * 3.2, top + Math.sin(a) * 3.2, 2.3, 2.3, c); }
    P.ell(cx, top, 1.7, 1.7, '#ffd166'); P.rect(cx - 1, top - 1, 1, 1, '#fff6c0');
    P.outline(lerpColor(c, '#000000', 0.45));
    const img = P.hi(); img.oy = 11;
    return img;
  });
}
function meadowTuft(v) {
  return decorArt('tuft' + v, () => {
    const R = ART_R, P = finePix(8 * R, 7 * R), G = MF.grass, rng = mulberry32(77 + v);
    for (let i = 0; i < 9; i++) {
      const x0 = 3 + rng() * (8 * R - 6), h = 6 + rng() * 12, lean = (rng() - 0.5) * 6;
      for (let j = 0; j < h; j++) { const x = Math.round(x0 + lean * (j / h) ** 2), y = 7 * R - 1 - j; P.rect(x, y, j < h * 0.6 ? 2 : 1, 1, j > h * 0.75 ? G[4] : j > h * 0.4 ? G[3] : G[1]); }
    }
    const img = P.hi(); img.oy = 7;
    return img;
  });
}
// drawn in place of the plain decor on a fine theme (game-decor.js); false if it isn't one of these
function drawFineDecor(ctx, d) {
  if (d.k === 'bush') { const img = meadowBush(Math.round(d.s * 4) / 4); ctx.drawImage(img, d.x - 1, d.y - img.oy + 1); return true; }
  if (d.k === 'flower') { const img = meadowFlower(d.c); ctx.drawImage(img, d.x - 1, d.y - img.oy); return true; }
  if (d.k === 'tuft') { const img = meadowTuft((d.x >> 2) & 3); ctx.drawImage(img, d.x - 1, d.y - img.oy); return true; }
  return false;
}

// ── the checkpoint banner, fine: a turned wooden pole with a brass knob, a cloth pennant that ripples (and
// flutters once he's reached it), a little sun stitched on it
function drawFineBanner(ctx, x, y, lit, t) {
  const s = 1 / ART_R, cloth = lit ? ['#1c978b', '#2ec4b6', '#7ff0e2'] : ['#55516e', '#6e6a88', '#9894b4'];
  fRect(ctx, x - s, y - 30, 2 + s * 2, 30, INK);
  fRect(ctx, x, y - 30, 2, 30, '#c9a06a'); fRect(ctx, x, y - 30, 2 / 3, 30, '#f0d4a0'); fRect(ctx, x + 4 / 3, y - 30, 2 / 3, 30, '#8a6440');
  fRect(ctx, x - 1, y - 1, 4, 1, '#6a4a2a');   // a collar where it's planted
  const W = 30, H = 21, amp = lit ? 1.3 : 0.5, sp = lit ? 0.16 : 0.05;
  for (let i = -1; i <= W + 1; i++) {   // the pennant, a column of art pixels at a time, tapering to a swallowtail
    const k = clamp(i, 0, W), wave = Math.sin(t * sp - k * 0.22) * amp * (k / W), slope = Math.cos(t * sp - k * 0.22);
    const top = y - 29 + wave + k / W * 1.5, h = (H - k / W * 6) * s, notch = k > W - 6 ? (k - (W - 6)) * 0.55 * s : 0;
    const col = i < 0 || i > W ? INK : slope > 0.5 ? cloth[2] : slope < -0.5 ? cloth[0] : cloth[1];
    ctx.fillStyle = INK; ctx.fillRect(x + 2 + i * s, fSnap(top) - s, s, h + s * 2);
    if (col !== INK) { ctx.fillStyle = col; ctx.fillRect(x + 2 + i * s, fSnap(top), s, h); if (notch) { ctx.fillStyle = INK; ctx.fillRect(x + 2 + i * s, fSnap(top) + h / 2 - notch, s, notch * 2); } }
  }
  const sx = x + 6.5, sy = y - 25.5 + Math.sin(t * sp - 4.5 * 0.66) * amp * 0.3;
  fBlob(ctx, sx, sy, 2.2, lit ? '#ffd166' : '#b4b0cc'); fBlob(ctx, sx - 0.4, sy - 0.4, 1.2, lit ? '#fff3b0' : '#d4d0e4');
  fBlob(ctx, x + 1, y - 31, 2, INK); fBlob(ctx, x + 1, y - 31, 1.5, lit ? '#ffd166' : '#a4a0bc'); fRect(ctx, x + 0.4, y - 31.7, 2 / 3, 2 / 3, '#ffffff');   // the brass knob
}

// ── the goal's stone pedestal, fine (baked per theme): a stepped plinth, a fluted column, a slab trimmed in gold
const FINE_PEDESTALS = new Map();
function finePedestal(th) {
  const key = th.block.join();
  if (FINE_PEDESTALS.has(key)) return FINE_PEDESTALS.get(key);
  const R = ART_R, [b, d, l] = th.block, P = finePix(50 * R, 19 * R), X = x => (x + 25) * R, Y = y => (y + 2) * R;
  const box = (x0, y0, w, h, base, hi, lo) => { P.rect(X(x0), Y(y0), w * R, h * R, base); P.rect(X(x0), Y(y0), w * R, R, hi); P.rect(X(x0), Y(y0 + h) - R, w * R, R, lo); };
  box(-23, 12, 46, 4, d, b, lerpColor(d, '#000000', 0.25));                       // the base step
  P.vgrad(X(-18), Y(4), 36 * R, 8 * R, [l, b, d]);                                  // the column, rounded by the light
  for (let i = -14; i <= 14; i += 7) { P.rect(X(i), Y(5), 2, 6 * R, d); P.rect(X(i) + 2, Y(5), 1, 6 * R, l); }   // flutes
  box(-23, 0, 46, 4, b, l, d);                                                       // the top slab
  P.rect(X(-23), Y(3), 46 * R, 2, '#ffd166'); P.rect(X(-23), Y(3) + 2, 46 * R, 2, '#c8891e'); P.rect(X(-23), Y(3), 46 * R, 1, '#fff3b0');   // its gold trim
  P.ell(X(0), Y(8), 2.6 * R, 2 * R, '#c8891e'); P.ell(X(0), Y(8), 2 * R, 1.4 * R, '#ffd166'); P.rect(X(-0.8), Y(7.2), 2, 2, '#fff3b0');   // the emblem
  P.outline(INK); P.outline(INK);
  const img = P.hi();
  FINE_PEDESTALS.set(key, img);
  return img;
}

// ── 1-1's honey jar, fine: amber honey glowing through rounded glass, a red gingham cloth tied over the lid with twine,
// bubbles caught in the honey and the gleam of the glass. (Origin HONEY_OX, HONEY_OY.)
function fineHoneyJar() {
  const R = ART_R, W = 25, H = 32, P = finePix(W * R, H * R);
  const at = (ax, ay) => [(ax + 0.5) / R - HONEY_OX - 0.5, (ay + 0.5) / R - HONEY_OY - 0.5];
  const body = (dx, dy) => (Math.abs(dx + 0.5) / 10) ** 4 + (Math.abs(dy - 3) / 10.5) ** 4 <= 1 && dy >= -7;
  const HONEY = ['#7a3608', '#9a4a0c', '#bc6210', '#d87e16', '#ee9a20', '#f8b630', '#ffd04c', '#ffe27e'];
  P.fill(0, 0, W * R, H * R, (ax, ay) => {
    const [dx, dy] = at(ax, ay), dith = 0.5;
    if (body(dx, dy)) {
      const inner = body(dx - 0.7, dy) && body(dx + 0.7, dy) && body(dx, dy + 0.7);
      if (!inner) return dy < -5 ? '#d8cfb8' : '#8a4a10';                        // the glass wall (clear above the honey)
      if (dy < -5) return '#efe6cf';                                              // the air gap under the lid
      if (dy < -4.4) return Math.abs(dx) < 7 ? '#ffe9a0' : '#f8c040';             // the honey's surface
      const glow = 7.2 - Math.hypot((dx + 1.5) * 0.55, (dy - 2) * 0.42) - Math.max(0, dy - 8) * 0.35, g = clamp(glow, 0, 7);
      return g >= 7 ? HONEY[7] : lerpColor(HONEY[Math.floor(g)], HONEY[Math.floor(g) + 1], g - Math.floor(g));   // brightest up and left of centre
    }
    if (dy >= -10 && dy <= -7.4 && Math.abs(dx + 0.5) <= 7.5) return dy > -8.2 ? '#d8cfb8' : '#c9a46a';   // the neck and lid rim
    return null;
  });
  // the cloth over the lid: red gingham, gathered into a dome and hanging in little scallops
  P.fill(0, 0, W * R, H * R, (ax, ay) => {
    const [dx, dy] = at(ax, ay);
    if (dy < -16.5 || dy > -6.4) return null;
    const half = dy < -15.5 ? 4 + (dy + 16.5) * 2.5 : dy < -11 ? 8 : 8 + (dy + 11) * 0.4;
    if (Math.abs(dx + 0.5) > half) return null;
    if (dy > -8.2 && dy > -7.6 + Math.cos((dx + 12) * Math.PI / 2) * 0.9 - 0.4) return null;   // the scalloped hem
    const a = Math.floor((dx + 12) / 2) % 2, b = Math.floor((dy + 16) / 2) % 2;
    let c = a && b ? '#d8404a' : a || b ? '#f28a90' : '#fff6f0';
    if (dx > 4 && c !== '#d8404a') c = a || b ? '#e07078' : '#f2dcd8';             // in shade on the right
    if (dy < -15.2 && dx < 0) c = a || b ? '#f8a8ac' : '#ffffff';                    // lit on top
    return c;
  });
  for (let ax = 4 * R; ax <= 21 * R; ax++) P.rect(ax, (HONEY_OY - 11) * R + 1, 1, 2, (ax >> 2) % 3 === 0 ? '#a07c44' : '#d8b878');   // the twine...
  P.ell((HONEY_OX + 6.5) * R, (HONEY_OY - 9.5) * R, 2, 4, '#d8b878', { rot: -0.5 }); P.ell((HONEY_OX + 7.6) * R, (HONEY_OY - 9) * R, 1.6, 3, '#a07c44', { rot: 0.4 });   // ...and its knot
  // bubbles caught in the honey, and the glass catching the light
  for (const [dx, dy, r] of [[6, -2, 1.4], [5, 10, 1], [-5, 11, 1.2], [7, 6, 0.8]]) { P.ell((HONEY_OX + dx + 0.5) * R, (HONEY_OY + dy + 0.5) * R, r * R, r * R, '#ffd04c'); P.rect((HONEY_OX + dx) * R + 1, (HONEY_OY + dy) * R + 1, 1, 1, '#fff4d6'); }
  P.rect((HONEY_OX - 8) * R, (HONEY_OY - 4) * R, 2, 9 * R, '#fff4d6'); P.rect((HONEY_OX - 8) * R, (HONEY_OY + 5) * R, 2, 3 * R, '#ffe2a0');
  P.rect((HONEY_OX - 7) * R, (HONEY_OY - 4) * R, 1, 2 * R, '#fff4d6'); P.rect((HONEY_OX + 8) * R, (HONEY_OY + 2) * R, 2, 2 * R, '#ffe9a8');
  P.outline(INK); P.outline(INK);
  return P.hi();
}
