'use strict';
// Ground tiles painted fine for every world (hires.js: ART_R x, no dithering), each world picking a body texture and
// a cap for its top tiles in THEMES[...].fineGround = { body, cap, ... }. Every tile repeats seamlessly (textures are
// periodic over the tile, details keep clear of the edges), 8 variants of each, with ragged chipped edges (chipFine).
// The meadow has its own painter (meadow-fine.js).

// a tone ramp from a theme's [base, dark, light]: darkest .. lightest, 6 steps
function fineRamp([b, d, l]) { return [lerpColor(d, '#000000', 0.3), d, lerpColor(d, b, 0.5), b, lerpColor(b, l, 0.5), l]; }
// distances to the nearest two of a tileable scatter of points (period S): cobbles, scales, cells
function fineCells(S, n, seed) {
  const rng = mulberry32(seed), pts = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) pts.push([(i + 0.15 + rng() * 0.7) * S / n, (j + 0.15 + rng() * 0.7) * S / n]);
  return (x, y) => {
    let d1 = 1e9, d2 = 1e9, best = null;
    for (const [px, py] of pts) for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      const d = Math.hypot(x - px - ox, y - py - oy);
      if (d < d1) { d2 = d1; d1 = d; best = [px + ox, py + oy]; } else if (d < d2) d2 = d;
    }
    return [d1, d2, best];
  };
}

