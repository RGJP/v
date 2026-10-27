'use strict';
// 2-4 ECLIPSE SPIRE, painted fine (hires.js: ART_R x, no dithering): stars, a forest of needle spires with pale
// violet windows, battlements in front (the eclipsed sun is drawn live: drawEclipseSky, backgrounds.js).

function eclipseFineBackground() {
  const R = ART_R, W = BG_W * R, H = VIEW_H * R, rng = mulberry32(hashStr('eclipse-fine'));
  const stars = finePix(W, H);
  for (let i = 0; i < 140; i++) { const x = rng() * W, y = rng() * 150 * R, c = rng() < 0.3 ? '#ffffff' : rng() < 0.5 ? '#c9b8ff' : '#5a4f9a', big = rng() < 0.12; stars.ell(x, y, big ? 1.5 : 1, big ? 1.5 : 1, c); if (big) stars.glow(x, y, 6, c, 0.3); }
  const spires = finePix(W, H), S0 = '#160f2e', S1 = '#22183e';
  for (let i = 0; i < 10; i++) {
    const x = (i * BG_W / 10 + rng() * 20) * R, w = (8 + rng() * 10) * R, h = (60 + rng() * 90) * R, roof = (14 + rng() * 22) * R, wins = Array.from({ length: 12 }, () => rng() < 0.45);
    for (const o of [-W, 0, W]) {
      const X = x + o;
      spires.rect(X, H - h, w, h, S0); spires.rect(X, H - h, R, h, S1);
      spires.poly([[X, H - h + 1], [X + w / 2, H - h - roof], [X + w, H - h + 1]], S0); spires.line(X + w / 2, H - h - roof, X + w / 2, H - h - roof - 6 * R, S0);
      let k = 0;
      for (let wy = H - h + 10 * R; wy < H - 24 * R; wy += 16 * R) if (wins[k++ % 12]) { spires.glow(X + w / 2, wy + R, 6 * R, '#8f86d0', 0.3); spires.ell(X + w / 2, wy, R, 1.2 * R, '#8f86d0'); spires.rect(X + w / 2 - R, wy, 2 * R, 3 * R, '#8f86d0'); }
    }
  }
  // battlements: merlons along a low wall, the odd lit arrow-slit
  const terms = [[4, 3, 0.4], [2, 7, 1]], walls = finePix(W, H);
  const tops = Array.from({ length: W }, (_, x) => fineRidge(182, terms, x));
  walls.fill(0, 0, W, H, (x, y) => { const merlon = (Math.floor(x / R) % 14) < 7, t = tops[x] - (merlon ? 5 * R : 0); if (y < t) return null; return y < t + 2 ? '#2a2048' : (y - tops[x]) % (8 * R) < 1 && y > tops[x] ? '#150c2a' : '#0d0820'; });
  for (let x = 0; x < W; x += 53 * R) { walls.glow(x, tops[x] + 14 * R, 6 * R, '#c9b8ff', 0.3); walls.rect(x, tops[x] + 12 * R, R, 4 * R, '#c9b8ff'); }
  const sky = finePix(VIEW_W * R, H); sky.vgrad(0, 0, VIEW_W * R, H, ['#05030f', '#0a0619', '#120a26', '#1a0f33', '#241540', '#2e1a4a', '#3a2052']);
  return { sky: sky.hi(), layers: [{ c: stars.hi(), f: 0.02 }, { c: spires.hi(), f: 0.15 }, { c: walls.hi(), f: 0.4 }], live: drawEclipseSky };
}

// ── 2-4's set pieces, painted fine (shade.js, sigil.js and game-world.js draw them from these) ──
const SPIRE_ART = new Map();
const spireArt = (key, paint) => SPIRE_ART.get(key) || (SPIRE_ART.set(key, paint()), SPIRE_ART.get(key));
const SPIRE_IRON = ['#141228', '#24203e', '#3e3862', '#5a5480', '#8f88c0', '#c4bee8'];
const SPIRE_STONE = ['#241e3a', '#3a3458', '#4e4870', '#6a6488', '#8a84ac', '#b0aacc'];
const spireNoise = (x, y) => { const h = Math.sin(Math.floor(x * 3) * 12.9898 + Math.floor(y * 3) * 78.233) * 43758.5453; return h - Math.floor(h); };

