'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 3-4's turtle, GARGLE, painted like the real animal: the head that comes up out of the clouds to swallow
// Chickaroo (gut.js drawGutTurtle) and its rear end out in the sea at the finale (gut-vault.js drawTurtleRear).
//   Every surface is lit per pixel (uses the helpers in cloacolith-art.js): the carapace's scutes are plates
//   with growth rings and radiating amber streaks, seams cut between them and a serrated rim of marginal scutes;
//   the hide is plates with pale borders, each one slightly domed (softer in the close-up); the beak is smooth
//   horn with a rounded hooked tip; the mouth is soft wet pink with gentle folds and a tongue, down to the dark throat.
//   The big pictures are baked once (prepared in initGut, so nothing is painted mid-scene); the eyes, the
//   cloaca and the strings of spit are drawn live.
// ═══════════════════════════════════════════════════════════════════════════

// the nearest two of a jittered grid of points: scales and plates
function trtCells(x, y, size, seed) {
  const gx = Math.floor(x / size), gy = Math.floor(y / size);
  let d1 = 1e9, d2 = 1e9, id = 0, px = 0, py = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = gx + i, cy = gy + j;
    const qx = (cx + 0.15 + 0.7 * cloHash(cx, cy, seed)) * size, qy = (cy + 0.15 + 0.7 * cloHash(cx, cy, seed + 1)) * size;
    const d = cloLen(x - qx, y - qy);
    if (d < d1) { d2 = d1; d1 = d; id = cx * 7919 + cy * 104729; px = qx; py = qy; } else if (d < d2) d2 = d;
  }
  return { d1, d2, id, px, py };
}
// one bit of turtle hide: a dark domed plate with a pale rim and a groove round it
function trtHide(x, y, size, seed, dark, pale) {
  const c = trtCells(x, y, size, seed), e = c.d2 - c.d1, h = cloHash(c.id, 3, seed + 5);
  const rim = 1 - cloSmooth(size * 0.06, size * 0.32, e);
  let col = cloMix(dark, cloMix(dark, pale, 0.4), h * 0.7);
  col = cloMix(col, pale, rim * 0.8);
  if (e < size * 0.06) col = col.map(k => k * 0.5);
  return { col, nx: (x - c.px) / size * 0.8, ny: (y - c.py) / size * 0.8 };
}
// the same hide, softer (the intro's friendly close-up): plates only gently rimmed, the grooves shallow
function trtSkin(x, y, size, seed, dark, pale) {
  const c = trtCells(x, y, size, seed), e = c.d2 - c.d1, h = cloHash(c.id, 3, seed + 5);
  const rim = 1 - cloSmooth(size * 0.05, size * 0.4, e);
  let col = cloMix(dark, cloMix(dark, pale, 0.3), h * 0.55);
  col = cloMix(col, pale, rim * 0.32);
  if (e < size * 0.045) col = col.map(k => k * 0.78);
  return { col, nx: (x - c.px) / size * 0.45, ny: (y - c.py) / size * 0.45 };
}
// a carapace scute: plates from a list of centres, rings round each plate's growth point, streaks radiating out
function trtScute(x, y, seeds, seed) {
  let a = null, b = null, d1 = 1e9, d2 = 1e9;
  for (const s of seeds) { const d = cloLen(x - s[0], y - s[1]); if (d < d1) { d2 = d1; b = a; d1 = d; a = s; } else if (d < d2) { d2 = d; b = s; } }
  // distance to the seam (the bisector between the two nearest centres)
  const dx = b[0] - a[0], dy = b[1] - a[1], L = cloLen(dx, dy) || 1;
  const seam = ((x - (a[0] + b[0]) / 2) * dx + (y - (a[1] + b[1]) / 2) * dy) / L;   // negative inside a's plate
  const gx = a[0] + (a[2] || 0), gy = a[1] + (a[3] || 0), r = cloLen(x - gx, y - gy), ang = Math.atan2(y - gy, x - gx);
  const streak = cloFbm(ang * 3.2 + a[0] * 0.1, r * 0.035, seed);
  const ring = Math.sin(r * 0.75 + cloNoise(x * 0.08, y * 0.08, seed + 2) * 4);
  let col = cloMix([62, 34, 16], [176, 108, 44], cloSmooth(0.2, 0.85, streak));
  col = cloMix(col, [104, 98, 40], cloSmooth(0.55, 0.8, cloFbm(x * 0.03, y * 0.03, seed + 4)) * 0.5);   // olive weathering
  if (ring > 0.82) col = col.map(k => k * 0.78);
  return { col, seam: -seam, nx: (x - a[0]) / 90, ny: (y - a[1]) / 90 };
}
const trtLight = v => { const l = cloLen(...v); return v.map(k => k / l); };
// how much finer than the game the turtle is painted (it's big: full-screen in the intro and the finale)
const TRT_S = 2;
function trtOutline(B, col) {   // (two art pixels when painted fine)
  const { W: w, H: h, d, S } = B;
  for (let pass = 0; pass < (S > 1 ? 2 : 1); pass++) {
    const solid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] > 128 ? 1 : 0;
    for (let py = 1; py < h - 1; py++) for (let px = 1; px < w - 1; px++) {
      if (solid[py * w + px]) continue;
      if (solid[py * w + px - 1] || solid[py * w + px + 1] || solid[(py - 1) * w + px] || solid[(py + 1) * w + px]) B.put(px / S - B.ox, py / S - B.oy, col);
    }
  }
}
const trtShade = (col, sh, amb, glossy, water) => col.map((c, k) => c * (amb + sh.dif * (1 - amb) * 1.1) + 255 * sh.spec * glossy + (water ? water[k] * (1 - sh.dif) * 0.22 : 0));