const FINE_BODIES = {
  // cobbled rock: stones parted by dark mortar, each lit along its upper left, a gem fleck here and there
  cobble(P, th, v, oy, S) {
    const C = fineRamp(th.ground), cells = fineCells(S, 3, 500 + v * 17), rng = mulberry32(900 + v);
    P.fill(0, oy, S, oy + S, (x, y) => {
      const [d1, d2, c] = cells(x + 0.5, y - oy + 0.5), edge = d2 - d1;
      if (edge < 1.6) return C[0];
      if (edge < 2.6) return C[1];
      const lx = (x + 0.5 - c[0]), ly = (y - oy + 0.5 - c[1]), lit = -(lx * 0.6 + ly * 0.8) / Math.max(4, d1 + edge * 0.5);
      return lit > 0.45 ? C[4] : lit > -0.1 ? C[3] : C[2];
    });
    if (v % 3 === 1) { const x = 8 + rng() * (S - 16), y = oy + 8 + rng() * (S - 16), g = th.gem || ['#5ef2ff', '#bffaff']; P.ell(x, y, 1.6, 1.6, g[0]); P.rect(Math.round(x) - 1, Math.round(y) - 1, 1, 1, g[1]); }
  },
};
FINE_BODIES.puffs = (P, th, v, oy, S) => {   // cloud: big soft puffs, each lit on its upper left, the faintest seams between
  const [b, d, l] = th.ground, cells = fineCells(S, 2, 1700 + v * 31), seam = lerpColor(b, d, 0.22), shade = lerpColor(b, d, 0.12);
  P.fill(0, oy, S, oy + S, (x, y) => {
    const [d1, d2, c] = cells(x + 0.5, y - oy + 0.5), edge = d2 - d1;
    if (edge < 0.9) return seam;
    const r = Math.max(6, d1 + edge * 0.5), nx = (x + 0.5 - c[0]) / r, ny = (y - oy + 0.5 - c[1]) / r, lit = -0.6 * nx - 0.8 * ny + (1 - nx * nx - ny * ny) * 0.5;
    return lit > 0.75 ? l : lit > -0.1 ? b : shade;   // each puff a soft ball
  });
};
FINE_BODIES.bricks = (P, th, v, oy, S) => {   // castle stone: running-bond bricks, each lit along its top, mortar between, a chip or a crack
  const C = fineRamp(th.ground), R = ART_R, BH = 4 * R, BW = 8 * R, rng = mulberry32(2900 + v * 7);
  const tone = (i, j) => C[2 + (hashStr(v + ':' + i + ',' + j) % 3)];
  P.fill(0, oy, S, oy + S, (x, y) => {
    const yy = y - oy, row = Math.floor(yy / BH), off = (row % 2) * BW / 2, col = Math.floor((x + off) / BW), bx = (x + off) % BW, by = yy % BH;
    if (by >= BH - 2 || bx >= BW - 2) return C[0];          // mortar
    if (by < 2) return C[4];                                 // the brick's lit top
    if (by >= BH - 4 || bx >= BW - 4) return C[1];           // and its shaded underside
    return tone(col, row);
  });
  if (v % 3 === 2) { let x = 6 + rng() * (S - 20), y = oy + 6 + rng() * (S - 20); for (let k = 0; k < 10; k++) { P.rect(Math.round(x), Math.round(y), 1, 1, C[0]); x += 1; y += (rng() - 0.4) * 1.6; } }
};
FINE_BODIES.sand = (P, th, v, oy, S) => {   // sand: soft drifts of tone, fine grains, a shell or a wisp of sea-moss now and then
  const C = fineRamp(th.ground), rng = mulberry32(4100 + v * 13);
  P.fill(0, oy, S, oy + S, (x, y) => { const n = loopNoise2(x, y - oy, S, 40 + v, 3); return n > 0.35 ? C[4] : n < -0.4 ? C[2] : C[3]; });
  for (let k = 0; k < 40; k++) P.rect(Math.floor(rng() * S), oy + Math.floor(rng() * S), 1, 1, rng() < 0.5 ? C[1] : C[5]);
  if (v % 4 === 1) { const x = 10 + rng() * (S - 20), y = oy + 10 + rng() * (S - 20); P.ell(x, y, 4, 3, '#f2b8a8'); for (const dx of [-2, 0, 2]) P.line(x + dx, y + 2, x + dx * 0.4, y - 2, '#c97a6a'); P.rect(Math.round(x) - 1, Math.round(y) - 2, 2, 1, '#fff0e8'); }
  if (v % 4 === 3) { let x = 8 + rng() * (S - 16), y = oy + 8 + rng() * 10; for (let k = 0; k < 12; k++) { P.rect(Math.round(x), Math.round(y), 2, 1, k % 3 ? '#4cc28a' : '#2f9a6a'); x += Math.sin(k) * 0.8; y += 1; } }
};
FINE_BODIES.strata = (P, th, v, oy, S) => {   // desert sand: wavy layered strata, grains, a pebble now and then
  const C = fineRamp(th.ground), R = ART_R, rng = mulberry32(4700 + v * 7);
  P.fill(0, oy, S, oy + S, (x, y) => { const yy = y - oy + Math.sin((x + v * 9) * Math.PI * 2 / S) * 2.2 * R + Math.sin(x * Math.PI * 4 / S + v) * R; const b = Math.floor((yy + 64 * R) / (4 * R)) % 3; return b === 0 ? C[4] : b === 1 ? C[3] : C[2]; });
  for (let k = 0; k < 30; k++) P.rect(Math.floor(rng() * S), oy + Math.floor(rng() * S), 1, 1, rng() < 0.5 ? C[1] : C[5]);
  if (v % 3 === 1) { const x = 8 + rng() * (S - 16), y = oy + 8 + rng() * (S - 16); P.ell(x, y, 2.4, 1.8, C[1]); P.ell(x - 0.6, y - 0.6, 1.4, 1, C[5]); }
};
// earth and grass like the meadow's (meadow-fine.js), in a world's own colours
const withMeadowPal = (pal, fn) => { const keep = { soil: MF.soil, grass: MF.grass }; Object.assign(MF, pal); try { fn(); } finally { Object.assign(MF, keep); } };
FINE_BODIES.soil = (P, th, v, oy, S) => withMeadowPal({ soil: fineRamp(th.ground) }, () => paintFineSoil(P, v, oy));
FINE_BODIES.cornbread = (P, th, v, oy, S) => {   // 4-1: golden cornbread crumb -- soft tone, pores with a lit lower rim, now and then a kernel of corn or a fleck of chili
  const C = fineRamp(th.ground), rng = mulberry32(5100 + v * 17);
  P.fill(0, oy, S, oy + S, (x, y) => { const n = loopNoise2(x, y - oy, S, 50 + v, 4); return n > 0.4 ? C[4] : n < -0.35 ? C[2] : C[3]; });
  for (let k = 0; k < 9; k++) {   // pores: little dark pits, lit on their lower lip
    const x = 3 + rng() * (S - 6), y = oy + 3 + rng() * (S - 6), rx = 1.4 + rng() * 2.2, ry = 1 + rng() * 1.2;
    P.ell(x, y, rx, ry, C[1]); P.ell(x, y + ry * 0.7, rx * 0.8, 0.8, C[5], { only: [P.col(C[3]), P.col(C[4]), P.col(C[2])] });
  }
  for (let k = 0; k < 30; k++) P.rect(Math.floor(rng() * S), oy + Math.floor(rng() * S), 1, 1, rng() < 0.5 ? C[2] : C[5]);   // crumbs
  if (v % 3) { const x = 6 + rng() * (S - 14), y = oy + 6 + rng() * (S - 14); P.ell(x, y, 4, 3, '#a8761a'); P.ell(x - 0.3, y - 0.6, 3.4, 2.4, '#ffd23a'); P.ell(x - 1.2, y - 1.4, 1.2, 0.8, '#fff6b0'); }   // a kernel of corn
  if (v % 4 === 2) P.ell(4 + rng() * (S - 8), oy + 6 + rng() * (S - 12), 3, 1.4, '#5a9a2a');   // a fleck of green chili
};
const FINE_CAPS = {
  // 4-1: a thick baked crust on the cornbread, brown and blistered, its underside wavy, lit along the top
  bakedCrust(P, th, v, oy, S) {
    const [g, gd, gl] = th.top, rng = mulberry32(5300 + v * 11), R = S / 16;
    const edge = x => (5 + Math.sin(x / R * 0.9 + v) * 1) * R;
    P.fill(0, oy, S, oy + 8 * R, (x, y) => { const e = edge(x), k = (y - oy) / e; return k > 1 ? null : k > 0.85 ? gd : k < 0.12 ? gl : lerpColor(g, gd, Math.max(0, k - 0.3) * 0.9); });
    for (let k = 0; k < 5; k++) { const x = 3 + rng() * (S - 6), y = oy + 1.5 * R + rng() * 2 * R; P.ell(x, y, 2 + rng() * 2.5, 1 + rng(), gd); P.ell(x - 0.6, y - 0.6, 1.2, 0.5, gl); }   // blisters
  },

  grass(P, th, v, oy, S) { withMeadowPal({ soil: fineRamp(th.ground), grass: fineRamp(th.top) }, () => paintFineGrass(P, v, oy)); },
  // a thick cap of snow: soft drifts bulging up over the top, bright on top, blue in its shadowed underside, an icicle
  snowTop(P, th, v, oy, S) {
    const R = ART_R, rng = mulberry32(5200 + v * 11);
    const top = Array.from({ length: S }, (_, x) => oy - Math.max(0, Math.round((Math.sin(x * Math.PI * 2 / S * 2 + v) * 0.5 + 0.5) * 2.4 * R)));
    const bot = Array.from({ length: S }, (_, x) => oy + 4 * R + Math.round(Math.sin(x * 0.35 + v * 3) * 1.2 + Math.sin(x * 0.11 + v) * 1.4));
    for (let x = 0; x < S; x++) for (let y = top[x]; y < bot[x]; y++) P.rect(x, y, 1, 1, y < top[x] + 2 ? '#ffffff' : y >= bot[x] - 3 ? '#bcd6f5' : y > oy + 2 * R ? '#e6f0ff' : '#f6faff');
    if (v % 3 === 0) { const x = 10 + Math.floor(rng() * (S - 20)), L = (2 + rng() * 3) * R; P.poly([[x - 2, bot[x] - 1], [x + 3, bot[x] - 1], [x + 0.5, bot[x] + L]], '#d8eeff'); P.line(x - 1, bot[x], x, bot[x] + L * 0.6, '#ffffff'); }
  },
  // a pale, rippled crust of drier sand along the top
  sandTop(P, th, v, oy, S) {
    const [g, gd, gl] = th.top, R = ART_R;
    for (let x = 0; x < S; x++) { const d = 4 * R + Math.round(Math.sin(x * 0.4 + v) * 1.2 + Math.sin(x * 0.13 + v * 2) * 1.6); for (let y = 0; y < d; y++) P.rect(x, oy + y, 1, 1, y < 2 ? gl : y >= d - 2 ? gd : g); }
  },
  // smouldering embers along the top: a hot bright lip fading down into the stone, a spark or two
  embers(P, th, v, oy, S) {
    const [g, gd, gl] = th.top, R = ART_R, rng = mulberry32(3500 + v);
    for (let x = 0; x < S; x++) {
      const d = 4 * R + Math.round(Math.sin(x * 0.5 + v) * 1.5 + Math.sin(x * 0.17) * 1.5);
      for (let y = 0; y < d; y++) P.rect(x, oy + y, 1, 1, y < 2 ? gl : lerpColor(g, gd, y / d));
    }
    for (let k = 0; k < 3; k++) P.rect(Math.floor(2 + rng() * (S - 4)), oy - 1, 1, 1, gl);
  },
  // the billowing top of a cloud: a row of round bumps along the top edge (rising a little over it), bright on top
  puffTop(P, th, v, oy, S) {
    const [b, , l] = th.ground, R = ART_R, cy = oy + 3 * R;
    const bumps = [[-0.5, 3.4], [5, 3.8], [10.5, 3.2], [16.5, 3.4]].map(([x, r]) => [(x + (v % 3) * 0.6) * R, r * R]);
    const inB = (x, y) => bumps.some(([bx, r]) => Math.hypot(x + 0.5 - bx, y + 0.5 - cy) < r);
    const nearRim = (x, y) => bumps.some(([bx, r]) => { const d = Math.hypot(x + 0.5 - bx, y + 0.5 - cy); return d < r && d >= r - 2.4 && y + 0.5 < cy; });
    for (let y = 0; y < cy; y++) for (let x = 0; x < S; x++) {
      const k = y * S + x;
      if (!inB(x, y)) { P.buf[k] = 0; continue; }
      if (nearRim(x, y)) P.buf[k] = P.col('#ffffff');
      else if (y < oy + R) P.buf[k] = P.col(l);
      else if (!P.buf[k]) P.buf[k] = P.col(b);
    }
  },
  // the cloud's underside: bumps hanging along the bottom edge, in soft shadow
  puffBottom(P, th, v, oy, S) {
    const [b, d] = th.ground, R = ART_R, H = oy + S, cy = H - 3 * R;
    const bumps = [[1, 3.2], [6.5, 3.6], [12, 3], [17, 3.4]].map(([x, r]) => [(x - (v % 3) * 0.5) * R, r * R]);
    for (let y = Math.floor(cy); y < H; y++) for (let x = 0; x < S; x++) {
      const k = y * S + x, ds = bumps.map(([bx, r]) => [Math.hypot(x + 0.5 - bx, y + 0.5 - cy), r]), inside = ds.some(([dd, r]) => dd < r);
      if (!inside) { P.buf[k] = 0; continue; }
      if (ds.some(([dd, r]) => dd < r && dd >= r - 2.4)) P.buf[k] = P.col(d);
      else P.buf[k] = P.col(lerpColor(b, d, 0.35));
    }
  },
  // a glowing crust along the top (the cave's teal moss): a bright lip, a band, a dark underside with little drips
  crust(P, th, v, oy, S) {
    const [g, gd, gl] = th.top, rng = mulberry32(3100 + v * 13);
    const edge = Array.from({ length: S }, (_, x) => 6 + Math.round(1.2 * Math.sin(x * Math.PI * 2 / S * 3 + v)));
    for (let k = 0; k < 3; k++) { const x0 = 3 + Math.floor(rng() * (S - 8)), w = 2 + Math.floor(rng() * 3), dd = 3 + Math.floor(rng() * 6); for (let i = 0; i < w; i++) edge[x0 + i] += Math.round(dd * Math.sin(Math.PI * (i + 0.5) / w)); }
    for (let x = 0; x < S; x++) for (let y = 0; y < edge[x]; y++) P.rect(x, oy + y, 1, 1, y < 2 ? gl : y < edge[x] - 2 ? g : gd);
    for (let x = 1; x < S - 1; x++) if (rng() < 0.25) P.rect(x, oy - 1, 1, 1, gl);   // a few glowing tips standing up
  },
};

