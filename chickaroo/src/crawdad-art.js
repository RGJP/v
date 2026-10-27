'use strict';
// How 4-1's CRAWDAD looks (its behaviour: enemies-gumbo.js). A crawfish in profile, facing right, painted pixel by pixel:
// every shell part shaded by its own little light (upper left) -- a dark rim, a lit crown and a glint -- then the whole
// silhouette gets one ink outline. Baked once per pose and palette (CRAW_ART); the claws are separate pieces so they can
// lunge out on their arms. The body's anchor: x 22 is the crawdad's centre, y 33 the ground it walks on.
const CRAW_PAL = {
  live:   { shell: ['#4a0e06', '#86200e', '#c63c1a', '#ec6a30', '#ffb47a'], belly: '#f4a070', speck: '#6a1608', far: ['#3a0a04', '#6a1a0a', '#9a2e14', '#c04a22', '#e0703a'] },
  cooked: { shell: ['#8a1a0c', '#d0341a', '#ff5a30', '#ff8a5a', '#ffd4b0'], belly: '#ffc4a0', speck: '#a82812', far: ['#6a140a', '#a82814', '#e0401e', '#ff6a3a', '#ff9a6a'] },
};
const CRAW_ART = {};
// a canvas painted ART_R times finer than the game (hires.js): draw on it in game px; return hiRes(c) when it's done
const crawCanvas = (w, h) => { const c = makeCanvas(w * ART_R, h * ART_R), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.setTransform(ART_R, 0, 0, ART_R, 0, 0); return [c, g]; };
const CQ = 1 / ART_R;   // one art pixel, in game px
// a shaded ellipse: each pixel's tier from a light up and to the left, rounder toward the middle
function crawShell(g, cx, cy, rx, ry, pal) {   // (art pixel by art pixel: hires.js)
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += CQ) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += CQ) {
    const nx = (x + CQ / 2 - cx) / rx, ny = (y + CQ / 2 - cy) / ry, d = nx * nx + ny * ny;
    if (d > 1) continue;
    const l = -0.55 * nx - 0.75 * ny + (1 - d) * 0.6;
    g.fillStyle = pal[l > 0.95 ? 4 : l > 0.45 ? 3 : l > -0.05 ? 2 : l > -0.5 ? 1 : 0];
    g.fillRect(x, y, CQ, CQ);
  }
}
// a tapering stroke of shaded discs (fingers, antennae roots): mid tone, lit along its top
function crawStroke(g, x0, y0, x1, y1, r0, r1, pal) {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) {
    const k = i / n, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k, r = r0 + (r1 - r0) * k;
    crawShell(g, x, y, Math.max(0.6, r), Math.max(0.6, r), pal);
  }
}
// one ink outline round everything painted so far
function crawOutline(c) {   // (two art pixels, on the fine canvas)
  const g = c.getContext('2d'), W = c.width, H = c.height;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = INK;
  for (let pass = 0; pass < 2; pass++) {
    let img; try { img = g.getImageData(0, 0, W, H); } catch (e) { break; }
    const a = img.data, solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && a[(y * W + x) * 4 + 3] > 40, edge = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) edge.push(x, y);
    for (let i = 0; i < edge.length; i += 2) g.fillRect(edge[i], edge[i + 1], 1, 1);
  }
  g.restore();
}
// a fine stroke through points (whiskers, legs, stems, seams): w game px wide
function crawLine(g, pts, col, w = 0.6) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = g.lineJoin = 'round'; g.beginPath(); for (const [x, y] of pts) g.lineTo(x, y); g.stroke(); }
const crawDot = (g, x, y, col, r = 0.45) => { g.fillStyle = col; g.beginPath(); g.arc(x + 0.5, y + 0.5, r, 0, Math.PI * 2); g.fill(); };
// the body (everything but the two claws): legs, tail, carapace, head, eyes, antennae, and the toque unless it's cooked
function crawBakeBody(kind, frame) {
  const P = CRAW_PAL[kind], S = P.shell, [c, g] = crawCanvas(48, 36), px = (x, y, col) => crawDot(g, x, y, col);
  // the tail: plates curling down behind, each with a lit edge, then the fan
  crawShell(g, 5, 30, 2.6, 3.2, S); crawShell(g, 3.5, 31.5, 2, 2.2, S); crawShell(g, 6.5, 32, 2.2, 1.8, S);
  crawShell(g, 9.5, 28.5, 3.2, 3.4, S); crawShell(g, 13, 27, 3.8, 4, S); crawShell(g, 16.5, 26, 4, 4.4, S);
  for (const [x, y0] of [[11, 25], [15, 23]]) crawLine(g, [[x + 0.5, y0], [x + 0.2, y0 + 3], [x + 0.6, y0 + 6]], S[0], 0.6);   // the seams between plates
  // the carapace and head, a groove between them, speckles, a pale belly line, the spiny rostrum
  crawShell(g, 24, 24.5, 7.5, 5.5, S);
  crawShell(g, 31, 24.5, 4.5, 4.2, S);
  crawLine(g, Array.from({ length: 17 }, (_, i) => [28.5 + Math.sin(i / 16 * Math.PI), 20 + i / 2]), S[1], 0.6);   // the groove
  for (const [x, y] of [[20, 22], [23, 21], [26, 23], [21, 26], [25, 26], [32, 22], [18, 24]]) px(x, y, P.speck);
  crawLine(g, [[18, 29.5], [26, 29.8], [33.5, 29.4]], P.belly, 0.7);
  g.fillStyle = S[2]; g.beginPath(); g.moveTo(34.6, 23.2); g.lineTo(39.4, 22); g.lineTo(35.4, 25.2); g.fill();   // the spiny rostrum
  // eyes on stalks: glossy black beads
  crawLine(g, [[32.5, 21.6], [32.8, 20], [33.5, 18.6]], S[1], 0.9);   // eye on its stalk
  crawShell(g, 33.5, 17.5, 1.6, 1.6, ['#000000', '#120408', '#1e0a10', '#2a1218', '#3a1a20']); crawDot(g, 32.6, 16.6, '#ffffff', 0.4);
  // antennules: two short forks forward
  crawLine(g, [[36, 21.5], [39.6, 19.4]], S[1], 0.5); crawLine(g, [[36, 22.5], [39.8, 21.6]], S[1], 0.5);   // antennules
  crawOutline(c);
  // walking legs (fine, so no ink round them): four, jointed -- a lit thigh, a dark shin -- feet stepping in turn
  for (let i = 0; i < 4; i++) {
    const hx = 19.5 + i * 3, step = (i + frame) % 2, kx = hx + 1, ky = 31 - step, fx = hx - 1 + step * 2;
    crawLine(g, [[hx, 29], [kx, ky]], S[3], 0.75); crawLine(g, [[kx, ky], [fx, 33.6]], S[1], 0.6);
  }
  // the long antennae sweep back over everything (after the outline: fine whiskers, no ink round them)
  crawLine(g, Array.from({ length: 29 }, (_, k) => { const u = k / 28; return [35.5 - u * 29, 20.5 - Math.sin(u * 1.9) * 15 - u * 2]; }), S[1], 0.5);   // the long antennae
  crawLine(g, Array.from({ length: 21 }, (_, k) => { const u = k / 20; return [34.5 - u * 20, 20.5 - Math.sin(u * 1.6) * 9]; }), S[1], 0.45);
  if (kind === 'live') {   // the toque: its band snug on top of the head (just behind the eye), tipped back a touch, a puffed, pleated crown
    const W = ['#b8b4c8', '#d8d4e4', '#f0eef6', '#ffffff', '#ffffff'];
    const [h, hg] = crawCanvas(48, 36);
    hg.save(); hg.translate(28, 20.6); hg.rotate(-0.16); hg.translate(-28, -20.6);
    crawShell(hg, 24.8, 13.4, 3.1, 2.9, W); crawShell(hg, 31.2, 13.6, 2.9, 2.7, W); crawShell(hg, 28, 11.6, 4, 3.7, W);   // the crown's three puffs
    const band = hg.createLinearGradient(0, 15, 0, 21); band.addColorStop(0, '#ffffff'); band.addColorStop(0.6, '#e8e4f0'); band.addColorStop(1, '#bcb8cc');
    hg.fillStyle = band; hg.beginPath(); hg.moveTo(24.4, 15.2); hg.lineTo(31.6, 15.2); hg.lineTo(31.9, 20.9); hg.lineTo(24.1, 20.9); hg.closePath(); hg.fill();   // the band, flaring a hair at the bottom
    for (const x of [26, 28, 30]) crawLine(hg, [[x, 10.6 + (x % 4 ? 0.6 : 0)], [x + 0.1, 15]], '#cfcadc', 0.45);   // pleats
    crawLine(hg, [[24.6, 16.2], [31.4, 16.2]], '#ffffff', 0.4);
    hg.restore();
    crawOutline(h);
    g.drawImage(h, 0, 0, 48, 36);
  }
  return hiRes(c);
}
// a claw (the near one, or the far one in darker tones), its palm at the left-middle of a 20x16 canvas:
// open a crack, gaping wide (winding up) or clamped shut (the snap); knobbly palm, serrated fingers
function crawBakeClaw(kind, far, mode) {
  const P = CRAW_PAL[kind], S = far ? P.far : P.shell, [c, g] = crawCanvas(24, 18), gap = mode === 'wide' ? 4 : mode === 'shut' ? 0 : 2;
  crawShell(g, 6.5, 9, 5.5, 4.5, S);
  crawStroke(g, 11, 7, 21, 8 - gap, 2.3, 0.8, S);    // the upper finger (moves)
  crawStroke(g, 11, 11, 19.5, 10 + gap, 2, 0.7, S);  // the lower finger (fixed)
  for (const [x, y] of [[4, 6], [6, 5], [8, 7], [3, 9], [6, 8], [9, 5]]) crawDot(g, x, y, S[4], 0.5);   // knobbly tubercles
  crawOutline(c);
  for (let x = 13; x <= 18; x += 2) { crawDot(g, x, 8 - gap * (x - 11) / 10 + 1, S[0], 0.4); crawDot(g, x + 1, 10 + gap * (x - 11) / 9 - 1, S[0], 0.4); }   // serrations
  return hiRes(c);
}
function crawArt(kind) {
  if (CRAW_ART[kind]) return CRAW_ART[kind];
  const A = { body: [crawBakeBody(kind, 0), crawBakeBody(kind, 1)], near: {}, far: {} };
  for (const m of ['open', 'wide', 'shut']) { A.near[m] = crawBakeClaw(kind, false, m); A.far[m] = crawBakeClaw(kind, true, m); }
  return (CRAW_ART[kind] = A);
}
// an arm out to a claw: a shaded rod, ink outlined, from (x0, y) to (x1, y), in body-canvas coordinates
function crawArm(ctx, x0, x1, y, pal) {
  if (x1 <= x0) return;
  fRoundRect(ctx, x0, y - 2, x1 - x0, 5, 2, INK);   // (in fine pixels: hires.js)
  const gr = ctx.createLinearGradient(0, y - 1.4, 0, y + 1.6); gr.addColorStop(0, pal[3]); gr.addColorStop(0.45, pal[2]); gr.addColorStop(1, pal[1]);
  fRoundRect(ctx, x0, y - 4 / 3, x1 - x0, 11 / 3, 1.6, gr);
  fEll(ctx, (x0 + x1) / 2, y + 0.5, 0.7, 1.6, pal[0]);   // the joint
}
// draw a crawdad standing at (x, y = its feet), facing f; `reach`: how far its claws are thrust out (px; negative = drawn
// back), `mode`: the claws' pose, `frame`: its legs, `kind`: 'live' or 'cooked'
const CRAW_SCALE = 0.8;
function drawCrawdad(ctx, x, y, f, reach, mode, frame, kind) {
  const K = CRAW_SCALE; reach /= K;   // (drawn a size smaller; the claws still reach as far as its hitbox does)
  const A = crawArt(kind), P = CRAW_PAL[kind], fr = Math.round(reach * 0.8);
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(f * K, K); ctx.translate(-22, -33);
  crawArm(ctx, 31, 34 + fr, 22, P.far); ctx.drawImage(A.far[mode], 33 + fr, 13);   // the far claw, behind
  ctx.drawImage(A.body[frame], 0, 0);
  crawArm(ctx, 28, 33 + reach, 27, P.shell); ctx.drawImage(A.near[mode], 32 + reach, 18);   // the near claw, in front
  ctx.restore();
}