// ── the exit: the turtle seen from straight underneath, its head off to the left (origin: the cloaca) ──
// The pale plastron fills the left with the carapace's rim showing round it; the two hind flippers splay out up
// and down to the right, and between them the short tail points right, the cloaca at its tip.
const TRT_BELLY = { ox: 150, oy: 116, w: 176, h: 232 };
const TRT_FLIPPERS = [   // root (x, y), angle, length scale, mirrored: the upper and lower hind flipper
  { x: -30, y: -30, ang: -0.86, k: 1, flip: false },
  { x: -27, y: 18, ang: 1.08, k: 0.82, flip: true },
];
function trtBakeRear() {
  const L = trtLight([0.15, -0.35, 0.92]), B = cloBuffer(TRT_BELLY.w, TRT_BELLY.h, TRT_BELLY.ox, TRT_BELLY.oy, L, TRT_S), WATER = [40, 110, 150];
  const car = (x, y) => { const u = (x + 150) / 140, v = (y + 8) / 80; return u * u + v * v; };
  const plas = (x, y) => {   // the plastron, tapering to its rear lobes with the anal notch between them
    const u = (x + 150) / 116, v = (y + 6) / (56 - Math.max(0, x + 70) * 0.42);
    const notch = x > -44 && Math.abs(y + 6) < (x + 44) * 0.7;
    return notch ? 9 : u * u + v * v;
  };
  const blob = (x, y) => { const u = (x + 30) / 22, v = (y + 6) / 28; return u * u + v * v; };
  const tail = (x, y) => {   // the tail: a thick tapering cone out to the cloaca
    const u = clamp((x + 38) / 40, 0, 1), cy = -6 * (1 - u), r = 12 - u * 6.5;
    return x < -38 || x > 4 ? 9 : ((y - cy) / r) ** 2;
  };
  for (let py = 0; py < B.H; py++) for (let px = 0; px < B.W; px++) {
    const x = px / B.S - TRT_BELLY.ox, y = py / B.S - TRT_BELLY.oy;
    const rT = tail(x, y), rB = blob(x, y), rP = plas(x, y), rC = car(x, y);
    if (rT < 1 || (rB < 1 && rP >= 1)) {   // ── hide: the tail and the soft skin at its base, wrinkled, scales shrinking toward the tip
      const inT = rT < 1, size = inT ? 4 + clamp(-x / 38, 0, 1) * 2.5 : 6.5;
      const H = trtHide(x + 300, y + 300, size, 241, [66, 70, 56], [172, 168, 138]);
      H.col = cloMix(H.col, [76, 80, 64], 0.3);
      const nr = inT ? Math.sqrt(rT) : Math.sqrt(rB), nv = inT ? (y + 6 * (1 - clamp((x + 38) / 40, 0, 1))) / 12 : (y + 6) / 28;
      const sh = B.lit(H.nx + (inT ? 0 : (x + 30) / 26), H.ny + nv, Math.sqrt(Math.max(0.05, 1 - nr * nr)) + 0.3);
      let col = H.col; if (!inT && Math.sin(Math.atan2(y + 6, x + 30) * 7 + Math.hypot(x + 30, y + 6) * 0.3) > 0.9) col = col.map(k => k * 0.72);   // folds
      B.put(x, y, trtShade(col, sh, 0.35, 0.3, WATER));
    } else if (rP < 1) {   // ── the plastron: big pale plates, a seam down the middle and across, faint growth lines
      const u = (x + 150) / 116, v = (y + 6) / 56, sh = B.lit(u * 0.35, v * 0.5, Math.sqrt(Math.max(0.1, 1 - rP)) + 0.4);
      let col = cloMix([132, 136, 128], [196, 194, 176], 0.5 + (cloFbm(x * 0.05, y * 0.05, 231) - 0.5) * 0.8);
      const mid = y + 6 + Math.sin(x * 0.04) * 1.2, seams = [-58, -96, -138];
      if (Math.abs(mid) < 0.7) col = [110, 106, 92];
      for (const sx of seams) { const d = x - sx - Math.abs(mid) * 0.25; if (Math.abs(d) < 0.7) col = [118, 112, 96]; else if (d > 0.7 && d < 2) col = col.map(k => k * 1.06); }
      if (Math.sin(Math.hypot(x + 80, (y + 6) * 1.4) * 0.5 + cloNoise(x * 0.1, y * 0.1, 233) * 4) > 0.95) col = col.map(k => k * 0.96);   // faint growth lines
      if (rP > 0.86) col = col.map(k => k * (1 - (rP - 0.86) * 1.6));   // its edge curving up into the bridge
      B.put(x, y, trtShade(col, sh, 0.36, 0.14, WATER));
    } else if (rC < 1) {   // ── the carapace's rim from below: marginal scutes, darker, saw-toothed at the rear
      const ang = Math.atan2((y + 8) / 80, (x + 150) / 140), seg = ang / 0.12, f = seg - Math.floor(seg), r = Math.sqrt(rC);
      if (r > 1 - 0.016 * Math.sin(f * Math.PI) * -1 - 0.016) continue;   // (each marginal scute rounded)
      let col = cloMix([84, 78, 64], [150, 140, 116], 0.45 + 0.35 * Math.sin(f * Math.PI) + (cloNoise(x * 0.2, y * 0.2, 211) - 0.5) * 0.3);
      if (Math.abs(f - 0.5) > 0.46) col = col.map(k => k * 0.7);
      if (cloFbm(x * 0.1, y * 0.3, 221) > 0.6) col = cloMix(col, [76, 110, 52], 0.5);   // algae on the rim
      const sh = B.lit(Math.cos(ang) * r * 0.7, Math.sin(ang) * r * 0.7, Math.sqrt(Math.max(0.1, 1 - rC)));
      B.put(x, y, trtShade(col, sh, 0.32, 0.2, WATER));
    }
  }
  for (const [cx, cy] of [[-60, -66], [-94, 52], [-24, -54], [-120, -72]]) {   // barnacles on the rim
    for (let y = -2.2; y <= 2.2; y += B.q) for (let x = -2.2; x <= 2.2; x += B.q) {
      const r = Math.hypot(x, y); if (r > 2.2 || B.alpha(cx + x, cy + y) < 0.5) continue;
      B.put(cx + x, cy + y, (r < 0.8 ? [20, 26, 30] : r < 1.5 ? [222, 226, 214] : [146, 152, 142]));
    }
  }
  trtOutline(B, [10, 22, 38]);
  return B.done();
}
// a hind flipper seen from below: a broad paddle, root at the canvas origin (12, 34), pointing +x, scalloped trailing edge
function trtBakeFlipper() {
  const B = cloBuffer(96, 64, 12, 34, trtLight([0.15, -0.35, 0.92]), TRT_S), WATER = [40, 110, 150];
  for (let y = -33; y <= 29; y += B.q) for (let x = -11; x <= 83; x += B.q) {
    const u = (x + 6) / 86; if (u < 0 || u > 1) continue;
    const lead = -(7 + 13 * Math.pow(Math.min(1, u / 0.55), 0.7)) * (u > 0.6 ? Math.sqrt(Math.max(0, 1 - ((u - 0.6) / 0.4) ** 2)) : 1);
    const trail = (7 + 15 * Math.pow(Math.min(1, u / 0.5), 0.8)) * (u > 0.55 ? Math.sqrt(Math.max(0, 1 - ((u - 0.55) / 0.45) ** 2)) : 1)
      - (u > 0.3 ? Math.max(0, Math.sin(u * 40)) * 2.5 : 0);   // the scalloped trailing edge
    if (y < lead || y > trail) continue;
    const v = (y - (lead + trail) / 2) / Math.max(1, (trail - lead) / 2);
    const big = v < -0.25 || u > 0.75;   // big plates along the leading edge and the tip
    const H = trtHide(x + 200, y + 200, big ? 9 : 6, 251, [58, 62, 46], [176, 170, 136]);
    const sh = B.lit(H.nx * 0.5, H.ny * 0.5 + v * 0.6, Math.sqrt(Math.max(0, 1 - v * v)) + 0.35);
    let col = cloMix(H.col, [70, 74, 56], 0.3 + 0.3 * u);   // darker toward the tip
    if (v > 0.7) col = cloMix(col, [170, 170, 146], 0.35);   // the thin trailing edge, paler
    if (u < 0.12) col = cloMix(col, [150, 146, 122], 0.3);   // soft skin at the root
    B.put(x, y, trtShade(col, sh, 0.36, 0.22, WATER));
  }
  for (let k = 0; k < 2.6; k += B.q * 0.5) for (let w = -0.5; w <= 0.5; w += B.q) B.put(37 + k * 0.8 + w * 0.4, -17.6 - k + w * 0.3, k > 1.6 ? [150, 132, 92] : [232, 218, 176]);   // a claw
  trtOutline(B, [10, 22, 38]);
  return B.done();
}
// the cloaca: a swollen, puckered ring of folds, raw pink inside, gaping as wide as `gape` says
function drawTurtleCloaca(ctx, x, y, gape, t) {   // (in fine pixels, batched by colour: fineBatch, hires.js)
  const P = fineBatch(), q = 1 / ART_R, rx = 5 + gape * 5, ry = 4.5 + gape * 5, hole = 0.25 + gape * 0.45;
  for (let py = -ry - 1; py <= ry + 1; py += q) for (let px = -rx - 1; px <= rx + 1; px += q) {
    const r = cloLen(px / rx, py / ry); if (r > 1.08) continue;
    const a = Math.atan2(py, px), fold = Math.sin(a * 9 + r * 2);
    let c;
    if (r > 1) c = '#0a1626';
    else if (r < hole) c = r < hole * 0.6 ? '#12060a' : '#3a1a10';   // the dark opening, muck in it
    else if (r < hole + 0.18) c = fold > 0.2 ? '#e88a96' : '#a8404e';  // raw mucosa
    else {   // the swollen lips, folds lit from above
      const k = (0.72 + Math.max(0, fold) * 0.28) * (py < 0 ? 1.1 : 0.8);
      c = cloRgb([154 * k, 96 * k, 96 * k]);
      if (fold > 0.85 && py < 0) c = '#e8b0a8';
    }
    P(x + px + 0.5 - q / 2, y + py + 0.5 - q / 2, q, q, c);
  }
  P.flush(ctx);
  // a wet glint and a smear of what came out
  fEll(ctx, x - 1.5, y - ry + 1.6, 1.2, 0.5, '#ffe0e0'); fEll(ctx, x + rx - 0.5, y + 2.8, 1.2, 0.9, '#845023');
}

