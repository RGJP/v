'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 3-4's boss, CLOACOLITH: how he looks (his behaviour is in gut-vault.js).
//   Years of junk the turtle couldn't digest -- driftwood, a bottle, shells, barnacles, mussels, rope, a scrap of
//   net, fishing hooks and line -- packed into one lump and glued with acidic mucus. The mass is painted once, pixel
//   by pixel, with real lighting (a height field lit from the upper left, crease shadows, a warm rim from the
//   vault's flesh, glossy slime) and kept as a picture per facing (the light stays on the same side when he turns).
//   Everything that moves -- the eyes, the snarling maw of broken shell and glass, drips, acid bubbles, the battery
//   in his rear and its puckered socket -- is drawn live on top. Body frame: facing +x, origin at his centre,
//   the floor at y = 21.
// ═══════════════════════════════════════════════════════════════════════════
const CLO_ART = new Map();
const CLO_W = 104, CLO_H = 84, CLO_OX = 52, CLO_OY = 48;   // the baked picture, and where his centre sits in it
const CLO_EYES = [[7, -5, 3.2, 2.6], [16, -4, 2.6, 2.3]];  // x, y, eyeball rx, ry (the far eye is smaller)
const CLO_MOUTH = { x0: 3, x1: 21, y: 5 };

// value noise, seeded per layer
function cloHash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function cloNoise(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = cloHash(ix, iy, s), b = cloHash(ix + 1, iy, s), c = cloHash(ix, iy + 1, s), d = cloHash(ix + 1, iy + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function cloFbm(x, y, s) { return cloNoise(x, y, s) * 0.55 + cloNoise(x * 2.1, y * 2.1, s + 7) * 0.3 + cloNoise(x * 4.3, y * 4.3, s + 13) * 0.15; }
function cloLen(a, b, c = 0) { return Math.sqrt(a * a + b * b + c * c); }   // (Math.hypot is slow in the hot loops)
const cloSmooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const cloMix = (c0, c1, f) => [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
const cloRgb = c => `rgb(${Math.round(clamp(c[0], 0, 255))},${Math.round(clamp(c[1], 0, 255))},${Math.round(clamp(c[2], 0, 255))})`;

// A pixel buffer in body coordinates, with "over" blending and lighting helpers.
// S: how many art pixels to a game pixel (ART_R paints it fine: loop over it in steps of B.q, a 1/S of a game px)
function cloBuffer(w, h, ox, oy, light, S = 1) {
  const W = Math.round(w * S), H = Math.round(h * S), c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data;
  const B = {
    c, w, h, ox, oy, d, L: light, S, q: 1 / S, W, H,
    put(bx, by, col, a = 1) {
      const px = Math.round((bx + ox) * S), py = Math.round((by + oy) * S);
      if (px < 0 || py < 0 || px >= W || py >= H || a <= 0) return;
      const i = (py * W + px) * 4, ba = d[i + 3] / 255, na = a + ba * (1 - a);
      for (let k = 0; k < 3; k++) d[i + k] = (clamp(col[k], 0, 255) * a + d[i + k] * ba * (1 - a)) / (na || 1);
      d[i + 3] = na * 255;
    },
    alpha(bx, by) { const px = Math.round((bx + ox) * S), py = Math.round((by + oy) * S); return px < 0 || py < 0 || px >= W || py >= H ? 0 : d[(py * W + px) * 4 + 3] / 255; },
    // diffuse + specular for a normal (nx, ny, nz), the camera looking down -z
    lit(nx, ny, nz, power = 16) {
      const l = cloLen(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const [lx, ly, lz] = light, dif = Math.max(0, nx * lx + ny * ly + nz * lz);
      const rz = 2 * dif * nz - lz, spec = Math.pow(Math.max(0, rz), power);
      return { dif, spec, nx, ny, nz };
    },
    done() {   // fine (painted coarser than the screen: brought up to it smoothly, once), or lifted to the fine screen (hires.js)
      x.putImageData(img, 0, 0);
      if (S <= 1) return smoothUp(c);
      if (S === ART_R) return hiRes(c, S);
      const up = makeCanvas(Math.round(w * ART_R), Math.round(h * ART_R)), ug = up.getContext('2d');
      ug.imageSmoothingEnabled = true; ug.imageSmoothingQuality = 'high'; ug.drawImage(c, 0, 0, up.width, up.height);
      return hiRes(up, ART_R);
    },
  };
  return B;
}
const cloLight = flip => { const v = [-0.55 * flip, -0.72, 0.6], l = cloLen(...v); return v.map(k => k / l); };

// A rod (log, bottle, shank) from (x0,y0) to (x1,y1): shaded as a cylinder; paint(u along, v across -1..1, light) -> [col, a]
function cloRod(B, x0, y0, x1, y1, r, paint, r1 = r) {
  const dx = x1 - x0, dy = y1 - y0, len = cloLen(dx, dy), ux = dx / len, uy = dy / len;
  const minx = Math.floor(Math.min(x0, x1) - Math.max(r, r1) - 1), maxx = Math.ceil(Math.max(x0, x1) + Math.max(r, r1) + 1);
  const miny = Math.floor(Math.min(y0, y1) - Math.max(r, r1) - 1), maxy = Math.ceil(Math.max(y0, y1) + Math.max(r, r1) + 1);
  for (let y = miny; y <= maxy; y += B.q) for (let x = minx; x <= maxx; x += B.q) {
    const px = x - x0, py = y - y0, along = px * ux + py * uy, across = -px * uy + py * ux;
    if (along < -0.5 || along > len + 0.5) continue;
    const u = along / len, rr = r + (r1 - r) * clamp(u, 0, 1);
    if (Math.abs(across) > rr) continue;
    const v = across / rr, nz = Math.sqrt(Math.max(0, 1 - v * v));
    const sh = B.lit(-uy * v, ux * v, nz);
    const out = paint(u, v, sh, along, x, y);
    if (out) B.put(x, y, out[0], out[1] === undefined ? 1 : out[1]);
  }
}

// ── the mass ────────────────────────────────────────────────────────────────
const CLO_LUMPS = [[0, 2, 21, 19], [-9, -9, 12, 11], [7, -10, 12, 10], [-14, 8, 9, 10], [13, 9, 10, 10], [1, 13, 13, 9], [18, -2, 5, 7]];

function cloBakeBody(flip) {
  const S = ART_R, L = cloLight(flip), B = cloBuffer(CLO_W, CLO_H, CLO_OX, CLO_OY, L, S);   // (painted fine: hires.js)
  const W = B.W, H = B.H, Hf = new Float32Array(W * H), F = new Float32Array(W * H), F2 = new Float32Array(W * H);
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const x = px / S - CLO_OX, y = py / S - CLO_OY;
    let f1 = -9, f2 = -9;
    for (const [cx, cy, rx, ry] of CLO_LUMPS) {
      const f = 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2;
      if (f > f1) { f2 = f1; f1 = f; } else if (f > f2) f2 = f;
    }
    const edge = f1 + (cloFbm(x * 0.13, y * 0.13, 3) - 0.5) * 0.22 + (cloNoise(x * 0.6, y * 0.6, 4) - 0.5) * 0.05;
    F[py * W + px] = y <= 21 ? edge : -1; F2[py * W + px] = f2;
    // the dome of each lump, with lumpy grit on top
    Hf[py * W + px] = Math.sqrt(Math.max(0, edge)) * 15 + cloFbm(x * 0.3, y * 0.3, 5) * 2.2 + cloNoise(x * 1.1, y * 1.1, 9) * 0.5;
  }
  const at = (px, py) => Hf[clamp(py, 0, H - 1) * W + clamp(px, 0, W - 1)];
  const MUD0 = [40, 38, 22], MUD1 = [110, 100, 62], KELP0 = [34, 46, 18], KELP1 = [84, 104, 34];
  const SLIME0 = [64, 96, 16], SLIME1 = [146, 190, 40], RIM = [255, 150, 130];
  for (let py = 1; py < H - 1; py++) for (let px = 1; px < W - 1; px++) {
    const f = F[py * W + px]; if (f <= 0) continue;
    const x = px / S - CLO_OX, y = py / S - CLO_OY;
    const sh = B.lit(-(at(px + 1, py) - at(px - 1, py)) * 0.5 * S, -(at(px, py + 1) - at(px, py - 1)) * 0.5 * S, 1);
    // what this bit of him is made of: compost and grit, streaks of rotten kelp, and a coat of acid slime over it all
    const m = cloFbm(x * 0.14, y * 0.14, 11);
    let col = cloMix(MUD0, MUD1, m);
    const grit = cloHash(px, py, 17);
    if (grit > 0.93) col = cloMix(col, [150, 136, 112], 0.6); else if (grit < 0.06) col = cloMix(col, [16, 10, 8], 0.6);
    const kelp = cloFbm(x * 0.09 + y * 0.05, y * 0.32, 23);
    if (kelp > 0.6) col = cloMix(KELP0, KELP1, cloSmooth(0.6, 0.75, kelp) * (0.4 + 0.6 * cloNoise(x * 0.8, y * 0.8, 29)));
    const slime = cloSmooth(0.6, 0.7, cloFbm(x * 0.11 + 40, y * 0.11, 31) + (y < -8 ? 0.08 : 0) + cloFbm(x * 0.5, y * 0.07, 37) * 0.16);
    if (slime > 0) col = cloMix(col, cloMix(SLIME0, SLIME1, cloFbm(x * 0.3, y * 0.3, 41)), slime * 0.7);
    // light: the creases between lumps and the underside fall into shadow, the far edge picks up the vault's red glow
    const crease = cloSmooth(0.22, 0, F[py * W + px] - Math.max(0, F2[py * W + px])) * cloSmooth(-0.2, 0.15, F2[py * W + px]);
    let ao = (0.5 + 0.5 * cloSmooth(0, 0.35, f)) * (1 - crease * 0.55) * (y > 14 ? 1 - (y - 14) * 0.03 : 1);
    for (const [ex, ey, rx, ry] of CLO_EYES) {   // deep sockets for his eyes
      const e = cloLen((x - ex) / (rx + 1.6), (y - ey) / (ry + 1.5));
      if (e < 1.7) ao *= 0.18 + 0.82 * cloSmooth(0.85, 1.7, e);
    }
    { const e = cloLen((x - 12.5) / 9.5, (y - CLO_MOUTH.y - 1) / 4.5); if (e < 1.4) ao *= 0.45 + 0.55 * cloSmooth(0.7, 1.4, e); }
    const rim = Math.pow(1 - sh.nz, 1.6) * Math.max(0, -(sh.nx * L[0] + sh.ny * L[1]) * 1.3 + 0.25);
    const gloss = 0.15 + slime * 1.1;
    col = col.map((c, k) => c * (0.27 + sh.dif * 1.05) * ao + RIM[k] * rim * 0.55 + 255 * sh.spec * gloss * 0.55 * (k === 2 ? 0.75 : 1));
    B.put(x, y, col);
  }
  cloBakeJunk(B);
  // more mucus running down over the junk, and the dark rim that seats him on the screen
  for (let py = 1; py < H - 1; py++) for (let px = 1; px < W - 1; px++) {
    const x = px / S - CLO_OX, y = py / S - CLO_OY;
    if (B.alpha(x, y) < 0.5) continue;
    const run = cloFbm(x * 0.55, y * 0.05 - 3, 43), sheet = cloSmooth(0.7, 0.76, run) * cloSmooth(-24, -8, y) * cloSmooth(20, 8, y);
    if (sheet > 0) B.put(x, y, cloMix([110, 160, 30], [210, 250, 120], cloSmooth(0.74, 0.8, run)), sheet * 0.5);
  }
  for (let pass = 0; pass < 2; pass++) {   // the dark rim that seats him: two art pixels
    const solid = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) solid[i] = B.d[i * 4 + 3] > 128 ? 1 : 0;
    for (let py = 1; py < H - 1; py++) for (let px = 1; px < W - 1; px++) {
      if (solid[py * W + px]) continue;
      if (solid[py * W + px - 1] || solid[py * W + px + 1] || solid[(py - 1) * W + px] || solid[(py + 1) * W + px]) B.put(px / S - CLO_OX, py / S - CLO_OY, [22, 10, 16]);
    }
  }
  return B.done();
}

// the junk packed into him, each piece lit like the rest
function cloBakeJunk(B) {
  // a bleached driftwood log jammed in across his back, splintered at the end; a waterlogged branch under it
  const wood = (pale, dark, seed) => (u, v, sh, along, x, y) => {
    const grain = Math.sin(along * 0.9 + cloNoise(along * 0.3, v * 3, seed) * 5 + v * 2.2);
    let c = cloMix(dark, pale, 0.45 + 0.35 * grain * 0.5 + cloNoise(along * 0.4, v * 4, seed + 1) * 0.3);
    if (Math.abs(grain) > 0.93) c = cloMix(c, [40, 30, 24], 0.45);   // the cracks along the grain
    if (u > 0.92 && cloHash(x, y, seed) < (u - 0.92) * 9) return null;   // splinters
    return [c.map(k => k * (0.3 + sh.dif * 0.85) + 255 * sh.spec * 0.12)];
  };
  cloRod(B, -27, -6, -3, -20, 3.4, wood([196, 182, 158], [104, 90, 74], 51), 2.6);
  cloRod(B, -26, 14, -7, 18, 2.3, wood([128, 92, 58], [56, 38, 24], 53), 1.8);
  cloRod(B, -17, 16, -21, 22, 1.2, wood([128, 92, 58], [56, 38, 24], 55));
  // a green glass bottle, buried neck-up, with a cork
  cloRod(B, 3, -11, -2, -23, 3.6, (u, v, sh) => {
    if (u > 0.72) return null;
    const edge = Math.abs(v) > 0.7 ? 0.55 : 0;
    return [[40 + edge * 30, 100 + edge * 30, 64 + edge * 10].map(k => k * (0.55 + sh.dif * 0.6) + 255 * sh.spec * 1.1), 0.88];
  });
  cloRod(B, -0.5, -19, -3.4, -28, 1.6, (u, v, sh) => [[54, 128, 80].map(k => k * (0.55 + sh.dif * 0.6) + 255 * sh.spec), 0.9]);
  cloRod(B, -3.2, -27.5, -4, -30, 1.7, (u, v, sh) => [[168, 120, 76].map(k => k * (0.45 + sh.dif * 0.7))]);
  // a whelk shell, apex up and back, its pink mouth to the front
  {
    const ax = -11, ay = -1, bx = -1, by = -6, len = cloLen(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len;
    for (let y = -14; y <= 6; y += B.q) for (let x = -16; x <= 4; x += B.q) {
      const along = (x - ax) * ux + (y - ay) * uy, across = -(x - ax) * uy + (y - ay) * ux, u = along / len;
      if (u < 0 || u > 1.05) continue;
      const rr = 0.6 + 4.6 * Math.sqrt(clamp(u, 0, 1)), v = across / rr;
      if (Math.abs(v) > 1) continue;
      const sh = B.lit(-uy * v, ux * v, Math.sqrt(1 - v * v));
      const whorl = Math.sin(u * 22 - v * 2.5);
      let c = whorl > 0.55 ? [134, 82, 52] : cloMix([222, 204, 170], [196, 170, 130], cloNoise(x, y, 61));
      if (whorl > 0.3 && whorl <= 0.55) c = [80, 52, 36];
      if (u > 0.82 && v > -0.2) c = cloMix([238, 150, 140], [255, 214, 196], (v + 0.2) / 1.2);   // the glossy aperture
      B.put(x, y, c.map(k => k * (0.3 + sh.dif * 0.85) + 255 * sh.spec * 0.7));
    }
  }
  // a scallop, wedged in under his chin, ribbed and banded
  {
    const hx = -8, hy = 20;
    for (let y = 10; y <= 21; y += B.q) for (let x = -17; x <= 1; x += B.q) {
      const dx = x - hx, dy = hy - y, r = cloLen(dx, dy), a = Math.atan2(dx, dy);
      if (r > 8.5 || Math.abs(a) > 1.05 || dy < 0) continue;
      if (r > 7.5 && Math.cos(a * 15) < 0) continue;   // the scalloped rim
      const rib = Math.cos(a * 15), sh = B.lit(Math.sin(a) * 0.5 + rib * 0.35 * Math.cos(a), -0.6, 0.8);
      let c = cloMix([214, 126, 84], [244, 214, 176], 0.5 + 0.5 * Math.sin(r * 1.6));
      if (r < 2) c = [180, 150, 120];
      B.put(x, y, c.map(k => k * (0.35 + sh.dif * 0.8) * (0.85 + rib * 0.15) + 255 * sh.spec * 0.4));
    }
  }
  // a hemp rope that binds the lot, twisted, wound round his middle
  for (let i = 0; i <= 60; i += B.q * 0.5) {
    const u = i / 60, x = -21 + u * 30, y = 9 + Math.sin(u * 2.6) * 3 + u * 6;
    const nx = -Math.cos(u * 2.6) * 0.3, ny = 1;
    for (let k = -1.6; k <= 1.6; k += B.q * 0.7) {
      const sx = x + nx * k * 0.2, sy = y + k, v = k / 1.6, sh = B.lit(0, v, Math.sqrt(1 - v * v));
      const twist = Math.sin(i * 1.4 + k * 2.2);
      const c = cloMix([96, 70, 40], [204, 170, 110], 0.55 + twist * 0.35);
      B.put(sx, sy, c.map(q => q * (0.35 + sh.dif * 0.8)));
    }
  }
  // a scrap of fishing net over his lower back
  for (let y = 0; y <= 20; y += B.q) for (let x = -24; x <= -4; x += B.q) {
    if (cloLen((x + 15) / 8, (y - 13) / 6) > 1 || B.alpha(x, y) < 0.9) continue;
    const a = ((x + y) % 5 + 5) % 5, b = ((x - y) % 5 + 5) % 5, on = v => v < 0.5 || v > 4.75;
    if (on(a) || on(b)) B.put(x, y, on(a) && on(b) ? [24, 30, 26] : [104, 116, 96], 0.45);
  }
  // barnacles crusted on the log, the top and the base
  for (const [cx, cy] of [[-17, -12], [-14, -14], [-19, -10], [9, -19], [-22, 5]]) {
    for (let y = -2; y <= 2; y += B.q) for (let x = -2; x <= 2; x += B.q) {
      const r = cloLen(x, y); if (r > 1.9) continue;
      const sh = B.lit(x * 0.4, y * 0.4, 1);
      const c = r < 0.7 ? [30, 26, 22] : r < 1.3 ? [222, 216, 198] : [150, 142, 126];
      B.put(cx + x, cy + y, c.map(k => k * (0.4 + sh.dif * 0.75)));
    }
  }
  // fishing hooks stuck in him, and the line they trail across the mass
  const steel = (u, v, sh) => [cloMix([96, 106, 124], [236, 244, 255], 0.3 + sh.dif * 0.6).map(k => k + 255 * sh.spec * 0.8)];
  for (const [hx, hy, s] of [[-20, -13, -1], [4, -20, 1], [20, -12, 1], [-21, 17, -1]]) {
    cloRod(B, hx, hy - 4, hx, hy + 0.6, 0.42, steel);                          // the shank
    for (let a = 0; a <= Math.PI; a += 0.12) B.put(hx + s * (1 - Math.cos(a)), hy + 0.6 + Math.sin(a) * 1.1, [200, 210, 226]);   // the bend...
    cloRod(B, hx + 2 * s, hy + 0.6, hx + 2 * s, hy - 1.4, 0.38, steel);        // ...up to the point
    cloRod(B, hx + 2 * s, hy - 1.4, hx + 1.3 * s, hy - 0.6, 0.3, steel);       // the barb
    for (let a = 0; a < Math.PI * 2; a += 0.3) B.put(hx + Math.cos(a) * 0.6, hy - 4.5 + Math.sin(a) * 0.6, [60, 64, 76]);   // the eye
  }
  for (const [x0, y0, x1, y1] of [[-20, -13, 4, -20], [4, -20, 20, -12]]) {   // the line they trail
    for (let i = 0; i <= 160; i++) { const u = i / 160, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * 4; if (B.alpha(x, y) > 0.9) B.put(x, y, [220, 230, 236], 0.4); }
  }
}

// heavy driftwood brows: an angry V, or raised in a panic
function cloBakeBrows(flip, panic) {
  const B = cloBuffer(40, 24, 8, 16, cloLight(flip), ART_R);
  const wood = (u, v, sh, along, x, y) => {
    const grain = Math.sin(along * 1.3 + v * 2);
    const c = cloMix([96, 76, 56], [206, 188, 160], 0.5 + grain * 0.22);
    return [c.map(k => k * (0.3 + sh.dif * 0.9) + 255 * sh.spec * 0.15)];
  };
  if (panic) { cloRod(B, 1, -11, 10, -13, 1.6, wood); cloRod(B, 13, -12, 21, -10, 1.4, wood); }
  else { cloRod(B, -1, -14, 10, -7, 2.2, wood, 1.6); cloRod(B, 22, -12, 13, -7, 1.9, wood, 1.4); }
  // a shadow under each: they overhang the sockets
  const d = B.d;
  for (let py = B.H - 1; py > 0; py--) for (let px = 0; px < B.W; px++) {
    const i = (py * B.W + px) * 4, up = ((py - 1) * B.W + px) * 4;
    if (d[i + 3] < 128 && d[up + 3] > 200) { d[i] = 10; d[i + 1] = 4; d[i + 2] = 8; d[i + 3] = 230; }
  }
  return B.done();
}

function cloArt(key, make) { let a = CLO_ART.get(key); if (!a) CLO_ART.set(key, a = make()); return a; }

// the iron anchor he swings and throws: rusted, barnacled, a strand of kelp hanging from the stock
function cloBakeAnchor() {
  const B = cloBuffer(30, 32, 15, 15, cloLight(1), ART_R);
  const iron = (u, v, sh, along, x, y) => {
    const rust = cloFbm(x * 0.35, y * 0.35, 71), pit = cloHash(x, y, 73);
    let c = cloMix([58, 64, 76], [112, 120, 134], 0.5);
    if (rust > 0.55) c = cloMix([96, 46, 22], [176, 98, 44], cloNoise(x * 0.9, y * 0.9, 75));
    if (pit > 0.9) c = cloMix(c, [20, 16, 18], 0.6);
    return [c.map(k => k * (0.3 + sh.dif * 0.85) + 255 * sh.spec * (rust > 0.55 ? 0.15 : 0.6))];
  };
  cloRod(B, 0, -8, 0, 6, 1.7, iron);                                   // the shank
  for (let y = -13; y <= -7; y += B.q) for (let x = -4; x <= 4; x += B.q) {        // the ring
    const r = cloLen(x, (y + 10.5) * 1.1); if (r < 1.3 || r > 3.1) continue;
    const n = (r - 2.2) / 0.9, sh = B.lit(x / r * n, (y + 10.5) / r * n, Math.sqrt(Math.max(0, 1 - n * n)));
    const out = iron(0, 0, sh, 0, x, y); B.put(x, y, out[0]);
  }
  cloRod(B, -7, -5.5, 7, -5.5, 1.5, (u, v, sh, along, x, y) => [cloMix([70, 50, 32], [150, 116, 78], 0.5 + Math.sin(along * 1.1 + v) * 0.25).map(k => k * (0.3 + sh.dif * 0.85))]);   // the wooden stock
  for (let y = -2; y <= 9; y += B.q) for (let x = -12; x <= 12; x += B.q) {     // the crown's arc and its spade flukes
    const r = cloLen(x, y + 6), band = (r - 11.5) / 1.8, tip = Math.abs(x) > 7.5 && y < 4 && cloLen(Math.abs(x) - 9.5, y - 0.5) < 2.9;
    if (y < -1 && !tip) continue;
    if (Math.abs(band) > 1 && !tip) continue;
    const n = tip ? 0.2 : band, sh = B.lit(x / r * n, (y + 6) / r * n, Math.sqrt(Math.max(0, 1 - n * n)));
    B.put(x, y, iron(0, 0, sh, 0, x, y)[0]);
  }
  for (const [cx, cy] of [[-4, 5], [3, 6], [6, 4]]) for (let y = -1.2; y <= 1.2; y += B.q) for (let x = -1.2; x <= 1.2; x += B.q) {   // barnacles
    const r = cloLen(x, y); if (r > 1.2) continue;
    B.put(cx + x, cy + y, r > 0.5 ? [210, 204, 186] : [40, 34, 30]);
  }
  for (let i = 0; i < 9; i += B.q * 0.5) for (let k = -0.4; k <= 0.4; k += B.q) B.put(-5 + Math.sin(i * 0.8) + k, -4 + i, (i % 3) < 2 ? [70, 110, 30] : [130, 170, 50]);   // a strand of kelp
  return B.done();
}

// what's left after the battery blows: driftwood, the bottle on its side, a shell, and the burst battery's empty can
function cloBakeWreck() {
  const B = cloBuffer(64, 16, 32, 14, cloLight(1), ART_R);
  const wood = (u, v, sh, along) => [cloMix([96, 80, 64], [196, 182, 158], 0.5 + Math.sin(along * 0.9 + v * 2) * 0.25).map(k => k * (0.3 + sh.dif * 0.85))];
  cloRod(B, -26, -3, -6, -1, 2.2, wood, 1.8);
  cloRod(B, 4, -6, 16, -3, 1.5, (u, v, sh) => [[60, 44, 30].map(k => k * (0.4 + sh.dif * 0.8))]);
  cloRod(B, -4, -3, 6, -2, 2.6, (u, v, sh) => [[40, 100, 64].map(k => k * (0.55 + sh.dif * 0.6) + 255 * sh.spec), 0.9]);
  cloRod(B, 6, -2, 10, -2, 1.2, (u, v, sh) => [[54, 128, 80].map(k => k * (0.55 + sh.dif * 0.6) + 255 * sh.spec), 0.9]);
  cloRod(B, -14, -2, -9, -2, 2.4, (u, v, sh) => [(u < 0.25 ? [180, 130, 70] : [70, 76, 72]).map(k => k * (0.35 + sh.dif * 0.8) + 255 * sh.spec * 0.5)]);   // the battery's shell
  for (let y = -5; y <= 0; y += B.q) for (let x = 18; x <= 25; x += B.q) {   // a scallop, upturned
    const r = cloLen(x - 21.5, (y + 0.5) * 1.3); if (r > 4) continue;
    B.put(x, y, cloMix([214, 126, 84], [244, 214, 176], 0.5 + 0.5 * Math.cos((x - 21.5) * 2)).map(k => k * (0.6 + (y + 5) * -0.05 + 0.3)));
  }
  for (const [x, y] of [[-20, -6], [0, -6], [12, -7]]) { cloRod(B, x, y, x, y + 1.6, 0.4, (u, v, sh) => [[160 + sh.dif * 80, 170 + sh.dif * 80, 190 + sh.dif * 60]]); for (let a = 0; a <= Math.PI; a += 0.15) B.put(x + 1 - Math.cos(a), y + 1.6 + Math.sin(a) * 0.9, [150, 160, 178]); }   // hooks
  for (let i = 0; i < B.W * B.H; i++) if (B.d[i * 4 + 3] > 0) B.d[i * 4 + 3] = 255;
  return B.done();
}

// A splat of his slime, thrown when the battery blew: a glossy, translucent blob with bits of junk in it, flung
// spatter streaks and droplets pointing away from the blast (`ang`), or for the floor a flat puddle with a splashed
// rim. Origin at the canvas centre (r * 3 + 4 across).
function cloBakeSplat(r, floor, ang, seed) {
  const S = Math.ceil(r * 4.4) + 4, O = S >> 1, B = cloBuffer(S, S, O, O, cloLight(1), ART_R), rng = mulberry32(seed);
  const sy = floor ? 0.3 : 0.9;   // a puddle lies flat
  const p1 = rng() * 6, p2 = rng() * 6, k1 = 3 + Math.floor(rng() * 3), k2 = 7 + Math.floor(rng() * 4);
  const edge = a => r * (0.78 + 0.12 * Math.sin(a * k1 + p1) + 0.07 * Math.sin(a * k2 + p2) + 0.08 * (cloNoise(Math.cos(a) * 2 + 9, Math.sin(a) * 2, seed) - 0.5) * 2);
  const tongues = [], drops = [], away = () => floor ? (rng() < 0.5 ? 0 : Math.PI) + (rng() - 0.5) * 0.9 : ang + (rng() - 0.5) * 2.2;
  for (let i = 0, n = 2 + Math.floor(rng() * 3); i < n; i++) tongues.push([away(), r * (0.35 + rng() * 0.5), r * (0.2 + rng() * 0.14)]);   // splash tongues: thick, tapering
  for (let i = 0, n = 5 + Math.floor(rng() * 5); i < n; i++) { const a = away(), dd = r * (1.15 + rng() * 0.85); drops.push([Math.cos(a) * dd, Math.sin(a) * dd, 0.7 + rng() * (r > 8 ? 1.4 : 0.9)]); }   // flung droplets
  const BODY = [112, 156, 38], DEEP = [56, 86, 20], JUNK = [96, 64, 30];
  const hx = -r * 0.32, hy = -r * 0.36;   // where the wet glint sits
  for (let y = -O; y < O; y += B.q) for (let x = -O; x < O; x += B.q) {
    const ex = x, ey = y / sy, d = cloLen(ex, ey), a = Math.atan2(ey, ex);
    let q = d / edge(a);
    for (const [ta, len, w] of tongues) {
      const ux = Math.cos(ta), uy = Math.sin(ta), along = ex * ux + ey * uy - r * 0.55, across = Math.abs(-ex * uy + ey * ux);
      if (along > 0 && along < len) q = Math.min(q, across / (w * (1 - along / len * 0.55)) * 0.9);   // (blunt, rounded ends)
      else if (along >= len) q = Math.min(q, cloLen(along - len, across) / (w * 0.45) * 0.9);
    }
    let drop = 0;
    for (const [dx, dy, dr] of drops) { const dd = cloLen(ex - dx, ey - dy); if (dd < dr) drop = Math.max(drop, 1 - dd / dr); }
    if (q >= 1 && !drop) continue;
    const h = q < 1 ? 1 - q * q : drop;   // thickness: the slime is thin at its edges, it shows the wall through
    let col = cloMix(DEEP, BODY, cloSmooth(0.1, 0.8, h) * (0.7 + 0.3 * cloFbm(x * 0.3, y * 0.3, seed + 3)));
    if (q < 0.7 && cloHash(x, y, seed + 5) > 0.975) col = JUNK;   // flecks of junk
    const bub = cloFbm(x * 0.45, y * 0.45, seed + 7);
    if (q < 0.75 && bub > 0.72) col = cloMix(col, [196, 226, 110], 0.4);   // trapped bubbles
    const g1 = cloLen(x - hx, (y - hy * sy) / sy) / Math.max(1.6, r * 0.24), g2 = cloLen(x - hx - r * 0.3, (y - hy * sy * 0.3) / sy) / Math.max(1, r * 0.12);
    if (q < 1 && g1 < 1) col = cloMix(col, [244, 255, 210], Math.min(1, (1 - g1) * 1.6));   // the wet glint
    else if (q < 1 && g2 < 1) col = cloMix(col, [236, 255, 190], (1 - g2) * 0.6);
    if (drop > 0.45 && q >= 1) col = cloMix(col, [210, 240, 140], 0.4);
    B.put(x, y, col, 0.5 + h * 0.42);
  }
  // a darker meniscus where the slime meets the wall
  const d = B.d;
  const SW = B.W, SH = B.H;
  for (let i = 0; i < SW * SH; i++) if (d[i * 4 + 3] > 0) {
    const x = i % SW, y = (i / SW) | 0, open = (xx, yy) => xx < 0 || yy < 0 || xx >= SW || yy >= SH || d[(yy * SW + xx) * 4 + 3] === 0;
    if (open(x - 1, y) || open(x + 1, y) || open(x, y - 1) || open(x, y + 1)) { d[i * 4] *= 0.5; d[i * 4 + 1] *= 0.6; d[i * 4 + 2] *= 0.45; d[i * 4 + 3] = 200; }
  }
  return B.done();
}

// ── live parts (in fine pixels, batched by colour: fineBatch, hires.js) ─────
// The eyes: bloodshot, sunk deep, glowing (hot orange once he's overcharged); `look`: 'angry' | 'panic' | 'dizzy' | 'shut' | 'squint'
function cloDrawEyes(ctx, look, phase, t) {
  const B = fineBatch(), q = 1 / ART_R;
  const hot = phase === 3, iris = hot ? ['#ff8a1a', '#ffd070'] : phase === 2 ? ['#e8401c', '#ffa040'] : ['#c81e1e', '#ff7040'];
  CLO_EYES.forEach(([ex, ey, rx, ry], n) => {
    if (look === 'shut' || look === 'squint') {   // a lid line, and for the squint a glint of iris under it
      ctx.strokeStyle = '#0c0408'; ctx.lineWidth = 0.8; ctx.beginPath();
      for (let x = -rx; x <= rx; x += q) ctx.lineTo(ex + x + 0.5, ey + 0.5 + (look === 'shut' ? 0 : -1) + Math.abs(x) * 0.35);
      ctx.stroke();
      if (look === 'squint') { fEll(ctx, ex + 0.5, ey + 0.6, 1.5, 0.45, iris[0]); fBlob(ctx, ex + 0.5, ey + 0.5, 0.35, iris[1]); }
      return;
    }
    const big = look === 'panic' ? 1.25 : 1, erx = rx * big, ery = ry * big;
    fGlow(ctx, ex + 0.5, ey + 0.5, erx + 4, hot ? '#ff9a30' : '#ff5030', hot ? 0.45 : 0.3);   // a soft glow in the socket (steady)
    const cutAt = x => -ery * 0.1 + (n === 0 ? x : -x) * 0.55 - 0.3;   // angry: the inner top of each eye cut away by the lid
    for (let y = -ery; y <= ery; y += q) for (let x = -erx; x <= erx; x += q) {
      const d = (x / erx) ** 2 + (y / ery) ** 2; if (d > 1) continue;
      if (look === 'angry' && y < cutAt(x)) continue;
      const shade = 1 - (y + ery) / (2 * ery) * 0.45;
      const blood = d > 0.55 && cloHash(Math.floor(x * 1.5) + n * 9, Math.floor(y * 1.5), 81) > 0.62;
      B(ex + 0.5 + x - q / 2, ey + 0.5 + y - q / 2, q, q, blood ? '#c8302a' : cloRgb([236 * shade, 214 * shade, 140 * shade]));
    }
    B.flush(ctx);
    if (look === 'dizzy') {
      const a = t * 0.25 + n * 2;
      fBlob(ctx, ex + 0.5 + Math.cos(a) * 1.4, ey + 0.5 + Math.sin(a) * 1.2, 0.6, '#1a0a10');
      fBlob(ctx, ex + 0.5 - Math.cos(a) * 1.4, ey + 0.5 - Math.sin(a) * 1.2, 0.6, iris[0]);
      return;
    }
    const ix = ex + 0.5 + (look === 'panic' ? 0 : 1), iy = ey + 0.5, ir = look === 'panic' ? 1 : n ? 1.3 : 1.6;
    for (let y = -ir; y <= ir; y += q) for (let x = -ir; x <= ir; x += q) {
      const r = cloLen(x, y); if (r > ir) continue;
      if (look === 'angry' && y + iy - 0.5 - ey < cutAt(x + ix - 0.5 - ex)) continue;
      B(ix + x - q / 2, iy + y - q / 2, q, q, r < ir * 0.5 ? iris[1] : iris[0]);
    }
    B.flush(ctx);
    fBlob(ctx, ix, iy, 0.45, '#120408');                                           // the pupil, a pinprick
    fBlob(ctx, ix - 0.7, iy + (look === 'angry' ? 0.7 : -0.7), 0.35, look === 'angry' ? '#fff2d0' : '#ffffff');
  });
}

// The maw: a jagged gash of broken shell, glass and hooks, acid pooled in it, strings of mucus between the jaws.
function cloDrawMouth(ctx, open, frown, t) {
  const B = fineBatch(), q = 1 / ART_R, { x0, x1, y } = CLO_MOUTH, n = x1 - x0;
  const topAt = u => y - frown * (0.5 - Math.abs(u - 0.5)) * 2.4 + (u < 0.04 || u > 0.96 ? 0.8 : 0);
  const gapAt = u => Math.max(1, open * Math.pow(Math.sin(Math.PI * u), 0.7));
  for (let i = 0; i <= n; i += q) {
    const u = i / n, x = x0 + i, top = topAt(u), gap = gapAt(u);
    B(x, top - 1, q, 1, '#1a0806');                               // the upper lip overhangs: a hard shadow
    for (let k = 0; k < gap; k += q) {
      const f = k / Math.max(1, gap - 1);
      B(x, top + k, q, q, f > 0.7 && gap > 3 ? (k >= gap - 1 ? '#a8d838' : '#4a7a10') : cloRgb(cloMix([14, 3, 6], [64, 12, 20], Math.sin(f * Math.PI) * 0.8)));
    }
    B(x, top + gap, q, 2 / 3, '#24100a');                          // the lower lip, wet along its edge
  }
  B.flush(ctx);
  // the teeth: junk, every one different (fixed by column so they never shuffle) -- shell, glass, hooks, nails
  const PAL = [['#f2e8cc', '#9a8664'], ['#c4f4dc', '#4a9070'], ['#e8f0f8', '#6a7a92'], ['#c87848', '#5a2c14']];
  for (let i = 1; i < n; i++) {
    const u = (i + 0.5) / n, x = x0 + i, top = topAt(u), gap = gapAt(u);
    const h = cloHash(i, 1, 93), kind = h < 0.6 ? 0 : h < 0.75 ? 1 : h < 0.9 ? 2 : 3, pal = PAL[kind];
    const up = i % 2 ? Math.min(gap, 2 + Math.floor(cloHash(i, 0, 91) * 2)) : Math.min(gap, 1), dn = i % 2 ? 0 : Math.min(Math.max(0, gap - up - 1), 1 + Math.floor(cloHash(i, 2, 95) * 2));
    if (up > 0) { fPoly(ctx, [[x + 0.05, top - 0.2], [x + 0.95, top - 0.2], [x + 0.5 + (cloHash(i, 3, 97) - 0.5) * 0.4, top + up]], pal[0]); fRect(ctx, x + 0.35, top + up - 0.67, 1 / 3, 1 / 3, pal[1]); }
    if (kind === 1 && up > 1) fRect(ctx, x + 1 / 3, top, 1 / 3, 2 / 3, '#ffffff');
    const p2 = PAL[kind === 0 ? 0 : (kind + 2) % 4];
    if (dn > 0) fPoly(ctx, [[x + 0.05, top + gap + 0.2], [x + 0.95, top + gap + 0.2], [x + 0.5, top + gap - dn]], p2[0]);
  }
  // strings of mucus between the jaws, sagging, and a drool from the lip
  if (open > 2.5) for (const i of [4, 9, 13]) {
    const u = (i + 0.5) / n, x = x0 + i + 0.5, top = topAt(u), gap = gapAt(u), sag = gap * 0.6 + Math.sin(t * 0.07 + i) * 0.8;
    ctx.globalAlpha = 0.7; fRect(ctx, x - 1 / 6, top + 1, 1 / 3, Math.max(1, sag - 1), '#d8ff90'); ctx.globalAlpha = 1;
    fBlob(ctx, x, top + sag, 0.45, '#eaffb8');
  }
  const u3 = 3.5 / n, dx = x0 + 3.5, dtop = topAt(u3), dgap = gapAt(u3), len = (t % 110) / 110;
  if (len < 0.8) {
    const l = len * 7;
    ctx.globalAlpha = 0.8; fRect(ctx, dx - 1 / 3, dtop + dgap + 2, 2 / 3, l, '#a8e040'); ctx.globalAlpha = 1;
    fEll(ctx, dx, dtop + dgap + 2.8 + l, 0.6, 0.9, '#d8ff80');
  }
}

// acid dribbling off him and bubbles popping on his skin (each drip falls and starts over)
function cloDrawOoze(ctx, t) {
  for (const [x, y0, per, off] of [[-6, 19, 130, 0], [9, 20, 160, 60], [-18, 17, 150, 100], [-24, -3, 140, 30]]) {
    const ph = (t + off) % per, grow = Math.min(1, ph / (per * 0.7)), l = grow * 2, cx = x + 0.5;
    if (l > 0.2) fRect(ctx, cx - 1 / 3, y0, 2 / 3, l, '#6a9a18');
    fEll(ctx, cx, y0 + l + 0.5, 0.55, 0.6, '#c4f060');
    if (ph > per * 0.7) {   // let go: it falls
      const fy = y0 + 2 + ((ph - per * 0.7) / 4) ** 2;
      if (fy < 21) fEll(ctx, cx, fy + 0.5, 0.45, 0.6, '#c4f060');
    }
  }
  for (const [x, y, per, off] of [[-8, -12, 95, 0], [-1, 9, 120, 50], [-19, 6, 105, 20]]) {
    const ph = (t + off) % per;
    if (ph < 40) {
      const r = ph < 30 ? ph / 15 : 0;
      if (r > 0.3) { ctx.strokeStyle = '#c8f060'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.arc(x + 0.5, y + 0.5, r, 0, Math.PI * 2); ctx.stroke(); fBlob(ctx, x + 0.2, y + 0.2, 0.3, '#f4ffd0'); }
      else fBlob(ctx, x + 0.5, y + 0.5, 0.5, '#e8ffa0');
    }
  }
}
