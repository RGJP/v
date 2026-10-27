'use strict';
// 1-2 HOLLOW CAVERNS, painted fine (hires.js: ART_R x, no dithering): the cavern behind (far glows and giant dim
// crystals, dark spires and stalactites, a rocky floor with bright crystals), the crystal kit used all through the
// cave (backdrop, decor), and the rock itself.

// a faceted crystal prism, `h` tall and `w` wide at its foot (art pixels), leaning `lean`, its three faces lit
// light / mid / dark from the left; up = growing from the floor, else hanging from the roof
function fineCrystal(P, x, base, h, w, lean, cols, up = true, opt = {}) {
  const s = up ? -1 : 1, Y = k => base + s * h * k;
  const L = x - w / 2, Rr = x + w / 2, tip = [x + lean, Y(1)], shL = [L + lean * 0.7, Y(0.72)], shR = [Rr + lean * 0.7, Y(0.72)];
  const m1 = x - w / 6, m2 = x + w / 6;
  P.poly([[L, base], [m1, base], [m1 + lean * 0.8, Y(0.8)], tip, shL], cols[0], opt);
  P.poly([[m1, base], [m2, base], [m2 + lean * 0.8, Y(0.8)], tip, [m1 + lean * 0.8, Y(0.8)]], cols[1], opt);
  P.poly([[m2, base], [Rr, base], shR, tip, [m2 + lean * 0.8, Y(0.8)]], cols[2], opt);
  if (cols[3]) P.line(L + 1, base + s, shL[0] + 1, shL[1], cols[3], opt);   // a bright edge catching the light
}
const CAVE_GEMS = {
  cyan: ['#bffaff', '#5ef2ff', '#2aa3c6', '#ffffff'], magenta: ['#ffd0f4', '#ff7ad9', '#b23aa0', '#ffffff'],
  violet: ['#dcd6e9', '#a298c6', '#675d90', '#f4f0ff'], amber: ['#fff0c0', '#ffc75e', '#c27a1a', '#ffffff'],
};
const CAVE_MUTE = ['#4d476d', '#383355', '#27233d'];