// a chain hanging from y0 down to y1 at x: links alternating face-on (a ring) and edge-on (a bar)
function drawSpireChain(ctx, x, y0, y1) {
  for (let yy = y0, k = 0; yy < y1; yy += 3, k++) {
    if (k % 2) { fRect(ctx, x - 0.67, yy - 0.2, 1.33, 3.4, INK); fRect(ctx, x - 1 / 3, yy + 0.2, 1 / 3, 2.6, SPIRE_IRON[4]); }
    else { fEll(ctx, x, yy + 1.5, 1.35, 1.9, INK); fEll(ctx, x, yy + 1.5, 0.95, 1.5, SPIRE_IRON[3]); fEll(ctx, x - 0.3, yy + 1.1, 0.35, 0.55, SPIRE_IRON[5]); fEll(ctx, x, yy + 1.5, 0.34, 0.8, INK); }
  }
}

// the moonlamp: a little iron lantern (14 x 18; its box's top-left at (2, 2)): a domed cap with a ring to hang it by,
// panes between two bars, a footed base. state: 'lit' / 'lit2' (the moon inside it, flickering), 'warn' (about to
// come on), 'cool' (just burnt out: an ember), 'dark' (a faint violet spark: light me)
function moonlampArt(state) {
  return spireArt('lamp' + state, () => {
    const A = mArt(14, 18), lit = state === 'lit' || state === 'lit2';
    A.ell(7, 2.4, 1.2, 1.1, SPIRE_IRON[3]);                                                             // the ring
    A.poly([[3, 5.4], [5, 3.2], [9, 3.2], [11, 5.4]], SPIRE_IRON[3]);                                  // the cap
    A.fill(2, 3, 12, 6, (x, y) => softTone(SPIRE_IRON, 1 - (x - 7) / 4 - (y - 3) * 0.2), [SPIRE_IRON[3]]);
    A.fill(2, 5, 12, 7, (x, y) => Math.abs(x - 7) < 4.6 && y < 6.4 ? softTone(SPIRE_IRON, 0.8 - (x - 7) / 4.6) : null);   // its lip
    const G = lit ? (state === 'lit' ? ['#ffd88a', '#ffeab8', '#fff6e0', '#ffffff', '#ffffff'] : ['#ffcf6a', '#ffe09a', '#ffeec8', '#fff8ec', '#ffffff'])
      : state === 'warn' ? ['#c89a4a', '#e0b86a', '#ffd88a', '#ffeab8', '#fff6e0'] : state === 'cool' ? ['#1e1424', '#2e1e34', '#4a2f52', '#5a3a60', '#6a4870'] : ['#14122e', '#1e1a42', '#2e2a5a', '#3e3a74', '#524c8a'];
    A.fill(3, 6.2, 11, 13.2, (x, y) => x > 3.4 && x < 10.6 ? softTone(G, 1.1 - Math.hypot(x - 7, y - 9.6) / 3.2) : null);   // the panes, glowing from the middle
    for (const bx of [3.4, 5.6, 8.4, 10.6]) A.line(bx - 0.3, 6.2, bx - 0.3, 13, bx === 3.4 || bx === 10.6 ? SPIRE_IRON[2] : SPIRE_IRON[1], null, bx === 3.4 || bx === 10.6 ? 0.67 : 0.45);   // posts and bars
    A.fill(2, 12.8, 12, 15.6, (x, y) => Math.abs(x - 7) < 4.6 - (y - 12.8) * 0.6 ? softTone(SPIRE_IRON, 0.8 - (x - 7) / 4) : null);   // the base
    A.ell(7, 16, 0.9, 0.7, SPIRE_IRON[2]);
    A.outline();
    if (!lit && state !== 'warn') A.ell(7, 9.6, 0.9, 0.9, state === 'cool' ? '#c25a6a' : '#8f86d0');   // an ember / a faint spark
    A.line(4.2, 6.8, 4.2, 9, lit ? '#ffffff' : '#6a64a8', null, 0.34);                                  // a glint down the glass
    A.ell(5, 4.4, 1, 0.35, SPIRE_IRON[5]);
    return A.canvas();
  });
}

