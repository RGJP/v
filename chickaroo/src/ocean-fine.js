'use strict';
// 2-1 CORAL DEEP, painted fine (hires.js: ART_R x, no dithering): the deep (shafts of sunlight, a far ridge swaying
// with kelp, the reef with fan and branch corals) and the island sky above the waves.

function oceanFineBackground() {
  const R = ART_R, W = BG_W * R, H = VIEW_H * R, rng = mulberry32(hashStr('ocean-fine'));
  // shafts of sunlight slanting down from the surface, fading as they go
  const rays = finePix(W, H), shafts = [];
  for (let i = 0; i < 6; i++) shafts.push([(i * BG_W / 6 + rng() * 30) * R, (10 + rng() * 14) * R]);
  rays.wash(0, 0, W, 150 * R, (x, y) => {
    let k = 0;
    for (const [x0, w] of shafts) for (const o of [-W, 0, W]) { const u = (x - x0 - o - y * 0.35) / w; if (u > 0 && u < 1) k = Math.max(k, Math.sin(u * Math.PI)); }
    return k * 0.16 * (1 - y / (150 * R));
  }, '#bff4ff');
  // the far ridge, kelp swaying up from it
  const terms = [[18, 2, 0.4], [10, 5, 1.3], [5, 13, 2], [1, 31, 0.8]], far = finePix(W, H);
  const ftops = Array.from({ length: W }, (_, x) => fineRidge(176, terms, x));
  far.fill(0, 0, W, H, (x, y) => y < ftops[x] ? null : y < ftops[x] + 2 ? '#1a5a8a' : lerpColor('#124a78', '#0e3e68', clamp((y - ftops[x]) / 90, 0, 1)));
  for (let i = 0; i < 16; i++) {
    const x0 = rng() * W, h = (30 + rng() * 30) * R, ph = rng() * 6;
    for (const o of [-W, 0, W]) for (let j = 0; j < h; j++) { const x = x0 + o + Math.sin(j * 0.03 + ph) * 4, t = ftops[((Math.round(x0) % W) + W) % W]; far.rect(Math.round(x), Math.round(t - j), 4, 1, '#145282'); if (j % 22 === 11) far.ell(x + 4, t - j, 5, 2, '#145282', { rot: 0.4 }); }
  }
  // the reef: a dark ridge, fan corals and branching corals in muted pinks and greens, the odd glowing anemone
  const rterms = [[10, 3, 1], [6, 7, 0.3], [4, 17, 2.1], [1, 37, 0.6]], reef = finePix(W, H);
  const rtops = Array.from({ length: W }, (_, x) => fineRidge(196, rterms, x));
  reef.fill(0, 0, W, H, (x, y) => y < rtops[x] ? null : y < rtops[x] + 2 ? '#1d5a8e' : lerpColor('#0c3560', '#082a4e', clamp((y - rtops[x]) / 60, 0, 1)));
  for (let i = 0; i < 22; i++) {
    const x = Math.floor(rng() * W), t = rtops[x], kind = i % 3, c = ['#7a3a6a', '#2f6a5a', '#8a4a5a'][i % 3], h = (10 + rng() * 16) * R;
    for (const o of [-W, 0, W]) {
      const X = x + o;
      if (kind === 0) {   // a fan coral: a lacy half disc on a stalk
        reef.rect(X - 1, t - h * 0.3, 3, h * 0.3 + 2, c);
        reef.fill(X - h * 0.6, t - h, X + h * 0.6, t - h * 0.25, (px, py) => { const d = Math.hypot(px + 0.5 - X, (py + 0.5 - (t - h * 0.3)) * 1.2); return d < h * 0.55 && py < t - h * 0.3 && ((px + py) % 5 < 3 || d > h * 0.5) ? c : null; });
      } else {            // a branching coral: a trunk splitting into fingers
        const br = (x0, y0, len, a, d) => { const x1 = x0 + Math.sin(a) * len, y1 = y0 - Math.cos(a) * len; for (let k = 0; k <= len; k++) reef.ell(x0 + (x1 - x0) * k / len, y0 + (y1 - y0) * k / len, 2.2 - d * 0.4, 2.2 - d * 0.4, c); reef.ell(x1, y1, 2.6 - d * 0.4, 2.6 - d * 0.4, lerpColor(c, '#ffffff', 0.15)); if (d < 2) { br(x1, y1, len * 0.7, a - 0.5, d + 1); br(x1, y1, len * 0.7, a + 0.45, d + 1); } };
        br(X, t + 2, h * 0.45, (rng() - 0.5) * 0.4, 0);
      }
    }
  }
  for (let i = 0; i < 6; i++) { const x = rng() * W, t = rtops[Math.floor(x)]; for (const o of [-W, 0, W]) { reef.glow(x + o, t - 6, 22, '#5ef2e0', 0.25); reef.ell(x + o, t - 3, 4, 3, '#5ef2e0'); } }
  const sky = finePix(VIEW_W * R, H); sky.vgrad(0, 0, VIEW_W * R, H, ['#2a86c0', '#2476b0', '#1f67a0', '#1a5990', '#154b80', '#113e70', '#0d3262']);
  return { sky: sky.hi(), layers: [{ c: rays.hi(), f: 0.06, drift: 0.05 }, { c: far.hi(), f: 0.15 }, { c: reef.hi(), f: 0.35 }] };
}