function caveFineBackground() {
  const R = ART_R, W = BG_W * R, H = VIEW_H * R, rng = mulberry32(hashStr('cave-fine'));
  const wrap = (P, x, fn) => { for (const o of [-W, 0, W]) fn(x + o); };
  const cluster = (P, x, base, sc, cols, up) => {
    for (const [dx, k, lean] of [[-1, 0.45, -6], [1.05, 0.4, 5], [-0.55, 0.65, -4], [0.6, 0.7, 3], [0, 1, 0]])
      fineCrystal(P, x + dx * 7 * sc * R, base, 26 * sc * k * R, Math.max(3, 7 * sc * k) * R, lean * sc * R, cols, up);
  };
  // far: soft coloured glows, giant dim crystal formations rising from the floor and hanging from the roof
  const far = finePix(W, H);
  for (let i = 0; i < 7; i++) {
    const x = (i * BG_W / 7 + rng() * 40) * R, y = (50 + rng() * 110) * R, r = (34 + rng() * 22) * R, c = [CAVE_GEMS.cyan, CAVE_GEMS.magenta, CAVE_GEMS.violet][i % 3][1];
    wrap(far, x, X => far.glow(X, y, r, c, 0.16));
  }
  for (let i = 0; i < 5; i++) { const x = (i * BG_W / 5 + 30 + rng() * 30) * R, sc = 1.8 + rng() * 1.2; wrap(far, x, X => cluster(far, X, H - 14 * R, sc, CAVE_MUTE, true)); }
  for (let i = 0; i < 4; i++) { const x = (i * BG_W / 4 + 70 + rng() * 30) * R, sc = 1.2 + rng() * 0.8; wrap(far, x, X => cluster(far, X, 0, sc, CAVE_MUTE, false)); }

  // mid: dark rock spires and stalactites, a faint rim of light down their left edges, a little texture
  const mid = finePix(W, H), ROCK = '#181528', RIM = '#2a2540', TEX = '#1e1a30';
  const spire = (x, w, h, up) => {
    const pts = [];
    for (let j = 0; j <= 12; j++) { const k = j / 12, ww = up ? w * (0.35 + 0.65 * k) : w * (1 - k) + 2; pts.push([x - ww / 2 + Math.sin(j * 1.7 + x) * 2, up ? H - h + h * k : h * k]); }
    for (let j = 12; j >= 0; j--) { const k = j / 12, ww = up ? w * (0.35 + 0.65 * k) : w * (1 - k) + 2; pts.push([x + ww / 2 + Math.sin(j * 2.3 + x) * 2, up ? H - h + h * k : h * k]); }
    mid.poly(pts, ROCK);
    mid.poly(pts.slice(0, 13).map(([px, py]) => [px, py]).concat(pts.slice(0, 13).reverse().map(([px, py]) => [px + 3, py])), RIM, { only: [mid.col(ROCK)] });
  };
  for (let i = 0; i < 6; i++) { const x = (i * BG_W / 6 + rng() * 40) * R, w = (18 + rng() * 16) * R, h = (50 + rng() * 60) * R; wrap(mid, x, X => spire(X, w, h, true)); }
  for (let i = 0; i < 8; i++) { const x = (i * BG_W / 8 + rng() * 30) * R, w = (10 + rng() * 12) * R, h = (20 + rng() * 45) * R; wrap(mid, x, X => spire(X, w, h, false)); }
  mid.fill(0, 0, W, H, (x, y) => ((x * 7 + y * 13) % 29 === 0 || (x * 3 + y * 5) % 37 === 0) ? TEX : null, { only: [mid.col(ROCK)] });

  // near: the rocky floor ridge, a lighter crust along its top, small bright crystals glowing on it
  const near = finePix(W, H), terms = [[8, 3, 0], [5, 8, 1], [3, 19, 2], [0.8, 41, 1.1]];
  const tops = Array.from({ length: W }, (_, x) => fineRidge(204, terms, x));
  near.fill(0, 0, W, H, (x, y) => { const d = y - tops[x]; return d < 0 ? null : d < 2 ? '#2e2a48' : d < 6 ? '#1e1b32' : '#0f0d1a'; });
  for (let i = 0; i < 11; i++) {
    const x = Math.floor((i + 0.3 + rng() * 0.4) * W / 11), cols = [CAVE_GEMS.cyan, CAVE_GEMS.magenta, CAVE_GEMS.violet][i % 3], t = tops[x];
    wrap(near, x, X => { near.glow(X, t - 12, 30, cols[1], 0.22); fineCrystal(near, X, t + 3, 30 + (i % 4) * 6, 10, (i % 3 - 1) * 3, cols, true); fineCrystal(near, X + 9, t + 3, 16, 7, 4, cols, true); });
  }
  return {
    sky: (() => { const P = finePix(VIEW_W * R, H); P.vgrad(0, 0, VIEW_W * R, H, ['#08070f', '#0c0a16', '#110f1e', '#171426', '#1c182e', '#221d35', '#28223d']); return P.hi(); })(),
    layers: [{ c: far.hi(), f: 0.08 }, { c: mid.hi(), f: 0.22 }, { c: near.hi(), f: 0.4 }],
  };
}