// ── the intro: the head coming up under him, mouth wide to the sky (origin: the middle of the mouth) ──
const TRT_HEAD = { ox: 206, oy: 156, w: 412, h: 260 };
const TRT_MOUTH_RX = 104, TRT_RIM = 13, TRT_MOUTHS = [52, 40, 30, 21, 13];
function trtBakeHead() {
  const L = trtLight([-0.35, -0.6, 0.72]), B = cloBuffer(TRT_HEAD.w, TRT_HEAD.h, TRT_HEAD.ox, TRT_HEAD.oy, L, TRT_S), SKY = [120, 170, 230];
  const head = (x, y) => { const u = x / 172, v = (y - 8) / 126; return u * u + v * v; };
  const neck = (x, y) => { const u = x / 128, v = (y - 104) / 70; return u * u + v * v; };
  const shell = (x, y) => { const u = x / 300, v = (y - 150) / 150; return u * u + v * v; };
  const SCUTES = [[0, 30, 0, -14], [-70, 44, 6, -10], [70, 44, -6, -10], [-150, 66, 10, -8], [150, 66, -10, -8], [-225, 100, 10, -8], [225, 100, -10, -8], [-110, 110], [110, 110], [0, 112]];
  for (let py = 0; py < B.H; py++) for (let px = 0; px < B.W; px++) {
    const x = px / B.S - TRT_HEAD.ox, y = py / B.S - TRT_HEAD.oy;
    const rH = head(x, y), rN = neck(x, y), rS = shell(x, y);
    if (rH < 1) {   // ── the head: big plates on top, smaller toward the jaws, pale underneath
      const u = x / 172, v = (y - 8) / 126;
      // the big plates on the crown give way to smaller scales along the borders of whole plates
      const P = trtCells(x + 400, y + 400, 26, 301), top = cloLen(P.px - 400, (P.py - 400 + 92) * 1.9) < 112;
      const size = y < 40 ? 11 + (1 - Math.abs(u)) * 3 : 7.5;
      const H = top ? trtSkin(x + 400, y + 400, 26, 301, [86, 92, 48], [196, 186, 120]) : trtSkin(x + 400, y + 400, size, 303, [74, 96, 54], [190, 190, 126]);
      let col = cloMix(H.col, [120, 132, 70], 0.25 + 0.2 * cloNoise(x * 0.02, y * 0.02, 305));   // (a living olive-green under the plates)
      if (y > 52) col = cloMix(col, [208, 192, 140], cloSmooth(52, 100, y) * 0.6);   // the paler throat
      let ao = 1;
      for (const s of [-1, 1]) { const e = cloLen((x - s * 138) / 30, (y + 24) / 24); if (e < 1.3) ao *= 0.4 + 0.6 * cloSmooth(0.75, 1.3, e); }   // eye sockets
      for (const s of [-1, 1]) { const n = cloLen((x - s * 13) / 4, (y + 92) / 2.6); if (n < 1) { col = n < 0.6 ? [20, 14, 10] : [110, 86, 50]; } }   // nostrils
      const sh = B.lit(u * 0.85 + H.nx * 0.5, v * 0.85 + H.ny * 0.5, Math.sqrt(Math.max(0.05, 1 - rH)) + 0.15);
      B.put(x, y, trtShade(col, sh, 0.3, 0.3, SKY).map(k => k * ao));
    } else if (rN < 1) {   // ── the neck: soft, folded, finely scaled
      const H = trtSkin(x + 400, y + 400, 6, 311, [76, 92, 54], [196, 190, 136]);
      const fold = Math.sin(y * 0.3 + Math.sin(x * 0.04) * 3);
      const sh = B.lit(x / 128 + H.nx * 0.4, (y - 104) / 70 + fold * 0.35, Math.sqrt(Math.max(0.05, 1 - rN)));
      B.put(x, y, trtShade(fold > 0.75 ? H.col.map(k => k * 0.65) : H.col, sh, 0.3, 0.15, SKY));
    } else if (rS < 1) {   // ── the carapace behind, its marginal rim saw-toothed
      const r = Math.sqrt(rS), ang = Math.atan2((y - 150) / 150, x / 300), seg = ang / 0.07, f = seg - Math.floor(seg);
      if (r > 1 - 0.03 * Math.abs(f - 0.5) * 2) continue;
      let col, seamD;
      if (r > 0.92) { col = cloMix([74, 42, 18], [156, 100, 46], 0.5 + 0.4 * Math.sin(f * Math.PI)); seamD = Math.abs(f - 0.5) > 0.45 ? 0 : (r - 0.92) * 150; }
      else { const S = trtScute(x, y, SCUTES, 331); col = S.col; seamD = S.seam; }
      if (seamD < 1.5) col = [38, 22, 12]; else if (seamD < 3) col = col.map(k => k * 1.25);
      const sh = B.lit(x / 300, (y - 150) / 150, Math.sqrt(Math.max(0.05, 1 - rS)));
      B.put(x, y, trtShade(col, sh, 0.3, 0.3, SKY));
    }
  }
  trtOutline(B, [20, 24, 40]);
  return B.done();
}
// The open mouth at one size (ry): the horn beak round it, the serrated cutting edge, the hooked tip of the
// upper jaw, and inside, a soft wet pink mouth with gentle folds and a tongue, down to the dark throat.
function trtBakeMouth(ry) {
  const W = (TRT_MOUTH_RX + TRT_RIM + 2) * 2 + 1, H = (ry + TRT_RIM + 2) * 2 + 1, ox = (W - 1) / 2, oy = (H - 1) / 2;
  const B = cloBuffer(W, H, ox, oy, trtLight([-0.35, -0.6, 0.72]), TRT_S);
  const ty = ry * 0.3, trx = TRT_MOUTH_RX * 0.42, try_ = Math.max(2, ry * 0.42);
  for (let y = -oy; y <= oy; y += B.q) for (let x = -ox; x <= ox; x += B.q) {
    const ang = Math.atan2(y / (ry + TRT_RIM), x / (TRT_MOUTH_RX + TRT_RIM));
    const serr = 1;   // (a smooth cutting edge: no little teeth)
    const rO = cloLen(x / (TRT_MOUTH_RX + TRT_RIM), (y + 2) / (ry + TRT_RIM - 1)), rI = cloLen(x / TRT_MOUTH_RX, y / ry);
    const hook = false;   // (a clean, smooth beak: no hooked tip in the close-up)
    if (rO <= 1 && (rI >= serr || hook)) {   // ── horn: yellowed and striated, darker at its edges, wet
      const t = hook ? 0.5 : clamp((rO - serr * TRT_MOUTH_RX / (TRT_MOUTH_RX + TRT_RIM)) / (1 - TRT_MOUTH_RX / (TRT_MOUTH_RX + TRT_RIM)), 0, 1);
      const stri = Math.sin(ang * 60 + cloNoise(x * 0.06, y * 0.06, 341) * 2) * 0.04;   // (faint striation in the horn)
      let col = cloMix([118, 88, 44], [214, 186, 112], Math.sin(t * Math.PI) * 0.8 + stri + (y < 0 ? 0.1 : -0.05));
      const nx = Math.cos(ang) * (t - 0.5) * 2, ny = Math.sin(ang) * (t - 0.5) * 2;
      const sh = B.lit(hook ? x / 12 : nx, hook ? 0.4 : ny, Math.sqrt(Math.max(0.1, 1 - nx * nx - ny * ny)));
      B.put(x, y, col.map(k => k * (0.35 + sh.dif * 0.85) + 255 * sh.spec * 0.55));
      continue;
    }
    if (rI >= 1) continue;
    // ── inside: polar coords around the throat, 0 at its centre, 1 at the lips
    const qx = x / trx, qy = (y - ty) / try_, rq = cloLen(qx, qy);
    if (rq < 1) {   // the throat: dark, fading softly into the red round it
      const k = cloSmooth(0.55, 1, rq);
      B.put(x, y, cloMix([10, 2, 6], [60, 10, 22], k * 0.7));
      continue;
    }
    const rho = clamp((rq - 1) / (1 / Math.max(0.01, rI) * rq - 1 || 1), 0, 1);   // 0 at the throat's edge, 1 at the lips
    const phi = Math.atan2(qy, qx);
    // the mouth: smooth wet pink, deepening to red down the throat, with soft folds running into it (no spikes)
    let col = cloMix([92, 20, 36], [236, 128, 140], Math.pow(rho, 0.8));
    const fold = Math.sin(phi * 9 + rho * 2.2) * 0.5 + 0.5;
    col = col.map(k => k * (0.86 + 0.14 * fold));
    if (y < -ry * 0.3 && rho > 0.45) col = cloMix(col, [255, 200, 206], cloSmooth(0.45, 0.95, rho) * 0.25 * (0.5 + 0.5 * Math.sin(x * 0.05)));   // a glossy palate
    if (y > ry * 0.42) {   // the tongue: a soft rounded pad, a groove down its middle, a shine on top
      const tq = cloLen(x / 50, (y - ry * 0.78) / Math.max(2, ry * 0.32));
      if (tq < 1) {
        col = cloMix([214, 104, 120], [252, 168, 176], 1 - tq * 0.7);
        if (Math.abs(x) < 1.4 && tq < 0.8) col = col.map(k => k * 0.82);
        if (cloLen((x + 12) / 16, (y - ry * 0.68) / Math.max(1, ry * 0.08)) < 1) col = cloMix(col, [255, 226, 230], 0.6);
      }
    }
    B.put(x, y, col.map(k => k * (0.7 + 0.3 * rho)));
  }
  return B.done();
}
// shut: the horn of both jaws meeting along a wavy, serrated line, the hook of the upper jaw over the lower
function trtBakeShut() {
  const B = cloBuffer(2 * (TRT_MOUTH_RX + TRT_RIM) + 5, 40, TRT_MOUTH_RX + TRT_RIM + 2, 20, trtLight([-0.35, -0.6, 0.72]), TRT_S);
  for (let y = -18; y <= 18; y += B.q) for (let x = -(TRT_MOUTH_RX + TRT_RIM); x <= TRT_MOUTH_RX + TRT_RIM; x += B.q) {
    const u = x / (TRT_MOUTH_RX + TRT_RIM), half = 15 * Math.sqrt(Math.max(0, 1 - u * u)); if (Math.abs(y) > half) continue;
    const line = Math.round(Math.sin(x * 0.06) * 1.5 + (Math.abs(x) < 10 ? 10 - Math.abs(x) : 0));   // the hook dips over the lower jaw
    const v = y / Math.max(1, half), stri = Math.sin(x * 1.2 + cloNoise(x * 0.1, y * 0.2, 361) * 3) * 0.1;
    let col = cloMix([118, 88, 44], [214, 186, 112], 0.55 + stri - Math.abs(v) * 0.4 + (y < line ? 0.1 : -0.05));
    if (Math.abs(y - line) < 0.45 || (Math.abs(y - line - 1) < 0.45 && (Math.floor(x) & 3) === 0)) col = [40, 26, 14];
    const sh = B.lit(u * 0.6, v * 0.8, Math.sqrt(Math.max(0.1, 1 - v * v)));
    B.put(x, y, col.map(k => k * (0.35 + sh.dif * 0.85) + 255 * sh.spec * 0.45));
  }
  trtOutline(B, [20, 24, 40]);
  return B.done();
}
// one eye, looking `look` (-1..1) toward him: dark and wet, a ring of lid folds, a tear at the corner
function trtBakeEye(side, look) {
  const B = cloBuffer(64, 52, 32, 26, trtLight([-0.35, -0.6, 0.72]), TRT_S);
  for (let y = -24; y <= 24; y += B.q) for (let x = -30; x <= 30; x += B.q) {
    const rl = cloLen(x / 28, (y + 1) / 23), re = cloLen(x / 19, y / 15);
    if (re < 1) {   // the eyeball: almost all iris, a little pale at the corners
      const ix = look * 6, ir = cloLen(x - ix, y + 1);
      let col = Math.abs(x - ix) > 13 ? [214, 196, 168] : ir < 6 ? [8, 6, 8] : cloMix([40, 26, 18], [120, 80, 40], cloSmooth(13, 6, ir) * (0.6 + 0.4 * Math.sin(Math.atan2(y, x - ix) * 18)));
      const sh = B.lit(x / 19, y / 15, Math.sqrt(Math.max(0, 1 - re * re)));
      col = col.map(k => k * (0.45 + sh.dif * 0.65) + 255 * Math.pow(sh.spec, 2) * 1.2);
      if (cloLen(x - ix + 5, y + 6) < 2.6) col = [255, 255, 255];   // the catchlight
      if (y < -9 + Math.abs(x) * 0.12) col = col.map(k => k * 0.45);   // shadow of the upper lid
      B.put(x, y, col);
    } else if (rl < 1) {   // the lids: thick, wrinkled skin in rings
      const H = trtHide(x + 200 + side * 50, y + 200, 4, 371, [62, 60, 36], [200, 184, 130]);
      const fold = Math.sin(rl * 22), sh = B.lit(x / 28 * 0.8 + H.nx * 0.4, (y + 1) / 23 * 0.8 + H.ny * 0.4 + fold * 0.3, 0.7);
      B.put(x, y, trtShade(fold > 0.6 ? H.col.map(k => k * 0.7) : H.col, sh, 0.3, 0.2));
    }
  }
  for (let i = 0; i < 4; i += B.q) for (let w = -0.4; w <= 0.4; w += B.q) B.put(side * 17 + w, 6 + i, [200, 236, 255], 0.8 - i * 0.15);   // a salt tear
  trtOutline(B, [20, 24, 40]);
  return B.done();
}
// Prepare the pictures ahead of time (gutPaintAhead, gut.js): the intro's at load; the boss's and the sea finale's in the
// black of the drop into the vault.
function trtPrebakeIntro() {
  cloArt('trtHead', trtBakeHead); cloArt('trtShut', trtBakeShut);
  for (const r of TRT_MOUTHS) cloArt('trtMouth' + r, () => trtBakeMouth(r));
}
function trtPrebakeFinale() {
  cloArt('trtRear', trtBakeRear); cloArt('trtFlipper', trtBakeFlipper);
  for (const f of [1, -1]) {   // (the boss: cloacolith-art.js)
    cloArt('body' + f, () => cloBakeBody(f));
    for (const panic of [false, true]) cloArt('brow' + f + panic, () => cloBakeBrows(f, panic));
  }
  cloArt('anchor', cloBakeAnchor); cloArt('wreck', cloBakeWreck);
}