// ── ANDOUILLE: a link of smoked sausage on two little wheels, facing right (enemies-gumbo.js has what it does) ──
// The casing is a shaded capsule (lit from the upper left), wrinkled toward its tied-off ends, flecked with spice and
// fat, with a scowling face at the front; one ink outline round it. Baked once; its wheels turn at draw time.
const SAUSAGE_PAL = ['#4a0c08', '#7a1a12', '#b02c1e', '#d8503a', '#ff9a80'];
let SAUSAGE_ART = null;
function sausageArt() {
  if (SAUSAGE_ART) return SAUSAGE_ART;
  const [c, g] = crawCanvas(34, 16), S = SAUSAGE_PAL;
  const cx = 17, cy = 8, rx = 14.5, ry = 5.5;
  for (let y = 1; y < 15; y += CQ) for (let x = 1; x < 33; x += CQ) {   // the capsule: a squarish superellipse
    const nx = (x + CQ / 2 - cx) / rx, ny = (y + CQ / 2 - cy) / ry, d = nx ** 4 + ny * ny;
    if (d > 1) continue;
    const l = -0.35 * nx - 0.85 * ny + (1 - d) * 0.5;
    g.fillStyle = S[l > 0.85 ? 4 : l > 0.35 ? 3 : l > -0.15 ? 2 : l > -0.6 ? 1 : 0]; g.fillRect(x, y, CQ, CQ);
  }
  for (const x of [5, 7, 27, 29]) crawLine(g, [[x + 0.5, 4], [x + 0.2, 7.5], [x + 0.6, 11.5]], S[1], 0.45);   // wrinkles by the ends
  const rng = mulberry32(77);
  for (let i = 0; i < 16; i++) { const x = 6 + Math.floor(rng() * 20), y = 4 + Math.floor(rng() * 8); crawDot(g, x, y, i % 3 ? '#5a0e08' : '#ffd8c0', 0.42); }   // spice and fat
  crawLine(g, [[9, 3.6], [22.6, 3.6]], S[4], 0.6);   // the shine along its top
  crawOutline(c);
  for (const [x, d] of [[1.5, -1], [32.5, 1]]) { crawDot(g, x - 0.5, 7, INK, 0.8); crawLine(g, [[x, 7.5], [x + d * 1.6, 5.6], [x + d * 2.6, 4.6]], '#e8d8b0', 0.4); crawLine(g, [[x, 8.5], [x + d * 1.4, 10]], '#e8d8b0', 0.4); }   // the tied ends
  crawLine(g, [[23, 3.4], [25.4, 4.2], [27.6, 5.6]], INK, 0.8);   // the face: an angry brow, a beady eye, a gritted grin
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(25.6, 6.6, 1.6, 1.5, 0, 0, Math.PI * 2); g.fill(); crawDot(g, 25.4, 6.4, INK, 0.75);
  g.fillStyle = INK; g.beginPath(); g.ellipse(26.5, 11, 2.6, 1.1, 0, 0, Math.PI * 2); g.fill(); crawDot(g, 24.8, 10.3, '#fff6e0', 0.35); crawDot(g, 26.6, 10.3, '#fff6e0', 0.35);
  return (SAUSAGE_ART = hiRes(c));
}
// draw one at (x = its middle, y = the ground), facing f; `spin` turns the wheels; `jolt` (0/1) bumps the body a pixel
function drawAndouilleArt(ctx, x, y, f, spin, jolt, tilt = 0) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (tilt) ctx.rotate(tilt); ctx.scale(f, 1);   // (tilt: leaning with a slope, round the point between its wheels)
  const wheel = gcArt('wheel', () => { const [c, g] = crawCanvas(10, 10); crawShell(g, 5, 5, 3.6, 3.6, ['#1e1a22', '#2e2a34', '#4a4652', '#6a6674', '#9a96a4']); crawOutline(c); return hiRes(c); });
  for (const wx of [-8, 8]) {   // wheels: shaded discs, a hub, two turning spokes (fine: hires.js)
    ctx.drawImage(wheel, wx - 4.5, -8);
    for (const a of [spin, spin + Math.PI / 2]) fLine(ctx, wx + 0.5 - Math.cos(a) * 2.4, -3 - Math.sin(a) * 2.4, wx + 0.5 + Math.cos(a) * 2.4, -3 + Math.sin(a) * 2.4, '#c8c4d8', 1);
    fBlob(ctx, wx + 0.5, -3, 0.7, '#e8e4f0');
  }
  ctx.drawImage(sausageArt(), -17, -20 - jolt);
  ctx.restore();
}