// ── the cave's own decor, fine: crystals growing out of the floor (and hanging from the roof), glowing mushrooms,
// stalactites, and the rough roof itself (game-decor.js)
const CAVE_DECOR = new Map();
const caveDecorArt = (key, paint) => CAVE_DECOR.get(key) || (CAVE_DECOR.set(key, paint()), CAVE_DECOR.get(key));
const gemCols = c => [lerpColor(c, '#ffffff', 0.55), c, lerpColor(c, '#000000', 0.4), '#ffffff'];
// a little cluster of crystals (k: its size), its foot at the bottom middle of the canvas
function caveCrystalArt(c, k) {
  return caveDecorArt('cr' + c + k, () => {
    const R = ART_R, G = { w: 20 * k, h: 14 * k }, P = finePix(G.w * R, G.h * R), cols = gemCols(c), base = G.h * R, x0 = 7 * k * R;
    for (const [dx, h, w, lean] of [[-3, 5, 2.4, -1.2], [7, 3, 2.2, 1], [4, 6, 2.4, 0.8], [0, 9.5, 3.2, 0]]) fineCrystal(P, x0 + dx * k * R, base, h * k * R, w * k * R, lean * k * R, cols, true);
    P.outline(lerpColor(c, '#000000', 0.65));
    const img = P.hi(); img.ox = 7 * k; return img;
  });
}
function caveHangArt(c, len) {
  return caveDecorArt('hc' + c + len, () => {
    const R = ART_R, P = finePix(10 * R, (len + 2) * R), cols = gemCols(c);
    fineCrystal(P, 5 * R, 0, len * R, 4 * R, 0, cols, false); fineCrystal(P, 7.5 * R, 0, len * 0.5 * R, 2.4 * R, 0.6 * R, cols, false);
    P.outline(lerpColor(c, '#000000', 0.65));
    return P.hi();
  });
}
function caveStalactiteArt(len) {
  return caveDecorArt('st' + len, () => {
    const R = ART_R, P = finePix(8 * R, (len + 1) * R), cx = 4 * R;
    P.poly([[cx - 2.6 * R, 0], [cx + 2.6 * R, 0], [cx + 0.3 * R, len * R], [cx - 0.2 * R, len * R]], '#12101e');
    P.poly([[cx - 2.6 * R, 0], [cx - 1.2 * R, 0], [cx - 0.2 * R, len * R * 0.9]], '#24203a');   // a faint lit edge
    return P.hi();
  });
}
function caveShroomArt() {
  return caveDecorArt('sh', () => {
    const R = ART_R, P = finePix(5 * R, 6 * R);
    P.rect(2 * R, 2.4 * R, R, 3.6 * R, '#c2fff7'); P.rect(2 * R, 2.4 * R, 1, 3.6 * R, '#ffffff');
    P.ell(2.5 * R, 2.4 * R, 2.4 * R, 1.6 * R, '#2aa3a0'); P.ell(2.2 * R, 2 * R, 1.8 * R, 1 * R, '#59e6d8', { only: [P.col('#2aa3a0')] });
    P.rect(1.4 * R, 1.6 * R, 2, 2, '#c2fff7');
    return P.hi();
  });
}
function drawFineCaveDecor(ctx, d, t) {
  const x = d.x, y = d.y;
  switch (d.k) {
    case 'crystal': {
      const k = d.s || 1, glow = 0.16 + Math.sin(t * 0.05 + d.p) * 0.08, img = caveCrystalArt(d.c, k);
      ctx.globalAlpha = glow; fBlob(ctx, x + 2, y - 5 * k, 7 * k, d.c); ctx.globalAlpha = 1;
      ctx.drawImage(img, x + 1 - img.ox, y - img.height);
      return true;
    }
    case 'hangcrystal': {
      ctx.globalAlpha = 0.14 + Math.sin(t * 0.05 + d.p) * 0.07; fBlob(ctx, x, y + d.len / 2, 8, d.c); ctx.globalAlpha = 1;
      ctx.drawImage(caveHangArt(d.c, d.len), x - 5, y - 1);
      return true;
    }
    case 'stalactite': ctx.drawImage(caveStalactiteArt(d.len), x - 4, y); return true;
    case 'shroomlet': ctx.globalAlpha = 0.25; fBlob(ctx, x + 1.5, y - 4, 4, '#59e6d8'); ctx.globalAlpha = 1; ctx.drawImage(caveShroomArt(), x - 1, y - 6); return true;
  }
  return false;
}
// the rough rock roof of a cave stage, an art pixel column at a time: dark rock, a lit lip along its edge, flecks
function drawFineCeiling(ctx, cam) {
  const R = ART_R, s = 1 / R, x0 = Math.floor(cam) - 2, x1 = Math.ceil(cam + VIEW_W) + 2, rock = [], lip = [], lit = [], fleck = [];
  for (let ax = x0 * R; ax < x1 * R; ax++) {
    const x = ax * s, h = 16 + Math.sin(x * 0.07) * 4 + Math.sin(x * 0.19 + 1) * 2 + Math.sin(x * 0.013) * 5 + Math.sin(x * 0.9) * 0.35, hy = Math.round(h * R) * s;
    rock.push([x, -LIFT_MAX, s, hy + LIFT_MAX]);
    lip.push([x, hy - s * 4, s, s * 4]); lit.push([x, hy - s * 2, s, s]);
    if ((ax * 7) % 31 === 0) fleck.push([x, hy - s * (8 + (ax % 9)), s * 2, s]);
  }
  fRects(ctx, '#12101e', rock); fRects(ctx, '#211d34', lip); fRects(ctx, '#3a3458', lit); fRects(ctx, '#2b2740', fleck);
}