// swap in a world's fine ground (getTileset, tiles.js)
function fineGroundTiles(set, th, name) {
  const R = ART_R, S = 16 * R, cfg = th.fineGround, UP = (cfg.up || 0) * R;
  const body = FINE_BODIES[cfg.body], cap = cfg.cap && FINE_CAPS[cfg.cap];
  const plain = v => { const P = finePix(S, S); body(P, th, v, 0, S); return P.hi(); };
  const top = v => { const P = finePix(S, S + UP); body(P, th, v, UP, S); if (cap) cap(P, th, v, UP, S); const img = P.hi(); img.oy = cfg.up || 0; return img; };
  for (let v = 0; v < 8; v++) { set['ground' + v] = plain(v); set['groundTop' + v] = top(v); }
  set.ground = set.ground0; set.groundTop = set.groundTop0;
  if (cfg.under) {   // (clouds: a bottom edge too, and a tile that's both top and bottom)
    const under = FINE_CAPS[cfg.under];
    const bot = () => { const P = finePix(S, S); body(P, th, 0, 0, S); under(P, th, 0, 0, S); return P.hi(); };
    const both = () => { const P = finePix(S, S + UP); body(P, th, 1, UP, S); cap(P, th, 1, UP, S); under(P, th, 1, UP, S); const img = P.hi(); img.oy = cfg.up || 0; return img; };
    set.groundBot = bot(); set.groundBoth = both();
  }
  const chips = new Map();
  set.chip = (key, mask, h) => {
    const v = h & 7, srcKey = set[key + v] ? key + v : key, k = srcKey + '_' + mask;
    if (!chips.has(k)) chips.set(k, cfg.chip === 'clean' ? cleanEdge(set[srcKey], mask) : cfg.chip === 'puff' ? chipPuff(set[srcKey], mask, hashStr(name + k), th) : chipFine(set[srcKey], th, mask, hashStr(name + k)));
    return chips.get(k);
  };
}
// a cloud tile's open sides (mask: 1 left, 2 right, 4 bottom) billow out in round bumps instead of chipping
function chipPuff(src, mask, seed, th) {
  const R = src.r, cv = src.canvas, w = cv.width, h = cv.height, out = makeCanvas(w, h), g = out.getContext('2d');
  g.drawImage(cv, 0, 0);
  const img = g.getImageData(0, 0, w, h), px = new Uint32Array(img.data.buffer), rng = mulberry32(seed), rim = P32(lerpColor(th.ground[0], th.ground[1], 0.4));
  const side = (left) => {
    const bumps = []; for (let y = -2 * R; y < h + 3 * R; y += (4 + rng() * 2) * R) bumps.push([y, (2.6 + rng() * 1.2) * R]);
    for (let y = 0; y < h; y++) for (let x = 0; x < 4 * R; x++) {
      const X = left ? x : w - 1 - x, inside = bumps.some(([by, r]) => Math.hypot(x + 0.5 - 3.6 * R, y + 0.5 - by) < r) || x >= 3.6 * R;
      if (!inside) px[y * w + X] = 0;
      else if (px[y * w + X] && bumps.some(([by, r]) => { const d = Math.hypot(x + 0.5 - 3.6 * R, y + 0.5 - by); return d < r && d >= r - 2 && x + 0.5 < 3.6 * R; }) && !left) px[y * w + X] = rim;
    }
  };
  if (mask & 1) side(true);
  if (mask & 2) side(false);
  g.putImageData(img, 0, 0);
  const res = hiRes(out, R); res.oy = src.oy || 0;
  return res;
}