// above the waves: a bright tropical sky, fat cumulus, far islets with palms, the open sea glinting
function isleFineBackground() {
  const R = ART_R, W = BG_W * R, H = VIEW_H * R, rng = mulberry32(hashStr('isle-fine'));
  const clouds = finePix(W, H), CL = { under: '#bcd8ee', shade: '#d8ecf8', body: '#f6fbff' };
  for (const [cx0, cy0, s] of [[60, 40, 1], [200, 70, 0.7], [330, 30, 1.2], [450, 62, 0.8]]) for (const o of [-W, 0, W]) {
    const puffs = [[0, 0, 12], [14, -5, 14], [30, 0, 11], [-12, 3, 8], [42, 4, 8]].map(([dx, dy, r]) => [(cx0 + dx * s) * R + o, (cy0 + dy * s) * R, r * s * R]);
    const base = (cy0 + 8 * s) * R, inside = (x, y, g = 0, ox = 0, oy = 0) => y < base + g && puffs.some(([px, py, r]) => (x + 0.5 - px - ox) ** 2 + (y + 0.5 - py - oy) ** 2 <= (r + g) ** 2);
    clouds.fill((cx0 - 24 * s) * R + o, (cy0 - 24 * s) * R, (cx0 + 56 * s) * R + o, base + 2, (x, y) => !inside(x, y) ? null : y > base - 3 * s * R ? CL.under : inside(x, y, -3 * s * R, -4 * s * R, -5 * s * R) ? '#ffffff' : inside(x, y, -1.5 * R) ? CL.body : CL.shade);
  }
  const isles = finePix(W, H), terms = [[10, 1, 0.3], [6, 4, 1.1], [1.2, 13, 0.4]];
  const tops = Array.from({ length: W }, (_, x) => Math.min(150 * R, fineRidge(150, terms, x)));
  isles.fill(0, 0, W, 150 * R, (x, y) => y < tops[x] || tops[x] >= 150 * R - 1 ? null : y < tops[x] + 2 ? '#8fd8b0' : lerpColor('#6fc0a0', '#4f9a8a', clamp((y - tops[x]) / 20, 0, 1)));
  for (let i = 0; i < 8; i++) {   // little palms on the islets
    const x = Math.floor(rng() * W), t = tops[x]; if (t > 146 * R) continue;
    for (const o of [-W, 0, W]) { const X = x + o; isles.line(X, t, X + 4, t - 14 * R, '#3f7a6a'); isles.line(X + 1, t, X + 5, t - 14 * R, '#3f7a6a'); for (const a of [-2.6, -2, -1.2, -0.6, 0]) isles.ell(X + 4 + Math.cos(a) * 9, t - 14 * R + Math.sin(a) * 4 + 3, 9, 2.4, '#3f7a6a', { rot: a + Math.PI / 2 }); }
  }
  const sea = finePix(W, H);
  sea.fill(0, 150 * R, W, H, (x, y) => lerpColor('#4aa8e0', '#2a7ec0', clamp((y - 150 * R) / (60 * R), 0, 1)));
  sea.rect(0, 150 * R, W, 2, '#bfe8ff');
  for (let i = 0; i < 90; i++) { const x = rng() * W, y = (152 + rng() * 60) * R, w = (3 + rng() * 5) * R; sea.ell(x, y, w / 2, 1.2, '#c8f0ff'); }
  const sky = finePix(VIEW_W * R, H); sky.vgrad(0, 0, VIEW_W * R, H, ['#3aa8f0', '#4ab4f2', '#5fc0f4', '#7ccdf6', '#9ad9f8', '#bce6fa', '#dff3fc']);
  return { sky: sky.hi(), layers: [{ c: clouds.hi(), f: 0.15, drift: 0.06 }, { c: isles.hi(), f: 0.25 }, { c: sea.hi(), f: 0.4 }] };
}