// lit moonglass, one tile (16 x 16): a pane of violet glass, paler at the top, a lit bevel along the top and down the
// left, a big facet catching the light, a dark rim on every side that isn't more glass (n: which neighbours are glass,
// bits 1 left, 2 right, 4 up)
function moonglassArt(n) {
  return spireArt('glass' + n, () => {
    const R = ART_R, S = 16 * R, P = finePix(S, S), L = n & 1, Rt = n & 2, U = n & 4;
    P.fill(0, 0, S, S, (x, y) => {
      const u = x / S, v = y / S, facet = u + v < 0.75 && u + v > 0.25;
      return lerpColor(lerpColor('#8c7cec', '#4e3ea6', v), '#a99cf0', facet ? 0.3 : 0);
    });
    P.fill(0, 0, S, S, (x, y) => (y < 2 * R && !U) ? '#ffffff' : y < 2 * R + 2 ? '#c4b8ff' : (!L && x < 2) ? '#c4b8ff' : null);
    P.fill(0, 0, S, S, (x, y) => (!L && x < 1) || (!Rt && x >= S - 2) || y >= S - 2 ? '#2a2058' : null);
    return P.hi();
  });
}

// the floor button the shadow works (shade plates) and the sigil's buttons: an inset socket, and a cap PLATE_H proud of
// the floor that goes in PLATE_UP when stood on. Drawn live: lit / pulse colours change by the frame
function drawFloorButton(ctx, x, floor, top, cap, rim, glint, under, rune) {
  const h = floor - top;
  fRoundRect(ctx, x - 1, floor - 1.4, 18, 3.4, 1.2, INK); fRect(ctx, x + 1 / 3, floor - 2 / 3, 46 / 3, 2 / 3, '#120a26');   // the socket, set in the floor
  fRoundRect(ctx, x + 1, top - 1, 14, h + 1.4, 1.8, INK);
  fRoundRect(ctx, x + 5 / 3, top - 1 / 3, 38 / 3, h, 1.3, cap);
  fRect(ctx, x + 2.6, top - 1 / 3, 10.8, 2 / 3, rim);                         // the lit rim along its top
  if (h > 2) { fRect(ctx, x + 5 / 3, top + 1, 2 / 3, h - 2, glint); fRect(ctx, x + 2.4, floor - 1, 11.2, 2 / 3, under); }
  if (rune && h > 2.5) fPoly(ctx, [[x + 8, top + 0.9], [x + 9.6, top + h / 2 + 0.2], [x + 8, top + h - 0.6], [x + 6.4, top + h / 2 + 0.2]], rune);   // a carved diamond
}