// ── tiles many worlds share, painted fine: the stone block, the log stump (pipes), lava, the wooden ledge, the cracked
// ice block that crumbles, the ice block
// a rounded square stone with chips knocked out of it, lit along its top and left, pitted, a crack or two
function fineStoneBlock(th, v) {
  const R = ART_R, S = 16 * R, P = finePix(S, S), [b, d, l] = th.block, o = '#1a1428', rng = mulberry32(hashStr(th.block.join() + 'fine' + v));
  const bites = [];
  for (let i = 0; i < 3; i++) bites.push([Math.floor(rng() * 4), (3 + rng() * 10) * R, (1.2 + rng() * 2) * R]);
  const inside = (x, y) => {
    const cx = Math.min(x + 0.5, S - x - 0.5), cy = Math.min(y + 0.5, S - y - 0.5), r = 2.4 * R;
    if (cx < r && cy < r && Math.hypot(r - cx, r - cy) > r) return false;
    for (const [side, at, len] of bites) {
      const along = side < 2 ? x : y, depth = side === 0 ? y : side === 1 ? S - 1 - y : side === 2 ? x : S - 1 - x;
      if (Math.abs(along - at) < len && depth < (len - Math.abs(along - at)) * 0.6) return false;
    }
    return true;
  };
  const tex = fineCells(S, 3, 77 + v);
  P.fill(0, 0, S, S, (x, y) => {
    if (!inside(x, y)) return null;
    const e = (dx, dy) => !inside(x + dx, y + dy);
    if (e(-1, 0) || e(1, 0) || e(0, -1) || e(0, 1) || e(-2, 0) || e(0, -2) || e(2, 0) || e(0, 2)) return o;
    if (e(-5, 0) || e(0, -5)) return l;                   // the bevel catching the light
    if (e(5, 0) || e(0, 5)) return d;                     // ...and the side in shadow
    const [d1, d2] = tex(x + 0.5, y + 0.5);
    return d2 - d1 < 1.2 ? lerpColor(b, d, 0.35) : b;     // faint seams in the face
  });
  for (let i = 0; i < 2 + (v % 2); i++) { const x = (4 + rng() * 8) * R, y = (4 + rng() * 8) * R; P.ell(x, y, 2.2, 1.6, d); P.rect(Math.round(x) + 1, Math.round(y) + 1, 2, 1, l); }   // pits
  if (rng() < 0.75) {   // a hairline crack wandering in from one edge
    let x = rng() < 0.5 ? 6 : S - 7, y = (3 + rng() * 6) * R; const dx = x < S / 2 ? 1 : -1;
    for (let k = 0; k < 20; k++) { P.rect(Math.round(x), Math.round(y), 1, 1, o); x += dx; y += (rng() - 0.5) * 1.6; }
  }
  return P.hi();
}
// Joined stone formations: only exposed edges are chipped; adjoining tiles share uninterrupted rock.
// World coordinates carry the facets across tile boundaries instead of outlining every square.
const ROCK_FORMATION_ART = new Map();
function rockFormationArt(th, col, row, mask) {
  const c=col,r=row;
  const key=th.block.join()+':'+c+','+r+':'+mask;
  if(ROCK_FORMATION_ART.has(key))return ROCK_FORMATION_ART.get(key);
  const R=ART_R,S=TILE*R,P=finePix(S,S),C=fineRamp(th.block),wx=c*TILE,wy=r*TILE;
  const top=!!(mask&1),bottom=!!(mask&2),left=!!(mask&4),right=!!(mask&8);
  const ripple=(u)=>1.5+1.0*Math.sin(u*0.43)+0.55*Math.sin(u*1.13+0.8);
  const inside=(x,y)=>{
    const xx=(x+0.5)/R,yy=(y+0.5)/R;
    if(left&&xx<ripple(wy+yy))return false;
    if(right&&xx>TILE-ripple(wy+yy+31))return false;
    if(top&&yy<0.65+0.6*Math.sin((wx+xx)*0.48)+0.4*Math.sin((wx+xx)*1.1))return false;
    if(bottom&&yy>TILE-ripple(wx+xx+17))return false;
    // Rounded, asymmetric corners belong to the formation's silhouette, never to an internal join.
    if(top&&left&&xx+yy<4.5)return false;
    if(top&&right&&TILE-xx+yy<3.7)return false;
    if(bottom&&left&&xx+TILE-yy<2.5)return false;
    if(bottom&&right&&2*TILE-xx-yy<3.1)return false;
    return true;
  };
  const points=[];
  for(let j=Math.floor(wy/12)-1;j<=Math.floor((wy+16)/12)+1;j++)
    for(let i=Math.floor(wx/14)-1;i<=Math.floor((wx+16)/14)+1;i++){
      const h=hashStr('rockface:'+i+','+j);
      points.push([i*14+2+(h%997)/997*10,j*12+2+((h>>>10)%997)/997*8,h]);
    }
  P.fill(0,0,S,S,(x,y)=>{
    if(!inside(x,y))return null;
    const edge=(dx,dy)=>!inside(x+dx,y+dy);
    if(edge(-1,0)||edge(1,0)||edge(0,-1)||edge(0,1))return C[0];
    if(edge(-3,0)||edge(0,-3))return C[5];
    if(edge(3,0)||edge(0,3))return C[1];
    const X=wx+(x+0.5)/R,Y=wy+(y+0.5)/R;
    let d1Sq=1e9,d2Sq=1e9,near;
    for(let i=0;i<points.length;i++){
      const pt=points[i],dx=(X-pt[0])*0.85,dy=Y-pt[1],dSq=dx*dx+dy*dy;
      if(dSq<d1Sq){d2Sq=d1Sq;d1Sq=dSq;near=pt;}else if(dSq<d2Sq)d2Sq=dSq;
    }
    const seam=Math.sqrt(d2Sq)-Math.sqrt(d1Sq);
    // Narrow mineral fractures over a completely opaque face, rather than gaps between boulders.
    if(seam<0.19)return C[1];
    const light=-(X-near[0])*0.045-(Y-near[1])*0.065;
    return light>0.36?C[4]:light< -0.3?C[2]:C[3];
  });
  const art=P.hi();ROCK_FORMATION_ART.set(key,art);return art;
}
// the log stump (a 'pipe'), painted in one space across its two tiles so the halves meet seamlessly and its body tiles
// stack without a seam: a round trunk shaded from the left, deep bark fissures, a pale cut top with growth rings,
// radial checks and the dark hollow, moss thick on the rim and dripping down the bark. The ink line follows only the
// real outline (the cut top's curve included: nothing pokes out at its corners)
const LOG_BARK = ['#24140a', '#3e2412', '#5e3a20', '#80532e', '#a6743f', '#c8955a'], LOG_CUT = ['#a87a46', '#c89a62', '#e2bc84', '#f2d6a4'];
const LOG_MOSS = ['#244e20', '#36702c', '#4f9238', '#72b44a', '#a2d870'];
const LOG_X0 = 1.6, LOG_X1 = 30.4, LOG_CX = 16, LOG_CY = 3.6, LOG_RX = 14.4, LOG_RY = 3.2;
function fineLogTile(part) {
  const R = ART_R, S = 16 * R, P = finePix(S, S), left = part === 'TL' || part === 'L', top = part === 'TL' || part === 'TR';
  const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
  // (gx, gy): two-tile space; the top tile's gy runs 0..16 with the cut top at LOG_CY, a body tile's 16..32 (and on down)
  const inside = (gx, gy) => gx >= LOG_X0 && gx <= LOG_X1 && (gy >= LOG_CY || ((gx - LOG_CX) / (LOG_RX + 1.2)) ** 2 + ((gy - LOG_CY) / (LOG_RY + 0.9)) ** 2 <= 1);
  const oy = top ? 0 : 16, ox = left ? 0 : 16, ink = 2 / R;
  P.fill(0, 0, S, S, (x, y) => {
    const gx = ox + (x + 0.5) / R, gy = oy + (y + 0.5) / R;
    if (!inside(gx, gy)) return null;
    if (!inside(gx - ink, gy) || !inside(gx + ink, gy) || !inside(gx, gy - ink)) return INK;                     // the outline
    const e = ((gx - LOG_CX) / LOG_RX) ** 2 + ((gy - LOG_CY) / LOG_RY) ** 2;
    if (top && e <= 1) {   // the cut top
      const h = ((gx - LOG_CX) / 5.4) ** 2 + ((gy - LOG_CY - 0.3) / 1.5) ** 2;
      if (h <= 1) return softTone(['#120a04', '#24140a', '#3a2412', '#5a3a20', '#7a5230'], -1 + (gy - LOG_CY + 1.5) * 0.5);   // the hollow, darkest at its back
      if (h <= 1.25) return '#5a3a20';                                                                                       // its worn lip
      const d = Math.sqrt(e), ring = Math.abs(Math.sin(d * 26 + hash(Math.round(d * 9), 3) * 0.6)) < 0.16;
      const check = Math.abs(Math.sin(Math.atan2((gy - LOG_CY) * 4.5, gx - LOG_CX) * 5 + 1.3)) < 0.05 && d > 0.45;          // radial cracks
      if (d > 0.9) return LOG_BARK[2];                                                                                       // the bark rim round it
      return check ? LOG_CUT[0] : ring ? LOG_CUT[1] : softTone(LOG_CUT, 0.9 - (gx - LOG_CX) / LOG_RX * 0.4 - d * 0.3);
    }
    // the trunk: lit from the left, rounded, its bark in long ridges and fissures (periodic down the body tiles)
    const u = (gx - LOG_X0) / (LOG_X1 - LOG_X0), round = Math.sqrt(Math.max(0, 1 - (u * 2 - 1) ** 2));
    const by = top ? gy : (gy - 16), ridge = Math.sin(gx * 1.35 + Math.sin(by / 16 * Math.PI * 2 + gx * 0.7) * 1.1 + hash(Math.floor(gx / 2.3), 0) * 3);
    let l = 0.9 - u * 1.5 + round * 0.45;
    if (ridge > 0.72) l -= 0.9;                         // a deep fissure
    else if (ridge > 0.45) l -= 0.35;
    else if (ridge < -0.6) l += 0.3;                    // the face of a ridge catching the light
    if (Math.abs(Math.sin(by / 16 * Math.PI * 2 + gx * 0.21)) < 0.035 && hash(Math.floor(gx), 7) > 0.6) l -= 0.7;   // a cross crack
    // moss: thick round the rim, dripping down in tongues; a few cushions lower on the shaded side
    const drip = top ? LOG_CY + 2.4 + hash(Math.floor(gx / 1.6), 1) * 5.5 * (0.5 + 0.5 * Math.sin(gx * 0.7)) : -1;
    const cushion = !top && ((gx - (left ? 6 : 27)) / 3.2) ** 2 + ((by - 9) / 2.6) ** 2 < 1 && hash(left ? 1 : 2, 5) > 0.3;
    if ((top && gy < drip) || cushion) {
      const bump = hash(Math.floor(gx * 1.5), Math.floor(gy * 1.5));
      return softTone(LOG_MOSS, 0.7 - u * 1.1 - (top ? (gy - LOG_CY) / 8 : 0) + (bump > 0.82 ? 0.6 : bump < 0.15 ? -0.4 : 0));
    }
    return softTone(LOG_BARK, l);
  });
  if (top) {   // tufts of moss lapping up over the rim, a sprig or two, and a tiny mushroom on the shaded side
    for (let k = 0; k < 9; k++) {
      const gx = LOG_X0 + 1.8 + k * 3.2, ang = (gx - LOG_CX) / LOG_RX, gy = LOG_CY + LOG_RY * Math.sqrt(Math.max(0, 1 - ang * ang)) - 0.2, x = (gx - ox) * R, y = gy * R;
      if (x < -4 || x > S + 4) continue;
      P.ell(x, y, 2.2 * R * 0.5, 1.3 * R * 0.5, LOG_MOSS[k % 2 ? 3 : 2]); P.ell(x - 1, y - 1, 1.2, 1, LOG_MOSS[4]);
    }
    if (!left) { const x = (27.6 - 16) * R, y = 10 * R; P.rect(x - 1, y, 2, 4, '#efe4cc'); P.ell(x, y, 5, 3, '#c84a3a'); P.ell(x - 2, y - 1, 1.5, 1, '#ffd8c8'); }
  }
  return P.hi();
}
// Lava samples one world-space wave, so adjacent columns share their crest height and slope.
const LAVA_SURFACE_ART=new Map();
function lavaSurfaceY(worldX,phase) {
  const x=worldX+phase*3;
  return 4+Math.sin(x/32*Math.PI*2)*1.15+Math.sin(x/96*Math.PI*2)*0.55;
}
function fineLava(f,deep,offset=0) {
  const R=ART_R,S=TILE*R,P=finePix(S,S),[b,crest,dark,bub]=LAVA_COL;
  const surf=deep?null:new Float32Array(S);
  if(!deep)for(let x=0;x<S;x++)surf[x]=lavaSurfaceY((x+0.5)/R+offset,f)*R;
  P.fill(0,0,S,S,(x,y)=>{
    if(deep)return lerpColor(b,dark,0.55+0.32*y/S); // submerged rows never grow another bright surface line
    const s=surf[x];
    if(y+0.5<s)return null;
    const d=(y+0.5-s)/R;
    if(d<0.55)return crest;
    if(d<1.45)return lerpColor(crest,b,(d-0.55)/0.9);
    return lerpColor(b,dark,clamp((y/R-7)/9,0,1)*0.55);
  });
  if(!deep)for(const [x,y,r] of [[5,9,0.85],[12,13,0.6]]){
    const xx=((x+offset*0.17+f*0.35)%14+1)*R;
    P.ell(xx,y*R,r*R,r*R,bub);P.ell(xx-0.15*R,(y-0.15)*R,0.25*R,0.25*R,'#fff6cf');
  }
  return P.hi();
}
function lavaSurfaceArt(col,t) {
  const slot=((col%6)+6)%6,frame=((Math.floor(t/3)%64)+64)%64,key=slot+':'+frame;
  if(!LAVA_SURFACE_ART.has(key))LAVA_SURFACE_ART.set(key,fineLava(frame/2,false,slot*TILE));
  return LAVA_SURFACE_ART.get(key);
}
// the wooden ledge (semi-solid): a board, lit along its top edge, grain and a knot, nail heads, its shadow under it
function fineSemi(th) {
  const R = ART_R, S = 16 * R, P = finePix(S, S), [b, d, l] = th.semi, rng = mulberry32(hashStr(th.accent || 'semi'));
  P.fill(0, 0, S, 6 * R, (x, y) => y < R ? d : y < R + 2 ? l : y >= 5 * R ? d : x >= S - 2 ? d : b);
  for (let k = 0; k < 7; k++) { const y = (1.6 + rng() * 3) * R, x = rng() * (S - 12), len = 6 + rng() * 14; P.line(x, y, x + len, y + (rng() - 0.5) * 2, lerpColor(b, d, 0.5), { only: [P.col(b)] }); }
  P.ell(9 * R, 3.2 * R, 3, 2, d); P.ell(9 * R, 3.2 * R, 1.5, 1, lerpColor(b, d, 0.5));
  for (const x of [2.5, 12.5]) { P.ell(x * R, 2.7 * R, 1.6, 1.6, '#3a3a48'); P.rect(x * R - 1, 2.7 * R - 1, 1, 1, '#ffffff'); }
  P.fill(0, 6 * R, S, 6 * R + 2, () => d, { a: 0.35 });
  return P.hi();
}
// a cracked ice block that crumbles away under him
function fineCrumble() {
  const R = ART_R, S = 16 * R, P = finePix(S, S);
  P.fill(0, 0, S, S, (x, y) => (x < 2 || y < 2 || x >= S - 2 || y >= S - 2) ? '#8a98c0' : (x < 5 || y < 5) ? '#ffffff' : (x >= S - 5 || y >= S - 5) ? '#c3cde8' : lerpColor('#f2f6ff', '#d8e2f6', y / S));
  for (const pts of [[[4, 1], [5, 4], [4, 7], [6, 9]], [[11, 8], [10.5, 11], [12, 13]], [[11, 10.4], [14, 10]], [[7, 9], [9, 9.6]]]) for (let i = 0; i < pts.length - 1; i++) P.line(pts[i][0] * R, pts[i][1] * R, pts[i + 1][0] * R, pts[i + 1][1] * R, '#8a98c0');
  P.line(3 * R, 3 * R, 7 * R, 3 * R, '#ffffff'); P.line(3 * R, 3 * R, 3 * R, 6 * R, '#ffffff');
  return P.hi();
}
// a clear ice block: cold blue, a bright bevel, a streak of reflected light across it
function fineIce() {
  const R = ART_R, S = 16 * R, P = finePix(S, S);
  P.fill(0, 0, S, S, (x, y) => (x < 2 || y < 2 || x >= S - 2 || y >= S - 2) ? '#3a7ac0' : (x < 5 || y < 5) ? '#e8faff' : (x >= S - 5 || y >= S - 5) ? '#7ac4f0' : lerpColor('#bfeaff', '#8fd4fa', (x + y) / S / 2));
  P.fill(0, 0, S, S, (x, y) => (x + y > 34 && x + y < 40 && x > 5 && y > 5 && x < S - 5 && y < S - 5) ? '#f4fcff' : null);
  return P.hi();
}
// hot coals (frame f of 4): dark round lumps with a lit rim, glowing seams between them, embers flickering on top
function fineCoal(f) {
  const R = ART_R, S = 16 * R, P = finePix(S, S), glow = ['#a3361a', '#d8501a', '#ff7a2a', '#d8501a'][f], hot = ['#ff7a2a', '#ffb347', '#ffe08a', '#ffb347'][f];
  P.rect(0, 0, S, S, glow);
  const lumps = [[3, 4.5, 3, 2.6], [8.5, 3.5, 2.6, 2.6], [13.5, 5, 2.6, 3], [5, 10.5, 3, 2.6], [11, 10, 3, 3], [2, 14.5, 2, 1.6], [14, 14, 2, 2], [8, 14.5, 3, 1.6]];
  for (const [x, y, rx, ry] of lumps) { P.ell(x * R, y * R, rx * R, ry * R, '#2a1a22'); P.ell(x * R - 1, y * R - 2, rx * R - 2, ry * R - 3, '#3a2a34'); P.ell(x * R - rx * R * 0.3, y * R - ry * R * 0.5, rx * R * 0.5, 2, '#54404c'); }
  P.rect(0, 0, S, 2, hot);
  for (const [x, y] of [[2, 7], [8, 6], [13, 8], [7, 10], [9, 13]]) P.ell(x * R, y * R, 2, 1.4, hot, { only: [P.col(glow)] });
  P.rect(((f * 5) % 14 + 1) * R, 0, 2 * R, 2, '#fff4c0');
  return P.hi();
}
// Native sand slurry. The surface and flowing ridges sample world coordinates, so adjoining columns meet.
const QUICKSAND_ART=new Map();
function fineQuicksandArt(col,row,time,deep=false) {
  const c=((col%6)+6)%6,r=row%3,frame=Math.floor(time/6)%32,key=[c,r,frame,deep].join(':');
  if(QUICKSAND_ART.has(key))return QUICKSAND_ART.get(key);
  const R=ART_R,S=TILE*R,P=finePix(S,S),phase=frame*Math.PI/16;
  const tones=['#986c40','#b88a50','#d1aa6b','#e3c68a','#efd9a5'];
  const crests=new Float32Array(S),xFlowBase=new Float32Array(S);
  for(let ax=0;ax<S;ax++){
    const x=c*16+(ax+.5)/R;
    crests[ax]=2.1+Math.sin(x*Math.PI/16+phase)*.45+Math.sin(x*Math.PI/48-phase)*.45;
    xFlowBase[ax]=x*Math.PI/24+phase*.65;
  }
  const yFlowOff=new Float32Array(S),yRidgeBase=new Float32Array(S);
  for(let ay=0;ay<S;ay++){
    const Y=r*16+(ay+.5)/R;
    yFlowOff[ay]=Math.sin(Y*.29-phase)*.8;
    yRidgeBase[ay]=Y*.7-phase;
  }
  const deepOff=deep?16:0,invR=1/R;
  P.fill(0,0,S,S,(ax,ay)=>{
    const y=(ay+.5)*invR,crest=crests[ax];
    if(!deep&&y<crest)return null;
    if(!deep&&y<crest+.45)return '#f1d59b';
    if(!deep&&y<crest+1.1)return '#c79b5d';
    const depth=Math.min(1,(deepOff+y-crest)/15);
    const flow=Math.sin(xFlowBase[ax]+yFlowOff[ay]);
    const ridge=Math.sin(yRidgeBase[ay]+flow*1.6);
    const n=.25+flow*.12+ridge*.13-depth*.5;
    return softTone(tones,n);
  });
  const art=P.hi();QUICKSAND_ART.set(key,art);return art;
}
// put the shared fine tiles into a world's set, wherever it uses the shared look (getTileset, tiles.js)
// a machined edge (4-2's iron plate: chip 'clean'): the open sides cut straight, with a dark bevel down them
function cleanEdge(src, mask) {
  const cv = makeCanvas(src.canvas.width, src.canvas.height), g = cv.getContext('2d'), W = cv.width, H = cv.height, R = ART_R;
  g.drawImage(src.canvas, 0, 0);
  const top = (src.oy || 0) * R;
  g.fillStyle = '#121014';
  if (mask & 1) g.fillRect(0, top, 2, H - top);
  if (mask & 2) g.fillRect(W - 2, top, 2, H - top);
  if (mask & 4) g.fillRect(0, H - 2, W, 2);
  g.fillStyle = 'rgba(255,255,255,0.12)';
  if (mask & 1) g.fillRect(2, top, 1, H - top);
  const img = hiRes(cv, R); img.oy = src.oy; return img;
}
function fineSharedTiles(set, th) {
  const solidPlain = !th.solid && th.style !== 'sand';
  if (solidPlain) { set.rockFormation=(c,r,m)=>rockFormationArt(th,c,r,m); for (let v = 0; v < 4; v++) set['solid' + v] = fineStoneBlock(th, v); set.solid = set.solid0; }
  if (th.style !== 'sand') for (const p of ['TL', 'TR', 'L', 'R']) set['pipe' + p] = th.pipe === 'coral' ? fineCoralTile(p) : fineLogTile(p);
  if (!th.acid) { for (let f = 0; f < 4; f++) set['lava' + f] = fineLava(f, false); set.lavaDeep = fineLava(0, true); }
  if (th.semiStyle !== 'bone') {
    set.semi = fineSemi(th);
    const chips = new Map();
    set.chipSemi = (mask, h) => { const k = mask + '_' + (h & 3); if (!chips.has(k)) chips.set(k, chipFine(set.semi, th, mask & 3, hashStr('semi' + k), th.semi[1])); return chips.get(k); };
  }
  if (th.crumbleStyle !== 'cracker') set.crumble = fineCrumble();
  set.ice = fineIce();
  if (th.solid === 'iron') { for (let v = 0; v < 4; v++) set['solid' + v] = fineIron(v); set.solid = set.solid0; }   // 4-1's cast iron, croutons and saltines
  if (th.brickStyle === 'crouton') set.brick = fineCrouton(th);
  if (th.crumbleStyle === 'cracker') set.crumble = fineSaltine();
  for (const kind of ['tick', 'tock']) { set[kind + 'On'] = fineClockBlock(kind, true); set[kind + 'Off'] = fineClockBlock(kind, false); }
  for (let f = 0; f < 4; f++) set['coal' + f] = fineCoal(f);
}
// Coral pipes are painted as one full-width cylinder and rim before splitting into tile halves.
// Both corner silhouettes and the hollow therefore meet exactly; no independent corner caps can protrude.
const CORAL_SECTIONS=new Map();
function fineCoralSection(top) {
  if(CORAL_SECTIONS.has(top))return CORAL_SECTIONS.get(top);
  const A=mArt(32,16),C=['#713e50','#a45d69','#cc8c85','#eeb6a3','#ffe0bd'];
  // Almost the full two-tile collision width: thick reef limestone with no skinny inner trunk.
  A.fill(0,top?3:0,32,16,(x,y)=>{
    const edge=.25+.25*Math.sin(y*Math.PI/8)**2;
    if(x<edge||x>32-edge)return null;
    const u=(x-16)/16,grain=Math.sin(x*21.7+y*37.3)*Math.sin(x*7.1-y*13.9);
    const rib=Math.cos(x*.85+Math.sin(y*.39)*.22)*.075;
    const band=Math.cos(y*Math.PI/8)*.07;
    return softTone(C,-u*.85+(1-u*u)*.52+grain*.055+rib+band);
  });
  // Recessed star-shaped corallites and tiny calcified pores, seeded identically at every seam.
  for(const [x,y,r]of [[3.7,top?11:3,1.05],[9,top?12.4:8.2,.85],[15.5,top?9:4.2,1.1],[22,top?13:10,.9],[28,top?9:5.5,.85]]){
    A.soft(x,y,r+1,r+.75,['#935964','#b77a7e','#d89b90','#e8b6a2','#f7d4b5']);
    A.ell(x,y,r*.52,r*.4,'#895363');
    for(let i=0;i<6;i++){const t=i*Math.PI/3;A.line(x+Math.cos(t)*r*.6,y+Math.sin(t)*r*.5,x+Math.cos(t)*r*1.15,y+Math.sin(t)*r,'#f2c3a9',null,.28);}
  }
  for(let i=0;i<24;i++){
    const x=1.5+(i*7.37)%29,y=(i*5.73)%16;if(top&&y<7)continue;
    A.ell(x,y,.18+(i%3)*.08,.22,'#a46b72');A.ell(x-.15,y-.2,.15,.12,'#f4c7ab');
  }
  if(top){
    // A broad flared rim and a deep opening wide enough for Chickaroo and the eel.
    A.soft(16,3.7,15.9,3.5,C);
    A.ell(16,3.3,12.6,2.3,'#6d4052');A.ell(16,3.7,11.8,1.7,'#302b3b');
    A.ell(16,4,10.7,1.1,'#1d2333');
    for(let i=0;i<60;i++){
      const t=i/59*Math.PI,x=16+Math.cos(t)*15,y=3.6+Math.sin(t)*2.8;
      A.ell(x,y,.65,.38,i%4===0?'#d4948b':'#f5cab0');
    }
    for(const x of [2,6,12,21,27,30])A.line(x,2.5,x+.8,4,'#bb7e80',null,.35);
  }
  const img=A.canvas();CORAL_SECTIONS.set(top,img);return img;
}
function fineCoralTile(part) {
  const top=part==='TL'||part==='TR',left=part==='TL'||part==='L',img=fineCoralSection(top),out=makeHiCanvas(16,16);
  out.getContext('2d').drawImage(img,left?0:16,0,16,16,0,0,16,16);return out;
}