// ── the rest of 4-1's critters, to the same standard: every part shaded by its own light (upper left), one ink outline
// round the silhouette, baked once per pose; faces and anything that moves drawn live over the top ──
const GC_ART = {};
const gcArt = (key, fn) => GC_ART[key] || (GC_ART[key] = fn());
// a shaded blob of any shape: `inside(x, y)` -> [nx, ny] (both -1..1 across it) or null, shaded like crawShell
function gcShade(g, x0, y0, x1, y1, inside, pal, extra) {   // (art pixel by art pixel: hires.js)
  for (let y = y0; y <= y1; y += CQ) for (let x = x0; x <= x1; x += CQ) {
    const n = inside(x + CQ / 2, y + CQ / 2);
    if (!n) continue;
    const [nx, ny] = n, d = Math.min(1, nx * nx + ny * ny);
    let l = -0.55 * nx - 0.75 * ny + (1 - d) * 0.6;
    if (extra) l += extra(x, y, nx, ny);
    g.fillStyle = pal[l > 0.95 ? 4 : l > 0.45 ? 3 : l > -0.05 ? 2 : l > -0.5 ? 1 : 0];
    g.fillRect(x, y, CQ, CQ);
  }
}

// ONION (26 x 30; the bulb's middle at 13, 18): a teardrop bulb in papery skin, meridian stripes curving round it; once
// a layer's peeled, the pale inner bulb, smaller. A curled green sprout and a wisp of roots
function onionArt(outer) {
  return gcArt('onion' + outer, () => {
    const [c, g] = crawCanvas(26, 30), r = outer ? 8.5 : 6.5, cx = 13, cy = 18;
    const pal = outer ? ['#7a4818', '#a8682a', '#c8904a', '#e8b878', '#fff0c8'] : ['#a88a5a', '#c8a878', '#e4cca4', '#f4e4c8', '#ffffff'];
    const inside = (x, y) => {   // a teardrop: round below its middle, tapering to a point above
      const dy = y - cy; let w;
      if (dy >= 0) { if (dy > r) return null; w = r * Math.sqrt(1 - (dy / r) ** 2); }
      else { const u = -dy / (r * 1.5); if (u > 1) return null; w = r * Math.sqrt(1 - u * u) * (1 - u * 0.6); }
      return Math.abs(x - cx) <= w ? [(x - cx) / r, dy / r] : null;
    };
    gcShade(g, 2, 3, 24, 28, inside, pal, (x, y, nx) => Math.abs(Math.sin(nx * 2.6)) < 0.18 ? -0.45 : 0);   // the meridian stripes
    crawOutline(c);
    crawLine(g, [[13.5, 7], [13.4, 5], [12.6, 3.6], [13, 2.6], [14.4, 3.2], [15.6, 2.4], [16.8, 2.6]], '#3a7a28', 1);   // the sprout, curling
    crawLine(g, [[13.3, 6], [12.8, 4]], '#8ad860', 0.4);
    for (const dx of [-3, -1, 1, 3]) crawLine(g, [[cx + dx + 0.5, cy + r + 0.6], [cx + dx + 0.5 + Math.sign(dx) * 0.4, cy + r + 2], [cx + dx + 0.5 + Math.sign(dx) * 1.2, cy + r + 3.4]], '#e8d8b0', 0.4);   // roots
    return hiRes(c);
  });
}
// draw an onion with its middle at (x, y): the bulb, then a sad, crying face (tears running, a wobbling mouth)
function drawOnionArt(ctx, x, y, outer, t) {
  const r = outer ? 8.5 : 6.5;
  ctx.drawImage(onionArt(outer), Math.round(x) - 13, Math.round(y) - 18);
  const cx = Math.round(x), cy = Math.round(y);   // (in fine pixels: hires.js)
  for (const ex of [-3, 3]) { fEll(ctx, cx + ex, cy, 2.2, 2.2, INK); fEll(ctx, cx + ex, cy, 1.4, 1.5, '#ffffff'); fEll(ctx, cx + ex + 0.3 * Math.sign(ex), cy + 0.5, 0.6, 0.7, INK); fBlob(ctx, cx + ex - 0.5, cy - 0.6, 0.35, '#ffffff'); }   // big wet eyes
  fLine(ctx, cx - 6, cy - 3.4, cx - 3, cy - 4.8, '#5a3a1a', 2); fLine(ctx, cx + 6, cy - 3.4, cx + 3, cy - 4.8, '#5a3a1a', 2);   // brows, sadly peaked
  const k = (t >> 3) % 6;
  fEll(ctx, cx - 3.5, cy + 3 + (k % 3), 0.55, 1, '#9ad8ff'); fEll(ctx, cx + 3.5, cy + 3 + ((k + 1) % 3), 0.55, 1, '#9ad8ff');   // tears running
  fEll(ctx, cx + 0.5, cy + Math.round(r * 0.5) + ((t >> 4) % 2) + 0.5, 1.6, 0.5, INK);
}
// ONION GAS: soft, sickly puffs (each solid, then laid down see-through as one so they never show rings)
function drawTearCloudArt(ctx, cx, cy, r, a, t) {
  const n = Math.ceil(r * 2 + 6), key = 'tear' + n, cv = GC_ART[key] || (GC_ART[key] = crawCanvas(n * 2, n * 2)[0]), g = cv.getContext('2d');
  g.clearRect(0, 0, n * 2, n * 2);
  for (let i = 0; i < 6; i++) { const k = i / 6 * Math.PI * 2 + t * 0.02, rr = r * 0.5; blob(g, n + Math.cos(k) * rr, n + Math.sin(k) * rr * 0.6, Math.round(r * 0.55), i % 2 ? '#e8f0a0' : '#c8e080'); }
  blob(g, n, n, Math.round(r * 0.6), '#f0f8c0');
  ctx.globalAlpha = a; ctx.drawImage(cv.hi || (cv.hi = hiRes(cv)), Math.round(cx - n), Math.round(cy - n)); ctx.globalAlpha = 1;
}