// ── 1-2's set pieces, fine (enemies-cave.js draws them from these) ──
// a snored Z: a puffy lavender letter, lit along its top, an ink line round it
function snoreZArt() {
  return caveDecorArt('Z', () => {
    const R = ART_R, P = finePix(18 * R, 20 * R), X = v => (v + 1) * R, Y = v => (v + 1) * R;
    const Z = [[0, 0], [16, 0], [16, 4], [6, 14], [16, 14], [16, 18], [0, 18], [0, 14], [10, 4], [0, 4]].map(([x, y]) => [X(x), Y(y)]);
    P.poly(Z, '#b4a4f4');
    P.poly(Z.map(([x, y]) => [x - 1, y - 1.5]), '#cbbcff', { only: [P.col('#b4a4f4')] });
    P.rect(X(1), Y(0) + 1, 14 * R, 2, '#f2eeff'); P.rect(X(1), Y(14) + 1, 4 * R, 2, '#f2eeff'); P.rect(X(10), Y(14) + 1, 5 * R, 2, '#f2eeff');
    P.outline(INK); P.outline(INK);
    return P.hi();
  });
}
// a singing crystal's cluster (the big one with the face, two smaller leaning out): lit, and its silhouette in
// shadow and in white (for the dimmed look and a glint sweeping up it)
function chimeArt(col, w, h, gold) {
  return caveDecorArt('ch' + col + w + h + gold, () => {
    const R = ART_R, GW = w + 22, GH = h + 3, by = GH * R - R, mid = GW / 2 * R, cols = gold ? ['#fff8d0', '#ffd84a', '#c8901e', '#ffffff'] : gemCols(col);
    const paint = (fill) => {
      const P = finePix(GW * R, GH * R);
      for (const [dx, pw, ph, lean] of [[-7, 7, h * 0.5, -3], [7, 7, h * 0.62, 3], [0, w, h, 0]]) fineCrystal(P, mid + dx * R, by, ph * R, pw * R, lean * R, fill || cols, true);
      if (!fill) { P.outline(gold ? '#8a5a10' : INK); P.outline(gold ? '#8a5a10' : INK); }
      return P.hi();
    };
    return { lit: paint(), dark: paint(['#1b1a24', '#1b1a24', '#1b1a24']), white: paint(['#ffffff', '#ffffff', '#ffffff']), W: GW, H: GH };
  });
}
// Chiselled cavern gate: irregular bevels, a recessed octagonal seal and mineral seams.
// The cavern's treasure: an antique brass lantern, its living light drawn by drawMothLantern.
function caveLanternArt() {
  return caveDecorArt('moth-lantern', () => {
    const A = mArt(28, 38), B = ['#594229', '#8d6838', '#bf9452', '#e4c57e', '#fff0b6'];
    // A forged hanging loop and a fluted roof above old, slightly green glass.
    A.fill(10.8, 1, 17.5, 8.6, (x,y) => {
      const d = ((x-14)/3.8)**2 + ((y-5)/3.7)**2;
      return d > 0.55 && d < 1 ? softTone(B, -(x-14)*0.2-(y-5)*0.1) : null;
    });
    A.poly([[6.2,14.2],[6.2,30.5],[21.8,30.5],[21.8,14.2]], 'rgba(142,191,155,0.18)');
    A.poly([[7,13.6],[10.5,8.9],[17.5,8.9],[21,13.6],[22.2,15.3],[5.8,15.3]], B[1]);
    A.poly([[7,13.6],[10.5,8.9],[13.4,8.9],[10.8,13.6]], B[3]);
    A.poly([[13.4,8.9],[17.5,8.9],[19,13.6],[13.4,13.6]], B[2]);
    A.soft(14,14.6,8.5,1.4,B);
    for (const side of [-1,1]) {
      const x = 14 + side * 7.2;
      A.line(x,15.5,x,30.7,B[0],null,1.5);
      A.line(x-0.35,15.5,x-0.35,30.7,B[3],null,0.55);
      A.ell(x,17,0.65,0.65,B[4]); A.ell(x,29.5,0.65,0.65,B[2]);
    }
    A.line(10,17,10,25,'rgba(236,255,229,0.55)',null,0.34);
    A.line(11,17.3,11,20,'rgba(255,255,238,0.55)',null,0.34);
    A.soft(14,31.8,8.7,1.5,B); A.soft(14,34.2,9.4,1.5,B);
    for(const x of [8.2,19.8]) A.soft(x,35.4,1.7,0.9,B);
    A.line(9,32,19,32,B[4],null,0.34);
    for(const x of [10,14,18]) A.ell(x,11.5,0.45,0.65,B[0]);
    A.outline('#252734');
    return A.canvas();
  });
}