// 4-1's solid blocks: a plate of seasoned cast iron, a dull sheen across it, rivets, and now and then a speck of rust
function fineIron(v) {
  const R = ART_R, S = 16 * R, P = finePix(S, S);
  P.fill(0, 0, S, S, (x, y) => x < 2 || y < 2 || x >= S - 2 || y >= S - 2 ? '#121014' : lerpColor(lerpColor('#4a444e', '#24202a', (x + y) / (2 * S)), '#6a646e', Math.max(0, 1 - Math.hypot(x - S * 0.32, (y - S * 0.26) * 2) / (S * 0.3)) * 0.5));
  P.fill(2, 2, S - 2, 3, () => '#5a5460'); P.fill(2, 2, 3, S - 2, () => '#4a444e'); P.fill(2, S - 3, S - 2, S - 2, () => '#1a161c'); P.fill(S - 3, 2, S - 2, S - 2, () => '#1a161c');
  for (const [x, y] of [[3.5, 12.5], [12.5, 3.5], [12.5, 12.5]]) { P.ell(x * R, y * R, 2.2, 2.2, '#121014'); P.ell(x * R - 0.3, y * R - 0.4, 1.4, 1.4, '#7a7480'); }
  if (v % 2) P.ell(10 * R, 10 * R, 4, 3, '#4a2e24');
  return P.hi();
}
// 4-1's crates: a big stale crouton, toasted dark at its edges, pocked, a fleck of parsley, grains of salt
function fineCrouton(th) {
  const R = ART_R, S = 16 * R, P = finePix(S, S), [b, d, l] = th.brick, rng = mulberry32(611);
  P.fill(0, 0, S, S, (x, y) => {
    const ex = Math.min(x, S - 1 - x), ey = Math.min(y, S - 1 - y), e = Math.min(ex, ey), corner = ex < 3 && ey < 3 && Math.hypot(3 - ex, 3 - ey) > 3;
    if (corner) return null;
    if (e < 2) return '#4a2408';
    const toast = Math.min(1, e / (4 * R)), n = loopNoise2(x, y, S, 77, 3);
    return lerpColor(d, n > 0.3 ? l : b, toast * 0.85 + 0.1);
  });
  for (let k = 0; k < 7; k++) { const x = 6 + rng() * (S - 12), y = 6 + rng() * (S - 12); P.ell(x, y, 1.6 + rng() * 1.6, 1 + rng(), d); }   // pocks
  P.ell(11 * R, 6 * R, 1.8, 1.2, '#5ab048'); P.ell(4.4 * R, 12 * R, 1.4, 1, '#2f7a2a');   // parsley
  for (const [x, y] of [[13, 2.6], [2.6, 13], [9, 4]]) P.ell(x * R, y * R, 0.9, 0.9, '#fff4d8');   // salt
  return P.hi();
}
// 4-1's crumbling blocks: a saltine cracker, docked with a grid of holes, salted, its edges baked a shade darker
function fineSaltine() {
  const R = ART_R, S = 16 * R, P = finePix(S, S);
  P.fill(0, 0, S, S, (x, y) => { const e = Math.min(x, y, S - 1 - x, S - 1 - y); return e < 2 ? '#a07838' : e < 4 ? '#e0bc7a' : lerpColor('#f8e0aa', '#f0d49a', (x + y) / (2 * S)); });
  P.fill(2, 2, S - 2, 3, () => '#fff0c8');
  for (const gx of [4, 8, 12]) for (const gy of [4, 8, 12]) { P.ell(gx * R, gy * R, 1.3, 1.3, '#b8904a'); P.ell(gx * R, gy * R + 0.8, 1.1, 0.6, '#ffe8b8', { only: [P.col('#f8e0aa'), P.col('#f0d49a')] }); }
  for (const [x, y] of [[6, 3], [10, 6], [3, 10], [11, 11], [6.5, 9.5]]) P.ell(x * R, y * R, 0.9, 0.9, '#ffffff');
  return P.hi();
}