// BELL PEPPER (32 x 32; its feet at 16, 31): three lobes, broad shoulders, creases, a big glossy shine. Green with its
// stem on; red with rage once the stem's knocked off (its open top showing the pale seeds inside). squash 0..2
function pepperArt(red, squash) {
  return gcArt('pep' + red + squash, () => {
    const [c, g] = crawCanvas(32, 32), pal = red ? ['#5a0c08', '#a01c10', '#d8301a', '#ff6a4a', '#ffc0a8'] : ['#0e3a10', '#1e6a1e', '#3a9a2a', '#6ac850', '#c8f0a0'];
    const sq = squash * 1.5, bot = 30, ry = 10 - sq / 2, rx = 11 + sq / 2, cy = bot - ry - 2;
    const inside = (x, y) => {
      const nx = (x - 16) / rx, ny = (y - cy) / ry;
      const body = nx * nx + ny * ny <= 1;
      const lobe = [-6.5, 0, 6.5].some(dx => ((x - 16 - dx) / 5.5) ** 2 + ((y - (bot - 5)) / 4.5) ** 2 <= 1);
      return body || lobe ? [nx, ny] : null;
    };
    gcShade(g, 2, 4, 30, 31, inside, pal, (x, y, nx) => (Math.abs(x - 12.5) < 0.6 || Math.abs(x - 19.5) < 0.6) && y > cy - ry + 3 ? -0.6 : 0);   // the creases
    if (red) { g.fillStyle = '#3a0806'; g.beginPath(); g.ellipse(16.5, cy - ry + 2.5, 4.2, 2.2, 0, 0, Math.PI * 2); g.fill(); for (const dx of [-2, 0, 2]) crawDot(g, 16 + dx, cy - ry + 2, '#fff0c8', 0.5); }   // the open top, seeds inside
    crawOutline(c);
    crawLine(g, [[10.6, cy - 3.6], [8.2, cy - 3.4], [7.6, cy - 1]], '#ffffff', 0.8); crawDot(g, 9, cy + 1, '#ffffff', 0.45);   // the shine
    if (!red) { const sy = Math.round(cy - ry); crawStroke(g, 16, sy + 1, 16, sy - 3, 1.6, 1.2, ['#1a4a10', '#2e6a22', '#3a8a2a', '#5aaa3a', '#8ad860']); crawStroke(g, 16, sy - 3, 19, sy - 5, 1.1, 0.8, ['#1a4a10', '#2e6a22', '#3a8a2a', '#5aaa3a', '#8ad860']); }   // the stem, curling
    return hiRes(c);
  });
}
function drawPepperArt(ctx, x, b, red, squash, t) {
  ctx.drawImage(pepperArt(red, squash), Math.round(x) - 16, Math.round(b) - 31);
  const sq = squash * 1.5, cy = Math.round(b - 1 - (10 - sq / 2) - 2), cx = Math.round(x);
  fLine(ctx, cx - 7, cy - 2.6, cx - 2.6, cy - 0.6, INK, 3); fLine(ctx, cx + 7, cy - 2.6, cx + 2.6, cy - 0.6, INK, 3);   // furious brows (fine: hires.js)
  for (const ex of [-4.5, 4.5]) { fEll(ctx, cx + ex, cy + 1.6, 1.8, 1.8, '#ffffff'); fEll(ctx, cx + ex - Math.sign(ex) * 0.4, cy + 2, 0.9, 1, INK); }
  if (red) { fRoundRect(ctx, cx - 3, cy + 5, 7, 2, 0.8, INK); for (const dx of [-2, 0, 2]) fRect(ctx, cx + dx + 1 / 3, cy + 5.33, 2 / 3, 2 / 3, '#fff6e0'); } else fRoundRect(ctx, cx - 2, cy + 5.17, 5, 2 / 3, 0.3, INK);   // a scowl (gritted teeth, when it's red)
}

