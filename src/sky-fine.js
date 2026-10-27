'use strict';
// 1-3 CLOUDTOP HEIGHTS, painted fine (hires.js: ART_R x, no dithering): the sky behind (a big soft sun, floating
// islands with grassy tops and ruined columns, two banks of billowing cloud).

function skyFineBackground() {
  const R = ART_R, W = BG_W * R, H = VIEW_H * R, rng = mulberry32(hashStr('sky-fine'));
  const wrap = (x, fn) => { for (const o of [-W, 0, W]) fn(x + o); };
  // the sun: a wide soft glow, a hot white disc, a warm rim
  const sun = finePix(W, H), sx = 96 * R, sy = 52 * R;
  sun.glow(sx, sy, 72 * R, '#fff6c8', 0.75); sun.glow(sx, sy, 36 * R, '#fffbe6', 0.7);
  sun.ell(sx, sy, 18.5 * R, 18.5 * R, '#ffe9a0'); sun.ell(sx, sy, 17 * R, 17 * R, '#fffbe6'); sun.ell(sx - 3 * R, sy - 3 * R, 11 * R, 11 * R, '#ffffff');
  // distant floating islands: grass on top, rock tapering to a point underneath (lit on the left), two little columns
  const isles = finePix(W, H);
  for (let i = 0; i < 5; i++) {
    const x = (i * BG_W / 5 + rng() * 40) * R, y = (70 + rng() * 60) * R, w = (26 + rng() * 30) * R, seed = rng() * 9;
    wrap(x, X => {
      const pts = [[X - 1, y + 4 * R]];
      for (let j = 0; j <= 10; j++) { const k = j / 10; pts.push([X + w * k, y + 4 * R + (Math.sin(k * Math.PI) * (w * 0.5) + Math.sin(k * 9 + seed) * 2 * R) * (0.6 + 0.4 * Math.sin(k * Math.PI))]); }
      isles.poly(pts, '#8fb2e6');
      isles.poly(pts.map(([px, py]) => [px - (px - X) * 0.45 + w * 0.02, py]), '#a4c2ee', { only: [isles.col('#8fb2e6')] });   // the lit side
      isles.rect(X, y + R, w, 3.5 * R, '#b7d1f4'); isles.rect(X, y, w, 1.6 * R, '#d6e7fb');
      for (let k = 0; k < 2; k++) {   // ruined columns on top
        const cx = X + 6 * R + k * (w - 14 * R), ch = (6 + ((i + k) % 3) * 2) * R;
        isles.rect(cx, y - ch, 3 * R, ch, '#a4c2ee'); isles.rect(cx, y - ch, R, ch, '#c8dcf6'); isles.rect(cx - R, y - ch - R, 5 * R, R, '#c8dcf6');
      }
    });
  }
  // a bank of billowing cloud: round puffs along a line, lit on top, a soft shadow along their undersides, solid below
  const cloudSea = (baseY, n, rMin, rMax, shade, fill, light) => {
    const P = finePix(W, H), puffs = [];
    for (let i = 0; i < n; i++) puffs.push([(i * BG_W / n + rng() * 12) * R, (baseY + rng() * 6) * R, (rMin + rng() * (rMax - rMin)) * R]);
    const all = []; for (const [x, y, r] of puffs) for (const o of [-W, 0, W]) all.push([x + o, y, r]);
    P.fill(0, 0, W, H, (x, y) => {
      if (y >= (baseY + 6) * R) return fill;
      let best = null;
      for (const [px, py, r] of all) { if (Math.abs(x - px) > r + 2) continue; const d = Math.hypot(x + 0.5 - px, y + 0.5 - py); if (d < r && (!best || py > best[1])) best = [px, py, r, d]; }
      if (!best) return null;
      const [px, py, r] = best, ly = (y + 0.5 - py) / r, lx = (x + 0.5 - px) / r;
      return ly > 0.45 ? shade : (ly < -0.55 && lx < 0.2) ? light : fill;
    });
    return P.hi();
  };
  const sky = finePix(VIEW_W * R, H); sky.vgrad(0, 0, VIEW_W * R, H, ['#2f6fd6', '#3c80e0', '#4f93ea', '#66a8f2', '#84bdf7', '#a6d2fb', '#c8e5fd']);
  return {
    sky: sky.hi(),
    layers: [
      { c: sun.hi(), f: 0.02 }, { c: isles.hi(), f: 0.1 },
      { c: cloudSea(176, 22, 10, 18, '#c3d8f5', '#e4effd', '#f4f8ff'), f: 0.25, drift: 0.04 },
      { c: cloudSea(198, 16, 12, 22, '#d6e4f8', '#ffffff', '#ffffff'), f: 0.45, drift: 0.1 },
    ],
  };
}