function runeBlockArt(seed = 0) {
  return caveDecorArt('rb-new' + seed % 7, () => {
    const A = mArt(16, 16), k = seed % 7;
    A.poly([[0, 1.2], [1.2, 0], [14.4, 0], [16, 1.5], [16, 14.7], [14.8, 16], [1.1, 16], [0, 14.5]], '#302e40');
    A.poly([[0.7, 1.8], [1.8, 0.7], [14, 0.7], [15.2, 1.8], [13.6, 3], [2.4, 3], [2.4, 13.4], [0.7, 14.4]], '#858194');
    A.poly([[2.4, 3], [13.6, 3], [15.2, 1.8], [15.2, 14.3], [13.4, 15.2], [1.8, 15.2], [2.4, 13.4]], '#484659');
    A.fill(2.4, 2.4, 13.6, 13.6, (x, y) => lerpColor('#696678', '#3c3a4e', clamp((y + x * 0.2) / 16 + Math.sin(x * 0.7 + k) * 0.035, 0, 1)));
    const seal = [[5, 3.1], [11, 3.1], [13, 5], [13, 11], [11, 13], [5, 13], [3, 11], [3, 5]];
    A.poly(seal.map(([x,y]) => [x + 0.3,y + 0.35]), '#9991a2');
    A.poly(seal, '#222535');
    A.poly(seal.map(([x,y]) => [8 + (x - 8) * 0.9,8 + (y - 8) * 0.9]), '#333344');
    for (const [x,y,dir] of [[1.4, 4 + k * 0.6, 1], [14.3, 9 - k * 0.5, -1]]) {
      A.line(x,y,x + dir * 0.8,y + 1.5,'#222333',null,0.34);
      A.line(x + dir * 0.8,y + 1.5,x + dir * 0.3,y + 2.3,'#222333',null,0.34);
    }
    A.line(4.2, 1.4, 6.3, 1.4, '#b8afbb', null, 0.34);
    A.line(13.9, 12.6, 13.9, 14, '#747d8c', null, 0.34);
    return A.canvas();
  });
}
function runeArt(rune, c) {
  return caveDecorArt('rn-new' + rune.join() + c, () => {
    const paths = [
      [[[4,7],[4,1]], [[1.3,3.6],[4,1],[6.7,3.6]], [[2.4,5],[4,3.4],[5.6,5]]],
      [[[1.2,1.2],[6.8,6.8]], [[6.8,1.2],[1.2,6.8]]],
      [[[4,0.8],[7,2.3],[7,5.7],[4,7.2],[1,5.7],[1,2.3],[4,0.8]], [[4,2.6],[4,5.4]]],
      [[[4,0.8],[7.2,4],[4,7.2],[0.8,4],[4,0.8]], [[1,4],[7,4]]],
      [[[1,1.1],[6.8,1.1],[2,4],[6,4],[1.2,6.9],[7,6.9]]],
      [[[1,1],[1,3],[4,4.7],[7,3],[7,1]], [[4,1],[4,7]]],
    ][Math.max(0, CAVE_RUNES.indexOf(rune))];
    const A = mArt(8, 8);
    for (const path of paths) for (let i = 1; i < path.length; i++) {
      const [x0,y0] = path[i-1], [x1,y1] = path[i];
      A.line(x0,y0,x1,y1,'#171b2c',null,1.3);
      A.line(x0,y0,x1,y1,c,null,0.65);
      A.line(x0-0.15,y0-0.15,x1-0.15,y1-0.15,lerpColor(c,'#ffffff',0.55),null,0.34);
    }
    return A.canvas();
  });
}
// a slab of the sung bridge, crystal points hanging under it
function bridgeSlabArt(c, h1, h2) {
  return caveDecorArt('bs' + c + h1 + h2, () => {
    const R = ART_R, P = finePix(16 * R, 18 * R), cols = gemCols(c), y0 = R;
    for (const [px, ph] of [[4.5, h1], [11.5, h2]]) fineCrystal(P, px * R, y0 + 9 * R, ph * R, 5 * R, 0, cols, false);
    P.rect(0, y0, 16 * R, 9 * R, c); P.rect(0, y0 + 5 * R, 16 * R, 4 * R, cols[2]); P.rect(0, y0, 16 * R, 2, cols[0]);
    P.line(3 * R, y0 + 4 * R, 7 * R, y0, '#ffffff'); P.line(3 * R + 1, y0 + 4 * R, 7 * R + 1, y0, '#ffffff');
    P.outline(INK); P.outline(INK);
    return P.hi();
  });
}
// the rock shelf a slate stands on (w game px wide), drips of rock underneath, crystals sprouting at its ends
function rockShelfArt(w) {
  return caveDecorArt('sf' + w, () => {
    const R = ART_R, P = finePix((w + 4) * R, 20 * R), x0 = 2 * R, x1 = (w + 2) * R, y = 8 * R;
    P.fill(x0, y, x1, y + 7 * R, (x, yy) => yy < y + 2 ? '#9d9bb0' : yy < y + 2 * R ? '#7c7991' : yy >= y + 5 * R ? '#2f2c40' : '#4b495d');
    for (let x = x0 + 3 * R; x < x1 - 3 * R; x += 7 * R) { const d = (2 + ((x * 7) % 4)) * R; P.poly([[x - R, y + 7 * R], [x + 3 * R, y + 7 * R], [x + R, y + 7 * R + d]], '#2f2c40'); }
    for (const [ex, c] of [[x0 + 3 * R, '#7ff0e2'], [x1 - 4 * R, '#ff9ad5']]) for (const [dx, hh] of [[-2, 5], [0, 7], [2, 4]]) fineCrystal(P, ex + dx * R, y, hh * R, 2.4 * R, dx * 0.5 * R, gemCols(c), true);
    P.outline(INK); P.outline(INK);
    const img = P.hi(); img.oy = 8;
    return img;
  });
}
// the carved stele (w x h): a rounded top, a carved border, a gem in its crown (lit once read), glowing lichen
function slateArt(w, h, read, n, cell) {
  return caveDecorArt('sl' + w + h + read + n, () => {
    const R = ART_R, P = finePix((w + 2) * R, (h + 2) * R), X = v => (v + 1) * R, r = 4 * R;
    const inside = (x, y) => { const lx = x + 0.5 - X(0), ly = y + 0.5 - X(0); if (lx < 0 || ly < 0 || lx > w * R || ly > (h - 1) * R) return false; const cx = Math.min(lx, w * R - lx); return !(ly < r && cx < r && Math.hypot(r - cx, r - ly) > r); };
    P.fill(0, 0, (w + 2) * R, (h + 2) * R, (x, y) => inside(x, y) ? lerpColor('#7a7886', '#5e5c6a', (y / R) / h) : null);
    P.fill(0, 0, (w + 2) * R, (h + 2) * R, (x, y) => inside(x, y) && (!inside(x - 3, y) || !inside(x, y - 3)) ? '#a4a2b1' : null);
    P.fill(0, 0, (w + 2) * R, (h + 2) * R, (x, y) => inside(x, y) && (!inside(x + 3, y) || !inside(x, y + 3)) ? '#4e4c5c' : null);
    const bx0 = X(3.5), bx1 = X(w - 3.5), by0 = X(5.5), by1 = X(h - 3.5);   // the carved border
    for (const [ax, ay, bx, byy] of [[bx0, by0, bx1, by0], [bx0, by1, bx1, by1], [bx0, by0, bx0, by1], [bx1, by0, bx1, by1]]) { P.line(ax, ay, bx, byy, '#504e5e'); P.line(ax + 1, ay + 1, bx + 1, byy + 1, '#8e8c9c'); }
    const x0 = X(0) + Math.round((w - (n * (cell + 1) - 1)) / 2) * R;
    for (let i = 1; i < n; i++) { const dx = x0 + (i * (cell + 1) - 1) * R; P.rect(dx, by0 + R, 2, by1 - by0 - 2 * R, '#504e5e'); P.rect(dx + 2, by0 + R, 1, by1 - by0 - 2 * R, '#8e8c9c'); }   // grooves between the cells
    const gx = X(w / 2), gy = X(3);
    P.ell(gx, gy, 2.4 * R, 1.8 * R, INK); P.ell(gx, gy, 1.7 * R, 1.1 * R, read ? '#7ad8ff' : '#3a384a'); P.ell(gx - 0.6 * R, gy - 0.4 * R, 0.6 * R, 0.4 * R, read ? '#ffffff' : '#5b596d');
    for (const [lx, ly, c] of [[2, h - 3, '#7ff0e2'], [3.4, h - 4, '#7ff0e2'], [w - 3, h - 3, '#ff9ad5'], [w - 6, 3.2, '#7ff0e2']]) P.ell(X(lx), X(ly), 1.4, 1.4, c);
    P.outline(INK); P.outline(INK);
    return P.hi();
  });
}