// OKRA SPITTER (26 x 34, facing right; its foot at 13, 33): a naturally tapered ridged pod,
// with a broad calyx at the stem, fine fuzz, and an expressive seed-spitting face. swell 0..2.
function okraArt(swell){
  return gcArt('naturalOkra'+swell,()=>{
    const A=mArt(26,34),C=['#244323','#3b6631','#638e43','#96b464','#c6d59b'];
    A.fill(5,7,22,33,(x,y)=>{
      const u=(y-7)/25;if(u<0||u>1)return null;
      const cx=13+Math.sin(u*2.4)*.7,rx=(5.4+swell*.65*Math.sin(u*Math.PI))*Math.pow(1-u,.48)+.3;
      const v=(x-cx)/rx;if(Math.abs(v)>1)return null;
      const rib=Math.cos(v*Math.PI*3)*.11;
      return softTone(C,-v*.6+Math.sqrt(1-v*v)*.35+rib-u*.16);
    });
    A.poly([[7.2,6.5],[10.6,5.2],[10.3,3.9],[14.2,4.8],[18.4,5.7],[17.2,8.5],[15.2,7.9],[14.7,10],[12,8.6],[9.6,10.1],[9.8,8],[7.3,8.7]],'#66894a');
    A.soft(13,5.9,5.8,1.5,['#385a2c','#5b7d3a','#8a9f54','#b3be7c','#d4d7a5']);
    A.line(12.8,5.4,12,1.2,'#5e7e3c',null,1.4);A.line(12.3,4.7,11.8,1.4,'#b6c187',null,.45);
    for(let i=0;i<18;i++){
      const y=10+i*1.1,u=(y-7)/25,cx=13+Math.sin(u*2.4)*.7,rx=5.4*Math.pow(1-u,.48);
      for(const side of [-1,1])A.line(cx+side*rx,y,cx+side*(rx+.7),y-.2,'#b7c58f',null,.34);
    }
    A.soft(10.2,15,1.1,3,['#6b944e','#9db876','#bed19b','#dce3ba','#edf0d4'],true,.1);
    return A.outline('#294527',1).canvas();
  });
}
function drawOkraArt(ctx,x,b,f,swell,puckered){
  ctx.save();ctx.translate(Math.round(x),Math.round(b));ctx.scale(f,1);ctx.drawImage(okraArt(swell),-13,-33);
  for(const [ex,ey]of[[-.8,-24.5],[3,-24]]){fEll(ctx,ex,ey,1.2,1.3,'#f1ead2');fEll(ctx,ex+.45,ey+.2,.5,.8,'#31462b');fLine(ctx,ex-1.3,ey-1.5,ex+1.1,ey-.7,'#38522c',.6);}
  fEll(ctx,4.5,-21,1.7,puckered?1.6:1.2,'#77974c');fEll(ctx,5,-21,puckered?.8:1.05,puckered?.8:.6,'#29432a');ctx.restore();
}
function sausageCrumbArt(seed){
  return gcArt('sausageCrumb'+seed,()=>{
    const A=mArt(8,6),C=['#653629','#92513b','#b97855','#d09c72','#e5c29b'];
    A.poly([[1,1.7],[3,.4],[6,1.1],[7.2,3],[5.9,5.3],[2.1,5.1],[.7,3.7]],C[1]);A.soft(4,3,2.9,1.9,C,true,seed*.8);
    for(const [x,y]of[[2.2,2.3],[5,3.5],[4,1.6]])A.ell(x,y,.45,.35,seed%2?'#e4c7a4':'#c3a17e',true);
    return A.outline('#704433',1).canvas();
  });
}