// the shadow gate (h tall, 20 wide; its box's left at 2): three round iron bars, riveted crossbars, spikes along the
// bottom, and the shadow-eye seal in the middle (lit: open, a violet eye; else shut dark)
function shadeGateArt(h, lit) {
  return spireArt('gate' + h + lit, () => {
    const A = mArt(20, h + 4), X = 2;
    for (const bx of [1, 6, 11]) {
      A.fill(X + bx, 0, X + bx + 4, h, (x, y) => softTone(SPIRE_IRON, 1.2 - (x - X - bx) / 2 * 1.1));
      A.poly([[X + bx + 0.4, h], [X + bx + 3.6, h], [X + bx + 2, h + 3.4]], SPIRE_IRON[3]);   // a spike
    }
    for (let yy = 6; yy < h - 4; yy += 14) {
      A.fill(X, yy, X + 16, yy + 4, (x, y) => softTone(SPIRE_IRON, 1 - (y - yy) / 2 - (x - X) / 30));
      for (const rx of [2.4, 8, 13.6]) A.ell(X + rx, yy + 2, 0.6, 0.6, SPIRE_IRON[5]);
    }
    const ey = h / 2;
    A.soft(X + 8, ey, 5.4, 5.4, SPIRE_STONE);
    A.outline();
    A.ell(X + 8, ey, 3.6, 3.6, lit ? '#b48cff' : '#3a2a6a'); A.ell(X + 8, ey + 0.8, 3.6, 2.4, lit ? '#8a64e8' : '#2a1e52', [lit ? '#b48cff' : '#3a2a6a']);
    A.ell(X + 8, ey, 0.75, 2.2, lit ? '#ffffff' : '#8f86d0'); A.ell(X + 6.8, ey - 1.6, 0.5, 0.4, '#ffffff');
    return A.canvas();
  });
}

// the sigil's carving at the fine scale (sigil.js's paintSigil, drawn 3x bigger and wrapped: S x S game px)
function sigilPieceFine(S, i, col) { return spireArt('sig' + S + i + col, () => hiRes(sigilPiece(S * ART_R, i, col), ART_R)); }