// ── 1-3's characters, fine (enemies-sky.js draws them from these) ──
const SKY_ART = new Map();
const skyArt = (key, paint) => SKY_ART.get(key) || (SKY_ART.set(key, paint()), SKY_ART.get(key));
const COAT = ['#9a5a14', '#c78026', '#f4bc32', '#ffd860', '#fff09a'], SKIN = ['#b8704a', '#d89a6c', '#ffdbad', '#ffe8c8', '#fff4e4'];
// Parasol Pete: a hooded little raincoat chap with a curled white moustache (origin: centre of his feet, 10, 20);
// held: gripping his brolly's shaft (sway -1..1); else falling, arms flailing (flail 0 / 1)
function brollyPeteArt(held, sway, flail) {
  return skyArt('pete' + held + sway + flail, () => {
    const A = mArt(22, 22), X = v => v + 11, Y = v => v + 20;
    A.ell(X(-3.5), Y(-1.2), 2.2, 1.6, '#4a3a38'); A.ell(X(4), Y(-1.2 - flail), 2.2, 1.6, '#4a3a38');   // boots
    A.ell(X(-3.8), Y(-1.8), 1.2, 0.6, '#79605b', ['#4a3a38']); A.ell(X(3.7), Y(-1.8 - flail), 1.2, 0.6, '#79605b', ['#4a3a38']);
    A.poly([[X(-4.4), Y(-10)], [X(5.4), Y(-10)], [X(6.8), Y(-2)], [X(-5.8), Y(-2)]], COAT[2]);   // the coat, a little flared
    A.shade(X(0.5), Y(-6), 7, 5.5, COAT, [COAT[2]]);
    A.line(X(0.5), Y(-9), X(0.5), Y(-2.4), COAT[1], COAT, 0.5);
    for (const by of [-7.6, -5]) A.ell(X(1.4), Y(by), 0.45, 0.45, '#4a3020');
    A.line(X(-4), Y(-4.4), X(-2), Y(-4.4), COAT[1], COAT, 0.5); A.line(X(3), Y(-4.4), X(5), Y(-4.4), COAT[1], COAT, 0.5);   // pocket flaps
    A.shade(X(0.5), Y(-12.5), 6.2, 5.8, COAT);                                  // hood
    A.ell(X(0.5), Y(-11.6), 4.4, 3.8, SKIN[2]); A.shade(X(0.5), Y(-11.6), 4.4, 3.8, SKIN, [SKIN[2]]);   // face
    A.line(X(-3.6), Y(-16.2), X(3.6), Y(-16.2), COAT[4], COAT, 0.6);           // the hood's lit rim
    if (held) {   // an arm up to the brolly's shaft (his fist round it is drawn over the shaft: peteFistArt), the other at his side
      A.line(X(5.8), Y(-9), X(PETE_GRIP + sway * 0.33), Y(-12.6), COAT[2], null, 2.2);
      A.line(X(-5.4), Y(-8.6), X(-6), Y(-5.4), COAT[2], null, 2.2); A.ell(X(-6), Y(-4.6), 1.2, 1, SKIN[2]);
    } else {
      A.line(X(-5), Y(-9), X(-8), Y(-12 + flail * 3), COAT[2], null, 2.2); A.ell(X(-8.4), Y(-12.4 + flail * 3), 1.3, 1.1, SKIN[2]);
      A.line(X(5.6), Y(-9), X(8.6), Y(-10 - flail * 3), COAT[2], null, 2.2); A.ell(X(9), Y(-10.4 - flail * 3), 1.3, 1.1, SKIN[2]);
    }
    A.outline();
    A.line(X(-2.8), Y(-14), X(-0.8), Y(-13.6), '#684039', null, 0.6); A.line(X(2), Y(-13.6), X(4), Y(-14), '#684039', null, 0.6);   // lowered brows
    A.ell(X(-1.6), Y(-12.8), 0.55, 0.7, INK); A.ell(X(2.6), Y(-12.8), 0.55, 0.7, INK);
    A.ell(X(0.6), Y(-11.2), 1.3, 1, '#ecaa79'); A.px(X(0.2), Y(-11.6), '#ffd0b0', ['#ecaa79']);   // a warm button nose
    for (const s of [-1, 1]) { A.ell(X(0.6 + s * 2.4), Y(-9.6), 2.6, 1.1, '#ffffff', null, s * 0.3); A.ell(X(0.6 + s * 4.6), Y(-10.4), 0.9, 0.9, '#ffffff'); A.ell(X(0.6 + s * 2.4), Y(-9.1), 2, 0.5, '#d4dce5', ['#ffffff']); }   // the curled moustache
    return A.canvas();
  });
}
const PETE_GRIP = 6.5;   // how far right of his middle Pete holds his brolly's shaft
// his fist, closed round the shaft (4 x 4, the shaft through its middle)
const peteFistArt = () => skyArt('peteFist', () => { const A = mArt(4, 4); A.shade(2, 2, 1.45, 1.25, SKIN); A.outline(); A.line(1.3, 1.6, 2.6, 1.6, SKIN[0], null, 0.34); return A.canvas(); });
// his brolly: a red and white striped dome, lit on top, a scalloped rim, the tip and the crooked handle
function brollyCanopyArt(noHandle) {
  return skyArt('canopy' + noHandle, () => {
    const R = ART_R, P = finePix(30 * R, 26 * R), cx = 15 * R, cy = 14 * R, rr = 13 * R;
    P.fill(0, 0, 30 * R, 15 * R, (x, y) => {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dy > 0 || dx * dx + dy * dy * 1.7 > rr * rr) return null;
      const seg = Math.floor((dx + rr) / (rr * 2 / 5)), lit = dy < -rr * 0.55, edge = Math.abs(dx) > Math.sqrt(Math.max(0, rr * rr - dy * dy * 1.7)) - 4;
      return seg % 2 ? (lit ? '#ffffff' : edge ? '#e4dce8' : '#f6f0f4') : (lit ? '#ff7a8f' : edge ? '#d8304e' : '#ff4d6d');
    });
    for (let x = -rr + R; x < rr; x += 5 * R) P.ell(cx + x + 2 * R, cy + 0.6 * R, 2 * R, 1.2 * R, '#ffffff', { only: [0] });   // the scalloped hem's shadow side
    P.outline(INK); P.outline(INK);
    P.rect(cx - 1, cy - rr / 1.3 - 3 * R, 2, 3 * R, INK);
    if (!noHandle) { P.rect(cx - 1, cy, 3, 9 * R, '#6a4a2a'); P.rect(cx - 2 * R, cy + 9 * R, 2 * R + 2, 2, '#6a4a2a'); P.rect(cx - 2 * R, cy + 8 * R, 2, R, '#6a4a2a'); }
    return P.hi();
  });
}
// ── the grow pot and its beanstalk, painted fine (pots in 1-3; seed blocks grow the same beanstalk everywhere) ──
const POT_CLAY = ['#6a2a12', '#94401e', '#c0603a', '#e0845a', '#f6ac80', '#ffd2b0'];
const POT_SOIL = ['#24140c', '#3a2416', '#563620', '#6e4a2c'], POT_MUD = ['#160c08', '#24160e', '#3a2618', '#4a3422'];
const STALK_GREEN = ['#1e6a32', '#2a8a3e', '#3fae4a', '#5fd068', '#8ae47c', '#c4f7a4'];
// a terracotta pot (18 x 14 game px): a rolled rim, a painted band of dots, lit from the left; its soil dark and glossy once watered
function sproutPotArt(wet) {
  return skyArt('pot' + wet, () => {
    const A = mArt(18, 14), cyl = (x, cx, hw) => (x - cx) / hw;
    A.fill(0, 5, 18, 14, (x, y) => {   // the body, tapering to the foot, its bottom just rounded
      const t = (y - 6) / 7.6, hw = 6.2 - t * 1.3, u = cyl(x, 9, hw);
      if (y < 6 || y > 13.6 || Math.abs(u) > 1 || (y > 12.8 && Math.abs(u) > 0.92)) return null;
      return softTone(POT_CLAY, -1.15 * u + 0.4 - t * 0.5 + (1 - u * u) * 0.35);
    });
    A.fill(0, 6, 18, 9, (x, y) => y > 6.2 && y < 6.9 && Math.abs(x - 9) < 6.1 ? POT_CLAY[0] : null, null);   // the rim's shadow on the body
    A.fill(0, 7, 18, 10, (x, y) => { const hw = 6 - (y - 6) / 7.6 * 1.3, u = cyl(x, 9, hw); return y > 8.2 && y < 9.6 && Math.abs(u) < 1 ? softTone(['#1e5a6a', '#2a7a8a', '#3a9aa8', '#62bcc4', '#a4e0e0'], -1.1 * u + 0.4) : null; });   // a painted band
    for (const dx of [-4, -1.4, 1.2, 3.8]) A.ell(9 + dx, 8.9, 0.42, 0.42, dx < 2 ? '#fff4e4' : '#d8c8b8');   // dotted with cream
    A.fill(0, 2, 18, 7, (x, y) => {   // the rolled rim
      const u = cyl(x, 9, 7.6), v = (y - 4.6) / 1.9;
      return Math.abs(u) <= 1 && Math.abs(v) <= 1 && !(Math.abs(u) > 0.9 && Math.abs(v) > 0.6) ? softTone(POT_CLAY, -1.1 * u - 0.7 * v + 0.55) : null;
    });
    A.ell(9, 3.5, 6.6, 1.35, POT_CLAY[1]);                                                        // the mouth, its inner wall in shade
    const SOIL = wet ? POT_MUD : POT_SOIL;
    A.fill(2, 2, 16, 5, (x, y) => { const u = (x - 9) / 6.1, v = (y - 3.75) / 1.05; return u * u + v * v <= 1 ? SOIL[Math.min(3, Math.max(0, Math.round(1.6 - u * 0.9 - v * 1.2)))] : null; });   // the soil
    if (wet) { A.ell(7.4, 3.5, 2.2, 0.45, '#5a7ab0'); A.ell(6.8, 3.4, 0.9, 0.22, '#b0d0ff'); }   // a shining puddle
    else for (const [x, y] of [[6.4, 3.6], [10.6, 4], [12.4, 3.4]]) A.ell(x, y, 0.45, 0.3, SOIL[3]);   // crumbs
    A.outline();
    A.ell(4.6, 4.2, 0.7, 0.35, '#ffe2c8');                                                         // a glint on the rim
    return A.canvas();
  });
}
// the seedling (16 x 12, its root at (8, 11.6)): two seed leaves on a curved stem, wilting over (k = 0) or perked up (k = 1)
const SEEDLING_STEPS = 6;
function seedlingArt(k) {
  return skyArt('seedling' + k, () => {
    const A = mArt(16, 12), mix = (a, b) => a + (b - a) * k;
    const tip = [mix(11, 8), mix(6.4, 4.2)];   // parched, the stem arcs over to the right; perky, it stands straight
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, x = 8 + (tip[0] - 8) * u * u, y = 11.6 + (tip[1] - 11.6) * (u * (2 - u) * (1 - k) + u * k);
      A.ell(x, y, 0.65, 0.65, lerpColor(STALK_GREEN[2], STALK_GREEN[3], u));
    }
    for (const sd of [-1, 1]) {   // the seed leaves: hanging limp, or lifted in a V
      const cx = tip[0] + sd * mix(1.5, 2.4), cy = tip[1] + mix(1.6, -0.9), rot = sd * mix(1.05, -0.45);
      A.soft(cx, cy, 2.6, 1.25, STALK_GREEN.slice(1), null, rot);
    }
    A.outline();
    return A.canvas();
  });
}
// the beanstalk's stem, baked once for its whole height (from y0 at the bottom up to yTop): a twisting stem, lit on
// its left, a faint spiral, and thin tendrils curling off it. Drawn as far up as it's grown (a source rectangle).
const STALK_W = 22;
const stalkStemX = (y, c) => c * TILE + 8 + Math.sin(y * 0.07 + c) * 1.6;
function stalkStemArt(c, y0, yTop) {
  return skyArt('stem' + c + ',' + y0 + ',' + yTop, () => {
    const H = y0 - yTop + 2, ox = c * TILE + 8 - STALK_W / 2, oy = yTop - 1, A = mArt(STALK_W, H);
    A.fill(0, 0, STALK_W, H, (x, y) => {
      const wy = y + oy, u = (x + ox - stalkStemX(wy, c)) / 2.3;
      if (Math.abs(u) > 1 || wy > y0 || wy < yTop) return null;
      const twist = Math.abs(u - Math.sin(wy * 0.25) * 0.6) < 0.12;
      return softTone(STALK_GREEN, -1.2 * u + 0.35 + (1 - u * u) * 0.4 - (twist ? 0.45 : 0));
    });
    A.outline();
    for (let y = y0 - 12; y > yTop + 8; y -= 26) {   // a tendril curling off one side, then the other
      const side = ((y / 26) | 0) % 2 ? 1 : -1, sx = stalkStemX(y, c) - ox, yy = y - oy;
      let px = null;
      for (let k = 0; k <= 14; k++) {
        const a = k * 0.55, r = 3.4 - k * 0.2, p = [sx + side * (3.2 + r + Math.cos(a) * r), yy - Math.sin(a) * r - k * 0.3];
        if (px) A.line(px[0], px[1], p[0], p[1], STALK_GREEN[3], null, 0.5);
        px = p;
      }
    }
    return A.canvas();
  });
}
// a bean leaf reaching right from the stem (26 x 14, the stem at (1, 6), the ledge's top at y 6): a short leaf-stalk,
// an almond blade lit on top, a pale midrib and veins angled back; `w` is its sway (-1..1), the tip lifting and dipping
const LEAF_SWAYS = 7;
function stalkLeafArt(w) {
  return skyArt('bleaf' + w, () => {
    const A = mArt(26, 14), x0 = 1, top = 6, P = 3, L = 18, sway = w * 0.8;
    const mid = u => top + 3 - u * u * 2.5 - u * sway, half = u => 4.2 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.02 + 0.04)), 0.75);
    A.fill(0, 0, 26, 14, (x, y) => {
      const i = x - x0 - 2 - P;
      if (i < -P) return null;
      if (i < 0) return Math.abs(y - top - 3.6) < 0.7 ? softTone(STALK_GREEN, 0.2 - (y - top - 3.6)) : null;   // the leaf-stalk
      const u = i / L; if (u > 1) return null;
      const k = (y - mid(u)) / Math.max(0.5, half(u));
      return Math.abs(k) <= 1 ? softTone(STALK_GREEN, 0.95 - k * 1.25 - u * 0.25 + (1 - k * k) * 0.3) : null;
    });
    const leaf = STALK_GREEN.slice();
    for (const u of [0.22, 0.42, 0.62, 0.8]) for (const sd of [-1, 1]) {   // veins, angled back toward the stem
      const x = x0 + 2 + P + u * L, y = mid(u), h = half(u) * 0.75;
      A.line(x, y, x - 2.2, y + sd * h, sd < 0 ? STALK_GREEN[4] : STALK_GREEN[1], null, 0.34);
    }
    for (let i = 0; i < L - 1; i += 0.34) A.ell(x0 + 2 + P + i, mid(i / L), 0.2, 0.2, STALK_GREEN[5]);   // the midrib
    A.outline();
    return A.canvas();
  });
}
// the bud at its growing tip (10 x 10, centred on the stem's top at (5, 8)): a tight curl
function stalkBudArt() {
  return skyArt('bud', () => {
    const A = mArt(10, 10);
    A.soft(5, 6.4, 2.4, 2.8, STALK_GREEN.slice(1));
    A.soft(5.8, 3.8, 1.4, 1.4, STALK_GREEN.slice(1));
    A.outline();
    A.line(4.4, 5.4, 5.6, 4.4, STALK_GREEN[1], null, 0.34);
    return A.canvas();
  });
}
// the flower that opens at the very top: its own stem with a pair of leaves (12 x 18, base at (6, 18)), and the
// head (28 x 28, centred): eight pink petals round a golden middle
function stalkFlowerStemArt() {
  return skyArt('fstem', () => {
    const A = mArt(12, 18);
    A.fill(0, 0, 12, 18, (x, y) => { const u = (x - 6) / 1.2; return Math.abs(u) <= 1 && y > 3 ? softTone(STALK_GREEN, -1.1 * u + 0.4) : null; });
    A.soft(2.6, 11.6, 2.7, 1.3, STALK_GREEN.slice(1), null, 0.5); A.soft(9.6, 9.4, 2.7, 1.3, STALK_GREEN.slice(1), null, -0.5);
    A.outline();
    return A.canvas();
  });
}
function stalkFlowerHeadArt() {
  return skyArt('fhead', () => {
    const A = mArt(28, 28), c = 14;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + 0.2, px = c + Math.cos(a) * 7.6, py = c + Math.sin(a) * 7.6;
      A.soft(px, py, 4.8, 3.3, i % 2 ? ['#b02c62', '#e04c86', '#ff7aa8', '#ffa8c8', '#ffd8e6'] : ['#c03c70', '#ee5e96', '#ff8db6', '#ffbad4', '#ffe4ee'], null, a);
    }
    A.soft(c, c, 4.6, 4.6, ['#a0600c', '#d08a1a', '#f0b030', '#ffd166', '#fff0b0']);
    A.outline();
    for (const [dx, dy] of [[-1.6, 0.8], [0.4, 1.8], [1.8, 0.2], [-0.2, -0.6], [1, -1.8], [-1.8, -1.2]]) A.ell(c + dx, c + dy, 0.35, 0.35, '#a0600c');   // seeds
    A.ell(c - 1.6, c - 2.4, 1, 0.5, '#fff6dc');
    return A.canvas();
  });
}
// a big red boxing glove lying flat (dir: the way it punches): a stitched cuff, rounded knuckles, the thumb tucked under
function fineGloveArt(dir) {
  return skyArt('glove' + dir, () => {
    const A = mArt(36, 22), RED = ['#5a1428', '#962039', '#d52b3e', '#f4545d', '#ff9394'], X = x => dir > 0 ? x : 36 - x;
    A.poly([[X(1), 1], [X(11), 1], [X(11), 19], [X(1), 19]], '#a32238');                              // cuff
    A.fill(0, 0, 36, 22, (x, y) => { const u = dir > 0 ? x : 36 - x; return u > 1 && u < 11 && y > 1 && y < 19 ? (y < 9 ? '#e34852' : y > 16.5 ? '#751d32' : '#a32238') : null; });
    A.ell(X(23.5), 9.5, 11.5, 8.6, RED[2]); A.poly([[X(10), 1.2], [X(24), 1.2], [X(24), 17], [X(10), 17]], RED[2]);   // the mitt
    A.shade(X(22), 8.2, 13, 9, RED, [RED[2]]);
    A.ell(X(18.5), 16.4, 7, 4, '#cd2c40'); A.shade(X(18.5), 16, 7, 4, ['#702033', '#962039', '#cd2c40', '#ed4652', '#ff8a90'], ['#cd2c40']);   // the thumb
    A.fill(0, 0, 36, 22, (x, y) => { const u = dir > 0 ? x : 36 - x; return u > 3 && u < 8.5 && y > 11 && y < 15 ? (y > 14 ? '#c3bdc6' : '#fff0dc') : null; });   // the wrist's stitched patch
    A.outline('#30212b');
    return A.canvas();
  });
}