// CELERY: the stalk (16 x 44, a ribbed tube lit from the left, the fire catching its right edge) and its leafy top
// (fronds of serrated leaves, 34 x 24). Drawn row by row so the stalk can bend as it walks
function celeryStalkArt() {
  return gcArt('celstalk', () => {
    const [c, g] = crawCanvas(16, 44), pal = ['#3a6a20', '#5a9a38', '#88c060', '#b8e08a', '#e4f8c4'];
    gcShade(g, 1, 0, 15, 43, (x, y) => Math.abs(x - 8) <= 6 ? [(x - 8) / 6, -0.2] : null, pal, (x) => (Math.abs(x - 5.5) < 0.6 || Math.abs(x - 9.5) < 0.6) ? -0.5 : (Math.abs(x - 7.5) < 0.6 ? 0.3 : 0));   // ribs
    crawLine(g, [[13.5, 0], [13.5, 44]], '#e8c070', 0.8);   // firelight down its edge
    for (let y = 6; y < 44; y += 9) crawLine(g, [[3.2, y + 0.5], [4.8, y + 0.3]], '#5a9a38', 0.5);   // nicks along the ribs
    crawOutline(c);
    return hiRes(c);
  });
}
function celeryLeavesArt() {
  return gcArt('celleaf', () => {
    // long thin stems fanning out of the stalk, each ending in a three-part serrated leaf, a pair of leaflets partway up
    const [c, g] = crawCanvas(48, 34), pal = ['#1e4a16', '#2e6a22', '#4a9a38', '#7ac858', '#b8f098'], bx = 24, by = 33;
    const stems = [[-1.15, 15], [-0.6, 19], [-0.05, 21], [0.5, 19], [1.05, 15]];
    const leaf = (x, y, a) => {   // three little serrated leaflets in a trident
      for (const d of [-0.7, 0, 0.7]) { const lx = x + Math.sin(a + d) * 3, ly = y - Math.cos(a + d) * 3; crawShell(g, lx, ly, 2.2, 1.8, pal); }
      crawShell(g, x, y, 1.6, 1.6, pal);
    };
    for (const [a, len] of stems) {
      leaf(bx + Math.sin(a) * len, by - Math.cos(a) * len, a);
      const mx = bx + Math.sin(a) * len * 0.55, my = by - Math.cos(a) * len * 0.55;
      for (const d of [-1, 1]) crawShell(g, mx + Math.cos(a) * 2.6 * d, my + Math.sin(a) * 2.6 * d, 1.8, 1.4, pal);
    }
    crawOutline(c);
    g.globalCompositeOperation = 'destination-over';   // the stems: thin, under the leaves
    for (const [a, len] of stems) crawLine(g, [[bx + 0.5, by + 0.5], [bx + 0.5 + Math.sin(a) * len, by + 0.5 - Math.cos(a) * len]], '#3a7a28', 0.8);
    g.globalCompositeOperation = 'source-over';
    return hiRes(c);
  });
}