// the slab with the answer carved on it (66 x 76; its box's top-left at (1, 1)): a weathered tablet with a rounded top
// and both right-hand carvings lost with its broken edge. Only the moon and water clues survive.
function sigilSlabArt() {
  return spireArt('slab', () => {
    const A = mArt(66, 76), w = 64, h = 74;
    const inset = i => i === 0 ? 5 : i === 1 ? 3 : i === 2 ? 2 : i === 3 ? 1 : 0;
    const breaks=[[0,30],[7,33],[13,32],[20,36],[27,34],[34,35],[43,32],[50,35],[58,33],[66,35],[74,33]];
    const right = i => {
      const n=breaks.findIndex(p=>p[0]>i),a=breaks[Math.max(0,n-1)],b=breaks[n<0?breaks.length-1:n];
      return a[1]+(b[1]-a[1])*(i-a[0])/Math.max(1,b[0]-a[0]);
    };
    A.fill(1, 1, 65, 75, (x, y) => {
      const i = Math.floor(y - 1), lx = x - 1;
      if (i < 0 || i >= h || lx < inset(i) || lx >= right(i)) return null;
      const u = (lx - 32) / 32, v = (y - 38) / 37, n = spireNoise(x * 0.5, y * 0.5);
      return softTone(SPIRE_STONE, 0.75 - u * 0.5 - v * 0.6 + (n - 0.5) * 0.35);
    });
    for (const [x0, y0, x1, y1] of [[5, 22, 6, 28], [6, 28, 5.4, 33], [13, 66, 17, 66.6], [29, 4, 32, 4.4]]) A.line(x0, y0, x1, y1, SPIRE_STONE[0], null, 0.5);   // cracks and chips
    for (const [x, y, r] of [[4.6, 72.4, 3.6], [3.2, 70, 2], [7.4, 73, 2], [23, 73.4, 3.2], [26, 73.6, 1.8]]) A.soft(x, y, r, r * 0.7, ['#1e3a2a', '#2e5a40', '#3f6a52', '#5c9470', '#8ac498']);   // moss
    A.outline();
    const art = A.canvas(), g = art.canvas.getContext('2d');
    g.setTransform(ART_R, 0, 0, ART_R, 0, 0); g.imageSmoothingEnabled = false;
    for (let i = 0; i < 4; i++) {
      if (i === 1 || i === 2) continue;
      const [cx, cy] = [[0, 0], [24, 0], [24, 24], [0, 24]][i];
      g.drawImage(sigilPieceFine(48, i, '#b0aacc'), 9 + cx, 10 + cy + 2 / 3);   // the lit lower lip of the groove
      g.drawImage(sigilPieceFine(48, i, '#1a1430'), 9 + cx, 10 + cy);
    }
    return art;
  });
}
// the sigil's frame (78 x 78; its box's top-left at (2, 2)): a bevelled stone surround, a dark recess, iron studs
function sigilFrameArt() {
  return spireArt('sigframe', () => {
    const A = mArt(78, 78), W = 74, o = 2;
    A.fill(o, o, o + W, o + W, (x, y) => {
      const lx = x - o, ly = y - o, edge = Math.min(lx, ly, W - lx, W - ly);
      if (edge > 3) return lerpColor('#120c24', '#221a3e', clamp(edge / 30, 0, 1));
      return softTone(SPIRE_STONE, 0.9 - (lx + ly) / W * 0.9 + (spireNoise(x, y) - 0.5) * 0.3);
    });
    for (const [x, y] of [[4, 4], [W - 4, 4], [4, W - 4], [W - 4, W - 4]]) A.soft(o + x, o + y, 1.3, 1.3, SPIRE_IRON);
    A.outline();
    return A.canvas();
  });
}
// one of the sigil's square stones (34 x 34; its top-left at (1, 1)): dressed, bevelled, flecked
function sigilStoneArt(lit) {
  return spireArt('sigstone' + lit, () => {
    const A = mArt(34, 34), F = lit ? ['#3a3458', '#5a5480', '#7a74a0', '#9a94c0', '#c4bee8'] : SPIRE_STONE;
    A.fill(1, 1, 33, 33, (x, y) => {
      const lx = x - 1, ly = y - 1, bev = lx < 1.2 || ly < 1.2 ? 0.7 : lx > 30.8 || ly > 30.8 ? -0.7 : 0;
      return softTone(F, 0.5 + bev - (lx + ly) / 64 * 0.4 + (spireNoise(x, y) - 0.5) * 0.25);
    });
    A.outline();
    return A.canvas();
  });
}
// the door the sigil keeps shut (34 x 193, its left edge at 1): dressed blocks of spire stone, staggered, two iron
// bands with rivets, and the seal (gold once the sigil is right)
function sigilDoorArt(lit) {
  return spireArt('sigdoor' + lit, () => {
    const A = mArt(34, 193), h = 192;
    A.fill(1, 0, 33, h, (x, y) => {
      const lx = x - 1, r = Math.floor(y / 16), joint = r % 2 ? 8 : 22, ly = y - r * 16;
      if (ly > 15.2 || Math.abs(lx - joint) < 0.4) return '#1e1834';
      const bx = lx < joint ? lx / joint : (lx - joint) / (32 - joint), k = (spireNoise(r, lx < joint ? 1 : 2) - 0.5) * 0.4;
      return softTone(SPIRE_STONE, 0.4 + k - bx * 0.5 - ly / 16 * 0.4 + (ly < 1 ? 0.6 : 0) + (spireNoise(x, y) - 0.5) * 0.2);
    });
    for (const by of [40, h - 40]) {
      A.fill(1, by, 33, by + 5, (x, y) => softTone(SPIRE_IRON, 1.1 - (y - by) / 2.5));
      for (let k = 3; k < 32; k += 9) A.ell(1 + k + 0.5, by + 2.5, 0.65, 0.65, SPIRE_IRON[5]);
    }
    const sy = h / 2 - 12;
    A.fill(4, sy, 30, sy + 24, (x, y) => softTone(SPIRE_STONE, -0.6 + (y - sy) / 24 * 0.4));
    A.soft(17, sy + 12, 7.4, 7.4, lit ? ['#8a5a10', '#c8891e', '#ffd166', '#ffe8a0', '#fff8e0'] : ['#1e1834', '#2a2444', '#4a4470', '#5e587e', '#7a74a0']);
    A.ell(17, sy + 12, 4, 4, lit ? '#8a5a10' : '#1e1834');
    A.outline();
    return A.canvas();
  });
}