// ── 2-1's creatures, painted fine and baked once per pose (mArt: meadow-art.js; their behaviour: enemies-water-ice.js) ──
const OCEAN_ART = new Map();
const oceanArt = (key, paint) => OCEAN_ART.get(key) || (OCEAN_ART.set(key, paint()), OCEAN_ART.get(key));
const artBuf = (A, ax, ay) => A.buf[ay * Math.ceil(A.w * A.R) + ax];   // what's painted at an art pixel already
const smooth01 = (a, b, v) => { const k = clamp((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

// the piranha (Finlet), facing left (32 x 24; its box's top-left at (6, 5)): a deep, flat-sided body with a fiery
// belly and a lattice of glinting scales, a blunt head with a jutting underbite that gnaws open (open), a forked tail
// flicking (tail -1..1), a sculling pectoral fin (sc). red: the black piranha, dark scales, blood-red belly and eye
const FIN_PAL = {
  silver: { body: ['#26303c', '#46546a', '#7a8a9a', '#b4c0cc', '#eef4fa'], belly: ['#8a1e0e', '#c83a1a', '#ff6a2a', '#ff9a5a', '#ffd0a8'], fin: ['#1a222c', '#2e3844', '#46545e', '#647480', '#8a9aa6'], eye: '#ffd040' },
  red: { body: ['#0e0a10', '#201820', '#3a2a34', '#62505e', '#94808e'], belly: ['#4a0410', '#7a0a1c', '#b8122c', '#e83a50', '#ff8292'], fin: ['#0a070a', '#160e16', '#281c24', '#44323e', '#62505e'], eye: '#ff3040' },
};
function finletArt(red, open, tail, sc) {
  return oceanArt('fin' + red + open + tail + sc, () => {
    const P = red ? FIN_PAL.red : FIN_PAL.silver, A = mArt(32, 24), cx = 16, cy = 12, drop = open ? 2 : 0;
    A.poly([[cx + 6, cy - 1.8], [cx + 13.6, cy - 6 + tail], [cx + 11.4, cy + tail * 0.6], [cx + 13.6, cy + 6 + tail], [cx + 6, cy + 1.8]], P.fin[2]);   // the forked tail
    A.fill(cx + 5, cy - 8, cx + 15, cy + 8, (x, y) => softTone(P.fin, 0.9 - (x - cx - 6) / 6 - Math.abs(y - cy) / 10), [P.fin[2]]);
    A.poly([[cx - 2.4, cy - 5.6], [cx + 0.4, cy - 9.8], [cx + 1.6, cy - 9.4], [cx + 4.8, cy - 5]], P.fin[2]);   // dorsal fin
    A.poly([[cx + 5.8, cy - 4.8], [cx + 7, cy - 7.2], [cx + 7.8, cy - 4]], P.fin[2]);                         // a little adipose fin
    A.poly([[cx + 0.6, cy + 5.4], [cx + 4.2, cy + 8.8], [cx + 6.8, cy + 4.4]], P.belly[1]);                 // anal fin
    A.fill(cx - 12, cy - 8, cx + 10, cy + 8, (x, y) => {   // the body: a deep oval with a steep forehead, its belly aflame
      const dx = x - cx, dy = y - cy, rx = dx < 0 ? 9.8 - (dy < -1.5 ? Math.min(2.6, (-1.5 - dy) * 0.55) : 0) : 8.6, ry = 6.7, d = (dx / rx) ** 2 + (dy / ry) ** 2;
      if (d > 1) return null;
      const v = dy / ry, l = -0.35 * dx / rx - 0.55 * v + (1 - d) * 0.55;
      return lerpColor(softTone(P.body, l - 0.05), softTone(P.belly, l + 0.35), smooth01(0.08, 0.42, v));
    });
    A.fill(cx - 7, cy - 5, cx + 7, cy + 3, (x, y, ax, ay) => {   // a lattice of scales glinting on the flank
      const c = artBuf(A, ax, ay), dx = x - cx, dy = y - cy;
      return c && dy < 1.6 && dx > -5 && (dx / 8) ** 2 + (dy / 5.4) ** 2 < 0.8 && ((ax + ay) % 7 === 0 || (ax - ay + 700) % 7 === 0) ? lerpColor(c, '#ffffff', 0.16) : null;
    });
    // the mouth: a blunt upper lip, and the underbite dropping open when it gnaws
    if (open) A.poly([[cx - 10.8, cy + 0.6], [cx - 5.4, cy + 1], [cx - 5.4, cy + 2.6 + drop * 0.5], [cx - 10.8, cy + 1.6 + drop]], '#3a0a12');
    A.poly([[cx - 11.4, cy + 1.6 + drop], [cx - 5, cy + 2.2 + drop * 0.6], [cx - 4.6, cy + 4.6], [cx - 10.4, cy + 3.8 + drop]], P.belly[2]);   // the jutting jaw
    A.fill(cx - 12, cy + 1, cx - 4, cy + 6, (x, y) => softTone(P.belly, 0.7 - (y - cy - 2 - drop) * 0.6), [P.belly[2]]);
    A.soft(cx - 2.6, cy + 2.6 + sc * 0.7, 2.5, 1.1, P.fin, null, 0.45 + sc * 0.25);                          // the pectoral fin, sculling
    A.outline();
    A.fill(cx - 5, cy - 3, cx - 3, cy + 4, (x, y) => Math.abs(x - (cx - 4.1 + ((y - cy) / 3) ** 2 * 0.8)) < 0.25 && y > cy - 2.4 && y < cy + 3.4 ? P.body[0] : null);   // the gill slit
    for (const tx of [-10.4, -9, -7.6, -6.2]) {   // teeth: the top row, and the bottom row rising from the underbite
      A.poly([[cx + tx - 0.5, cy + 0.9], [cx + tx + 0.5, cy + 0.9], [cx + tx, cy + 1.9]], '#ffffff');
      A.poly([[cx + tx + 0.2, cy + 1.9 + drop], [cx + tx + 1.2, cy + 1.9 + drop], [cx + tx + 0.7, cy + 0.9 + drop]], '#f4ece4');
    }
    A.ell(cx - 5.8, cy - 2.6, 1.6, 1.6, '#100808'); A.ell(cx - 5.8, cy - 2.6, 1.15, 1.15, P.eye); A.ell(cx - 6.1, cy - 2.4, 0.6, 0.7, '#100808'); A.ell(cx - 5.4, cy - 3.1, 0.3, 0.3, '#ffffff');   // a cold, staring eye
    A.line(cx - 8.2, cy - 3.8, cx - 4, cy - 5, P.body[0], null, 0.7);                                       // a scowling brow ridge
    return A.canvas();
  });
}

// the octopus (Jellop): 34 x 40, its middle at (17, 8 + its top). A soft mottled mantle, raised eyes with gold slit
// pupils (blink: 0..3, a bit for each), eight tapering arms with pale suckers that splay and curl (jet 0) or sweep
// together into a trail (jet 1), waving (ph: 0..7)
const OCTO = ['#5a1810', '#7a2418', '#c8462a', '#e0643a', '#ff9a66', '#ffd0b0'];
function jellopArt(jet, ph, blink) {
  return oceanArt('oct' + jet + ph + blink, () => {
    const A = mArt(34, 40), cx = 17, y = 8, t = ph / 8 * Math.PI * 2 / 0.12;
    for (let i = 0; i < 8; i++) {   // the arms, first (the head sits on their roots)
      const k = (i - 3.5) / 3.5, side = Math.sign(k) || 1, len = 17 + (i === 0 || i === 7 ? -3 : 0) - Math.abs(k) * 2 + jet * 3;
      const spread = (1 - jet) * k * 1.15 + jet * k * 0.22, p = t * 0.12 + i * 0.8;
      let x = cx + k * 4.5, yy = y + 13, ang = Math.PI / 2 - spread;
      for (let j = 0; j < len; j += 0.5) {
        const f = j / len, w = 1.15 - f * 0.75;
        ang += (Math.sin(p + j * 0.45) * 0.06 - (1 - jet) * side * (f > 0.6 ? 0.3 : 0.03)) * 0.5;
        x += Math.cos(ang) * 0.45; yy += Math.sin(ang) * 0.45;
        A.ell(x, yy, w, w, softTone(OCTO, 0.6 - f * 0.7 + (i % 2 ? -0.2 : 0.1) - side * 0.15));
        if (j > 3 && Math.round(j * 2) % 6 === 0 && w > 0.6) A.ell(x - side * w * 0.45, yy, w * 0.4, w * 0.4, '#ffd9bf');   // suckers along the inside
      }
    }
    A.soft(cx, y + 12.4, 6.8, 2.6 + jet, OCTO);                                                            // the web between the arm roots
    const mw = 6.2 - jet, mh = 7.4 + jet * 2, my = y + 5 - jet * 2;
    A.soft(cx, my, mw, mh, OCTO);                                                                           // the mantle
    A.fill(cx - mw, my - mh, cx + mw, my + mh, (x, yy, ax, ay) => {   // chromatophore spots
      const c = artBuf(A, ax, ay), u = (x - cx) / mw, v = (yy - my) / mh, h = Math.sin(Math.floor(x * 1.3) * 12.9898 + Math.floor(yy * 1.3) * 78.233) * 43758.5;
      return c && u * u + v * v < 0.85 && h - Math.floor(h) < 0.1 ? lerpColor(c, OCTO[0], 0.45) : null;
    });
    A.soft(cx + 6.4, y + 11, 1.2, 0.8, OCTO);                                                              // the siphon
    for (const s of [-1, 1]) A.soft(cx + s * 4, y + 9, 2.6, 2.3, OCTO);                                  // the eye turrets
    A.outline();
    A.ell(cx - 2.2, my - mh + 2.4, 1.1, 0.6, '#ffe0c8', null, -0.5);                                       // a wet glint
    for (const s of [-1, 1]) {
      const ex = cx + s * 4, ey = y + 9, shut = blink & (s > 0 ? 2 : 1);
      if (shut) { A.line(ex - 1.4, ey, ex + 1.4, ey, OCTO[0], null, 0.5); continue; }
      A.ell(ex, ey, 1.6, 1.4, '#ffd166'); A.ell(ex, ey + 0.5, 1.6, 0.8, '#e0a040', ['#ffd166']);
      A.ell(ex, ey, 1.3, 0.38, '#1a0a08'); A.ell(ex - 0.6, ey - 0.6, 0.3, 0.3, '#ffffff');
    }
    return A.canvas();
  });
}

// the urchin: 56 x 36, its middle at (28, 26): a low test (shell) dotted with tubercles, bristling with spines of
// uneven length -- dark at the root, pale at the tip -- swaying in the swell (sw: 0..7); tube feet gripping the floor
const URCHIN_SWAY = 8;
function urchinArt(kind, sw) {
  return oceanArt('urch' + kind + sw, () => {
    const K = URCHIN_KINDS[kind], A = mArt(56, 36), cx = 28, cy = 26, t = sw / URCHIN_SWAY * Math.PI * 2 / 0.04, R = K.r;
    A.fill(cx - R - 1, cy - R, cx + R + 1, cy + 3, (x, y) => {   // the test: a flattened dome
      const dx = x - cx, dy = y - cy, d = (dx / R) ** 2 + (dy / (dy < 0 ? R - 1 : 2.5)) ** 2;
      return d <= 1 ? softTone([K.test[2], K.test[2], K.test[1], K.test[0], lerpColor(K.test[0], '#ffffff', 0.35)], -0.45 * dx / R - 0.8 * dy / R + (1 - d) * 0.4) : null;
    });
    for (let dx = -R + 1.5; dx <= R - 1.5; dx += 2.6) A.ell(cx + dx + (sw % 2) * 0.3, cy + 3.2, 0.5, 1.1, '#e8b0c8');   // tube feet
    A.outline();
    for (const [dx, dy] of [[-4, -2], [-1.4, -4], [2, -3], [4.6, -1], [-2, -0.6], [1, 0.4], [-4.8, 0.4]]) if (Math.abs(dx) < R) A.ell(cx + dx, cy + dy, 0.45, 0.45, K.dots);
    A.ell(cx - 2, cy - R + 2, 1.2, 0.45, lerpColor(K.test[0], '#ffffff', 0.6));                          // a wet sheen
    const spines = [];
    for (let i = 0; i < K.n; i++) {
      const a = Math.PI + (i / (K.n - 1)) * Math.PI + Math.sin(i * 7.3) * 0.06;
      const len = K.len + ((i * 37) % 5) - (i % 2 ? 3 : 0) + Math.sin(t * 0.05 + i) * 0.6, sway = Math.sin(t * 0.04 + i * 0.5) * (kind === 'black' ? 0.08 : 0.05);
      spines.push([a + sway, len, i % 2]);
    }
    for (const pass of [0, 1]) for (const [a, len, back] of spines) {   // behind the test: the front row, then the back row behind that
      if (back !== pass) continue;
      const ca = Math.cos(a), sa = Math.sin(a) * 0.9, N = Math.ceil((len - 3) * 3);
      for (let j = 0; j <= N; j++) {
        const f = j / N, k = 3 + (len - 3) * f, w = (back ? 0.42 : 0.55) * (1 - f * 0.6);
        const col = back ? lerpColor(K.back[0], K.back[1], f) : f < 0.5 ? lerpColor(K.spine[0], K.spine[1], f * 2) : lerpColor(K.spine[1], K.spine[2], (f - 0.5) * 2);
        A.ell(cx + ca * k, cy + sa * k, w, w, col, [null]);
      }
    }
    return A.canvas();
  });
}

// the reef crab: 40 x 28, its middle and the floor at (20, 24). A fan-shaped carapace with a serrated rim and grooves,
// four pairs of jointed legs scuttling (step 0..3, or -1 standing), stalked eyes (look -1/0/1), both claws held high,
// snapping (snap)
function crabArt(col, step, snap, look) {
  return oceanArt('crab' + col + step + snap + look, () => {
    const C = CRAB_COLS[col], A = mArt(40, 28), X = 20, B = 24, walking = step >= 0, bob = walking ? step % 2 : 0;
    const SH = [C.tip, C.dark, C.base, C.mid, C.lite, lerpColor(C.lite, '#ffffff', 0.5)];
    for (let i = 3; i >= 0; i--) for (const s of [-1, 1]) {   // the legs, back to front
      const phase = walking ? (step + i + (s > 0 ? 1 : 0)) % 4 : 0, lift = phase === 1 ? 2 : phase === 2 ? 1 : 0, stride = walking ? (phase === 1 ? 1 : phase === 3 ? -1 : 0) : 0;
      const r = [X + s * (5 + (i % 2)), B - 4 - (i >> 1) - bob], k = [X + s * (8 + i + stride), B - 6 - (i === 1 || i === 2 ? 1 : 0) - lift], tp = [X + s * (10 + i * 2 + stride), B - 1 - lift];
      const c1 = i >= 2 ? C.dark : C.base, c2 = i >= 2 ? C.base : C.mid;
      A.line(r[0], r[1], k[0], k[1], c1, null, 1.1); A.line(k[0], k[1], tp[0] - s * 0.6, (k[1] + tp[1]) / 2 + 0.6, c2, null, 0.9);
      A.line(tp[0] - s * 0.6, (k[1] + tp[1]) / 2 + 0.6, tp[0], tp[1], C.tip, null, 0.6);
      A.ell(k[0], k[1], 0.7, 0.7, C.lite);
    }
    A.soft(X, B - 3.2 - bob, 5.6, 1.6, [C.base, C.base, C.belly, C.belly, '#ffffff']);                     // the pale underside
    for (const s of [-1, 1]) A.line(X + s * 6, B - 7 - bob, X + s * 8.6, B - 10.4 - bob, C.base, null, 1.3);   // the claws' arms
    A.fill(X - 10.5, B - 11 - bob, X + 10.5, B - 3 - bob, (x, y) => {   // the carapace: a fan, wide at the shoulders
      const dx = x - X, dy = y - (B - 6.6 - bob), w = 9.4 - Math.max(0, dy) * 1.1 - Math.max(0, -dy - 1.6) * 2.4, h = 3.6;
      if (Math.abs(dx) > w || Math.abs(dy) > h) return null;
      return softTone(SH, -0.3 * dx / 9 - 0.9 * dy / h + (1 - (dx / w) ** 2) * 0.35 + 0.15);
    });
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) A.ell(X + s * (6.4 + k * 0.9), B - 9.6 - bob + k * 0.9, 0.55, 0.55, k % 2 ? C.lite : C.mid);   // the serrated rim
    for (const s of [-1, 1]) A.soft(X + s * 8.4, B - 12.4 - bob, 2.9, 2.3, SH, null, s * 0.3);            // the claws' swollen palms
    A.outline();
    for (const s of [-1, 1]) {   // the claws' fingers: a fixed one curving in, the movable one above it hinging open
      const px = X + s * 8.4, py = B - 12.4 - bob, open = snap ? 1.8 : 0;
      A.poly([[px - s * 1.6, py - 1.2], [px - s * 4.6, py - 2.6], [px - s * 2.4, py - 0.2]], C.mid);
      A.poly([[px - s * 0.4, py - 2], [px - s * 4.4, py - 3.6 - open], [px - s * 1.8, py - 3.8 - open * 0.4], [px + s * 1, py - 2.2]], C.lite);
      if (open) A.line(px - s * 2, py - 2.4, px - s * 3.6, py - 2.6 - open * 0.6, C.tooth, null, 0.4);
      A.ell(px + s * 0.6, py - 0.8, 0.6, 0.4, '#ffffff');
    }
    A.line(X - 3, B - 7.2 - bob, X - 2, B - 6.2 - bob, C.dark, null, 0.34); A.line(X + 3, B - 7.2 - bob, X + 2, B - 6.2 - bob, C.dark, null, 0.34);   // grooves
    A.line(X - 2, B - 6.2 - bob, X + 2, B - 6.2 - bob, C.dark, null, 0.34);
    for (const s of [-1, 1]) {   // the eyes, up on their stalks
      const ex = X + s * 3.6;
      A.line(ex, B - 9.4 - bob, ex, B - 11.4 - bob, C.lite, null, 0.6);
      A.ell(ex + (look === s ? s * 0.5 : 0), B - 12 - bob, 1, 1, C.tip); A.ell(ex - 0.3 + (look === s ? s * 0.5 : 0), B - 12.4 - bob, 0.32, 0.32, '#ffffff');
    }
    return A.canvas();
  });
}

// a smooth sea pebble (18 x 14; its box's top-left at (1, 1)): lit on top, a few speckles
function stoneArt() {
  return oceanArt('stone', () => {
    const A = mArt(18, 14);
    A.fill(0, 0, 18, 14, (x, y) => { const u = (x - 9) / 7.8, v = (y - 8.6) / 5.4; return u * u + v * v <= 1 ? softTone(['#3e4458', '#5e6680', '#8a92a8', '#b8c0d4', '#e6ecf6'], -0.4 * u - 0.9 * v + (1 - u * u - v * v) * 0.4) : null; });
    for (const [x, y, r] of [[11.6, 9.6, 0.5], [6.4, 11, 0.4], [13, 7, 0.35], [8.4, 7.6, 0.3]]) A.ell(x, y, r, r, '#5e6680');
    A.outline();
    A.ell(6.4, 5.4, 1.8, 0.7, '#f4f8ff', null, -0.3);
    return A.canvas();
  });
}

// the hermit crab (Grumblet, under the sea), facing right: 24 x 20, its middle and the floor at (12, 18). A spiral
// shell on its back, red legs scuttling (step), a big claw up front, eyes on stalks; tucked into the shell (squashed)
const HERMIT_SHELL = ['#a8483a', '#d8705a', '#ff9a7a', '#ffc0a4', '#ffe4d4'], HERMIT_BODY = ['#7a1e14', '#b83a2a', '#ff6a4a', '#ff9a7a', '#ffc8b0'];
function hermitArt(step, squashed) {
  return oceanArt('hermit' + step + squashed, () => {
    const A = mArt(24, 20), X = 12, B = 18;
    if (!squashed) {
      for (let i = 0; i < 3; i++) { const lx = X - 3.6 + i * 3, up = (i + step) % 2; A.line(lx, B - 4.6, lx + 0.8, B - 0.6 - up * 0.8, HERMIT_BODY[1], null, 0.8); }   // legs
      A.soft(X + 3.6, B - 5.6, 3.2, 2.6, HERMIT_BODY);                                                 // the body, peeking out
      A.line(X + 4, B - 9.4, X + 3.6, B - 13, HERMIT_BODY[2], null, 0.6); A.line(X + 5.8, B - 8.6, X + 6, B - 12.4, HERMIT_BODY[2], null, 0.6);   // eye stalks
      A.soft(X + 7.6, B - 8.4 + step, 2.6, 2.2, HERMIT_BODY);                                           // the big claw
      A.poly([[X + 8.6, B - 10 + step], [X + 10.8, B - 11.4 + step], [X + 9.6, B - 8.8 + step]], HERMIT_BODY[3]);
    }
    A.fill(X - 9, B - 15, X + 4, B, (x, y) => {   // the spiral shell
      const dx = x - (X - 2.4), dy = y - (B - 7.6), d = (dx / 6.2) ** 2 + (dy / 6) ** 2;
      if (d > 1 || y > B - 0.4) return null;
      const r = Math.hypot(dx + 1, dy + 1), a = Math.atan2(dy + 1, dx + 1), groove = Math.abs(((r - a * 0.75 + 20) % 2.9) - 1.45) < 0.22 && r < 5.2;
      return groove ? HERMIT_SHELL[0] : softTone(HERMIT_SHELL, -0.6 * dx / 6 - 0.8 * dy / 6 + (1 - d) * 0.5);
    });
    A.outline();
    if (!squashed) for (const [ex, ey] of [[X + 3.6, B - 13.4], [X + 6, B - 12.8]]) { A.ell(ex, ey, 0.95, 0.95, INK); A.ell(ex + 0.25, ey - 0.3, 0.3, 0.3, '#ffffff'); }
    A.ell(X - 5, B - 11, 1.2, 0.6, '#fff4ee', null, -0.6);
    return A.canvas();
  });
}

// the pufferfish, facing left, at radius r (rounded): a soft round body, spotted on its back, cream underneath, spines
// radiating out (stubby prickles when small, long sharp spikes when it's a super-sphere), bulging eyes, a fanned tail
// and a flapping fin (f: 0..3). flash: its warning blush; gulp: mouth puckered open (the tell, or blown up)
function pufferArt(r, flash, f, tell) {
  return oceanArt('puff' + r + flash + f + tell, () => {
    const S = 2 * (r + 7), A = mArt(S, S), c = S / 2, big = r > 10, gulp = tell || big;
    const BACK = flash ? ['#7a3010', '#b04a18', '#d86a28', '#ff9442', '#ffc890'] : ['#4e3014', '#6a4418', '#8a5a28', '#c4883c', '#e8c080'];
    const BELLY = flash ? ['#e8a060', '#ffc888', '#ffe09a', '#fff0c8', '#ffffff'] : ['#c8a870', '#e0c690', '#f4dfa8', '#fff2d0', '#ffffff'];
    const tail = Math.round(Math.sin(f / 4 * Math.PI * 2)), flap = Math.round(Math.sin(f / 4 * Math.PI * 2 + 1));
    A.poly([[c + r - 1, c - 1.2], [c + r + 4, c - 3.4 + tail], [c + r + 3.2, c + tail * 0.5], [c + r + 4, c + 3.4 + tail], [c + r - 1, c + 1.2]], BACK[2]);   // the tail
    const n = big ? 16 : 8, len = big ? 4.4 : tell ? 2.2 : 1.3;
    for (let i = 0; i < n; i++) {   // the spines (the body covers their roots)
      const a = i / n * Math.PI * 2 + (big ? 0.15 : 0), ca = Math.cos(a), sa = Math.sin(a), w = big ? 1.1 : 0.8, px = -sa, py = ca;
      A.poly([[c + ca * (r - 1) + px * w, c + sa * (r - 1) + py * w], [c + ca * (r + len), c + sa * (r + len)], [c + ca * (r - 1) - px * w, c + sa * (r - 1) - py * w]], '#e8d8a8');
      A.fill(c - r - 6, c - r - 6, c + r + 6, c + r + 6, (x, y) => Math.hypot(x - c, y - c) < r + len * 0.45 ? BACK[1] : null, ['#e8d8a8']);
    }
    A.fill(0, 0, S, S, (x, y) => {   // the round body
      const u = (x - c) / r, v = (y - c) / r, d = u * u + v * v;
      if (d > 1) return null;
      const l = -0.45 * u - 0.75 * v + (1 - d) * 0.5;
      return lerpColor(softTone(BACK, l), softTone(BELLY, l + 0.4), smooth01(-0.05, 0.3, v));
    });
    for (const [u, v] of [[-0.12, -0.6], [0.28, -0.5], [0.58, -0.2], [0.04, -0.28], [-0.42, -0.3], [0.32, -0.08], [-0.2, -0.02]])   // dark spots on its back
      A.ell(c + u * r, c + v * r, Math.max(0.55, r * 0.085), Math.max(0.5, r * 0.075), BACK[0]);
    A.soft(c + r * 0.2, c + r * 0.22 + flap * 0.6, Math.max(1.6, Math.min(3, r * 0.2)), Math.max(0.9, Math.min(1.6, r * 0.1)), BELLY, null, 0.6);   // the little fin, flapping
    A.outline();
    const ex = c - Math.max(3, r * 0.45), ey = c - Math.max(2, r * 0.3), er = Math.max(1.5, r * 0.2);
    A.ell(ex, ey, er, er, '#ffffff'); A.ell(ex - er * 0.35, ey + er * 0.1, er * 0.5, er * 0.55, INK); A.ell(ex - er * 0.55, ey - er * 0.2, er * 0.18, er * 0.18, '#ffffff');   // a bulging eye
    A.ell(ex + er * 0.2, ey - er * 1.05, er * 0.9, er * 0.3, BACK[1], null, -0.2);                        // its brow
    const mx = c - r + 0.8, my = c + r * 0.12;
    if (gulp) { A.ell(mx + 0.2, my, 1.3, 1.2, '#b0405a'); A.ell(mx + 0.2, my, 0.6, 0.6, '#3a0a14'); }   // an O of a mouth
    else A.line(mx, my, mx + 1.4, my + 0.3, BACK[0], null, 0.45);
    A.ell(c - r * 0.05, c - r * 0.74, r * 0.24, r * 0.1, '#fff6d8', null, -0.2);                           // a glossy highlight
    return A.canvas();
  });
}
// the pufferfish's spike, flying out along `ang` (14 x 14, centred): a brown root to an ivory needle tip
function pufferSpikeArt(ang) {
  return oceanArt('spk' + Math.round(ang * 100), () => {
    const A = mArt(14, 14), ca = Math.cos(ang), sa = Math.sin(ang), px = -sa, py = ca;
    A.poly([[7 - ca * 3.6 + px * 1.1, 7 - sa * 3.6 + py * 1.1], [7 + ca * 5, 7 + sa * 5], [7 - ca * 3.6 - px * 1.1, 7 - sa * 3.6 - py * 1.1]], '#c4883c');
    A.fill(0, 0, 14, 14, (x, y) => { const k = (x - 7) * ca + (y - 7) * sa; return k < -1 ? '#6a3e18' : k > 2 ? '#fff8e0' : null; }, ['#c4883c']);
    A.outline();
    return A.canvas();
  });
}

// a palm tree on the beach (decor 'palm'): a ringed trunk curving up (lean), a crown of feathered fronds and three
// coconuts, swaying (k: 0..PALM_SWAYS-1). PALM_W wide, h + 26 tall, its foot at the bottom middle. Scenery: no outline
const PALM_W = 76, PALM_SWAYS = 8;
function palmArt(h, lean, k) {
  return oceanArt('palm' + h + lean + k, () => {
    const H = h + 26, A = mArt(PALM_W, H), bx = PALM_W / 2, by = H - 0.5, sway = Math.sin(k / PALM_SWAYS * Math.PI * 2);
    const at = i => { const u = i / h; return [bx + lean * u * u * 12 + sway * u * 1.5, by - i]; };
    for (let i = 0; i <= h; i += 0.34) {   // the trunk: ringed, lit from the left, tapering
      const [x, y] = at(i), w = 2.6 - i / h * 0.9, ring = (i % 3) < 0.5;
      A.ell(x, y, w, 0.5, ring ? '#5a3418' : '#7a4c26');
      A.ell(x - w * 0.25, y, w * 0.62, 0.45, ring ? '#7a4c26' : '#a8703c');
      A.ell(x - w * 0.45, y, w * 0.25, 0.4, ring ? '#8a5a32' : '#c89058');
    }
    const [tx, ty] = at(h);
    const frond = (a, len, back) => {   // a rachis arching out and drooping, its leaflets combed down either side
      for (let j = 0; j < len; j += 0.5) {
        const u = j / len, fx = tx + Math.cos(a) * j, fy = ty - 1 + Math.sin(a) * j * 0.55 + u * u * 10;
        const nx = Math.cos(a), dir = Math.sign(nx) || 1, L = (1 - u * 0.75) * 4.2, droop = 1.6 + u * 2;
        for (const sd of [-1, 1]) A.line(fx, fy, fx + sd * 1.4 * (1 - u) - dir * 0.6, fy + sd * L * 0.35 + droop, back ? '#2a6e34' : sd < 0 ? '#6cc05a' : '#3f9a4a', null, 0.45);
        A.ell(fx, fy, 0.45, 0.45, back ? '#3a7a3a' : '#7ac860');
      }
    };
    for (let f = 0; f < 7; f++) frond(-Math.PI / 2 + (f - 3) * 0.5 + 0.25 + sway * 0.08, 15 + (f % 2) * 4, true);    // the far fronds, in shade
    for (const [dx, dy] of [[-1.8, 2.6], [1.8, 3], [0, 3.8]]) A.soft(tx + dx, ty + dy, 1.7, 1.6, ['#2e1a0c', '#4a2c14', '#6a4220', '#8a5a32', '#b08050']);   // coconuts
    for (let f = 0; f < 6; f++) frond(-Math.PI / 2 + (f - 2.5) * 0.62 + sway * 0.08, 17 + (f % 2) * 4, false);
    return A.canvas();
  });
}

// Pufferfish reassemble within their harmless cooldown: swirling brown wisps condense into colored fragments.
function drawPufferReform(ctx,cx,cy,u,t) {
  const k=smooth01(0.12,0.94,u),spread=(1-k)*12;
  ctx.save();
  for(let i=0;i<9;i++){
    const a=i*Math.PI*2/9+(1-u)*3,rad=(1-k)*(i%2?21:15)+2;
    const x=cx+Math.cos(a)*rad,y=cy+Math.sin(a)*rad*0.75;
    fGlow(ctx,x,y,9*(1-k)+3,i%2?'#a67b4f':'#6f4d34',(0.1+Math.sin(u*Math.PI)*0.25)*(1-k));
  }
  const img=pufferArt(6,0,(t>>3)%4,false),src=img.canvas,R=img.r||1,cell=4;
  // Each tiny piece travels along a short spiral into its real place, rather than popping in as a full fish.
  for(let sy=0;sy<src.height;sy+=cell)for(let sx=0;sx<src.width;sx+=cell){
    const hash=((sx*17+sy*31)%97)/97,alpha=clamp((u*1.3-hash*0.25-0.12)/0.45,0,1);
    if(alpha<=0)continue;
    const x=(sx+cell/2)/R-img.width/2,y=(sy+cell/2)/R-img.height/2,a=(1-k)*0.7;
    const d=spread*(0.35+hash*0.65),r=Math.hypot(x,y)||1;
    const xx=x*Math.cos(a)-y*Math.sin(a)+x/r*d,yy=x*Math.sin(a)+y*Math.cos(a)+y/r*d;
    ctx.globalAlpha=alpha;ctx.drawImage(img,sx/R,sy/R,Math.min(cell,src.width-sx)/R,Math.min(cell,src.height-sy)/R,cx+xx-cell/R/2,cy+yy-cell/R/2,Math.min(cell,src.width-sx)/R,Math.min(cell,src.height-sy)/R);
  }
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3+u*5,r=(1-k)*20;
    if(u>0.15&&u<0.9)umbraSpark(ctx,cx+Math.cos(a)*r,cy+Math.sin(a)*r*0.7,0.5,'#edcf9b',Math.sin(u*Math.PI)*0.6);
  }
  ctx.restore();
}
