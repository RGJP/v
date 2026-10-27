'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 3-4 GUT FEELING: the creatures' sprites, rendered pixel by pixel
// ═══════════════════════════════════════════════════════════════════════════
// Each creature is modelled rather than drawn: a shape (with a height field for its surface), lit from the top left
// with a little specular shine, in its real material (translucent gel, flesh, keratin, stone, film, tin) and with
// its real anatomy inside it, dithered onto a palette ramp and outlined in ink. Every animation frame is baked once
// and cached (gutSprite), so drawing one is a single drawImage.

const GS_CACHE = new Map();
const gsRGB = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const gsPal = list => list.map(gsRGB);
const GS_L = (() => { const v = [-0.55, -0.68, 0.48], m = Math.hypot(...v); return v.map(a => a / m); })();   // the light: up and to the left
const GS_H = (() => { const v = [GS_L[0], GS_L[1], GS_L[2] + 1], m = Math.hypot(...v); return v.map(a => a / m); })();
// light a surface normal: [diffuse 0..1, specular 0..1]
function gsLight(nx, ny, nz) {
  const d = Math.max(0, nx * GS_L[0] + ny * GS_L[1] + nz * GS_L[2]);
  const s = Math.pow(Math.max(0, nx * GS_H[0] + ny * GS_H[1] + nz * GS_H[2]), 24);
  return [d, s];
}
// a value 0..1 onto a palette ramp, dithered
function gsRamp(pal, v, x, y) {
  const b = typeof BAYER4 !== 'undefined' ? BAYER4[(y & 3) * 4 + (x & 3)] : 0;
  return pal[clamp(Math.round(v * (pal.length - 1) + b * 0.9), 0, pal.length - 1)];
}
const gsMix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
// Bake (or fetch) a sprite: fn(x, y) gives [r, g, b] or [r, g, b, a] for a pixel inside, or null. Every empty pixel
// touching a solid one becomes `ink` (the outline); pass ink = null for none.
function gutSprite(key, w, h, fn, ink = '#1a0a10') {
  // painted at the fine screen's scale (hires.js): fn is asked about every art pixel, in game px (its centre, so an
  // integer still lands mid-pixel), and the ink line round it is two art pixels
  let c = GS_CACHE.get(key);
  if (c) return c;
  const S = ART_R, W = w * S, H = h * S;
  c = makeCanvas(W, H);
  const g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data, A = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = fn((x + 0.5) / S - 0.5, (y + 0.5) / S - 0.5);
    if (!v) continue;
    const i = (y * W + x) * 4;
    d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = v.length > 3 ? v[3] : 255; A[y * W + x] = d[i + 3];
  }
  if (ink) {
    const k = gsRGB(ink);
    for (let pass = 0; pass < 2; pass++) {
      const src = A.slice(), solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x] > 150;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (src[y * W + x]) continue;
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) { const i = (y * W + x) * 4; d[i] = k[0]; d[i + 1] = k[1]; d[i + 2] = k[2]; d[i + 3] = 255; A[y * W + x] = 255; }
      }
    }
  }
  g.putImageData(img, 0, 0);
  c = hiRes(c, S);
  GS_CACHE.set(key, c);
  return c;
}
// draw a sprite with its anchor (ax, ay) at (x, y), mirrored when flip
function gsDraw(ctx, spr, x, y, ax, ay, flip, subpixel = false) {
  const snap=subpixel?fSnap:Math.round;
  if (!flip) { ctx.drawImage(spr, snap(x - ax), snap(y - ay)); return; }
  ctx.save(); ctx.translate(snap(x), snap(y)); ctx.scale(-1, 1); ctx.drawImage(spr, -ax, -snap(ay)); ctx.restore();
}
// a height field's normal by finite differences (z(x, y) is the surface height, 0 outside)
function gsNormal(z, x, y, k = 1) {
  const nx = (z(x - 1, y) - z(x + 1, y)) * k, ny = (z(x, y - 1) - z(x, y + 1)) * k, m = Math.hypot(nx, ny, 1);
  return [nx / m, ny / m, 1 / m];
}

// ── gel: a gastric amoeba (or an enzyme globule) ────────────────────────────
const GEL_GREEN = gsPal(['#0c2a0e', '#164414', '#22601c', '#307e26', '#46a032', '#66c046', '#94dc6c', '#c8f4a4', '#f0ffe0']);
const GEL_PURPLE = gsPal(['#1e0a30', '#34124e', '#4e1c70', '#6a2a92', '#8a40b4', '#ac62d0', '#cc90e6', '#e8c4f8', '#fbf0ff']);
// An amoeba: a translucent lobed blob creeping on a pseudopod, with its nucleus, vacuoles, granules and whatever it's
// in the middle of digesting all showing through. f: frame 0..7 of its creep; small: a split-off half
function gsAmoeba(f,small,pal=GEL_GREEN,food=true){
  const s=small?.55:1,W=Math.round(30*s),H=Math.round(20*s),ph=f*Math.PI/4;
  const colors=pal===GEL_GREEN?gsPal(['#263f2c','#426c3d','#6c994e','#9ac375','#c6dfa4','#e7efcc']):pal;
  const tone=v=>{const k=clamp(v,0,1)*(colors.length-1),n=Math.floor(k);return gsMix(colors[n],colors[Math.min(n+1,colors.length-1)],k-n);};
  return gutSprite('gelRedraw'+f+small+(pal===GEL_GREEN)+food,W,H,(x,y)=>{
    const px=(x+.5)/s,py=(y+.5)/s,cx=12+Math.sin(ph)*.8;
    const field=(xx,yy)=>Math.exp(-(((xx-cx)/9.4)**2+((yy-10.8)/6.8)**2)*1.5)+.5*Math.exp(-(((xx-22-Math.sin(ph)*1.5)/5.5)**2+((yy-15.8)/2.8)**2)*1.5);
    const z=field(px,py);if(z<.28)return null;
    const edge=clamp((z-.28)*3,0,1),light=.43-(px-12)*.015-(py-10)*.026+edge*.13;
    let color=tone(light);
    const nucleus=((px-10.3-Math.sin(ph)*.5)/3.2)**2+((py-12)/2.4)**2;
    if(nucleus<1)color=gsMix(color,[49,77,45],.55*(1-nucleus*.35));
    for(const [vx,vy,r]of[[16.5,8.3,1.5],[6,12,1],[21,15,1.1]]){const d=Math.hypot(px-vx,py-vy)/r;if(d<1)color=gsMix(color,d>.7?[55,99,55]:[185,215,147],.35);}
    const shine=Math.exp(-(((px-9)/4.4)**2+((py-6.4)/.75)**2)*2)+Math.exp(-(((px-18.5)/1.1)**2+((py-10)/.45)**2)*2);
    color=gsMix(color,[242,250,218],Math.min(.7,shine*.7));
    if(edge<.18)color=gsMix(color,[167,195,126],.4);
    return [...color,190+edge*55];
  },'#2c432b');
}
// an enzyme globule: a round drop of purple gel with its catalyst swirling in it
function gsGlobule(f, burst = 0) {
  const W = 16, H = 16, ph = f / 8 * Math.PI * 2;
  return gutSprite('glob' + f, W, H, (x, y) => {
    const cx = 7.5, cy = 7.5, r = 6.6 + Math.sin(ph) * 0.4;
    const dx = (x + 0.5 - cx) / (r * (1 + Math.sin(ph) * 0.05)), dy = (y + 0.5 - cy) / (r * (1 - Math.sin(ph) * 0.05)), q = 1 - dx * dx - dy * dy;
    if (q <= 0) return null;
    const nz = Math.sqrt(q), [dif, spec] = gsLight(dx, dy, nz);
    let v = 0.2 + dif * 0.5 + (1 - nz) * 0.3;
    const a = Math.atan2(dy, dx), rr = Math.hypot(dx, dy);
    if (Math.abs(Math.sin(a * 2 + rr * 6 - ph)) < 0.18 && rr < 0.8) v += 0.15;   // the enzyme, curling round inside
    let col = gsRamp(GEL_PURPLE, clamp(v, 0, 1), x, y);
    if (spec > 0.5) col = gsMix(col, [255, 255, 255], Math.min(1, (spec - 0.5) * 3));
    return [col[0], col[1], col[2], nz < 0.3 ? 210 : 235];
  }, '#12061e');
}

// ── flesh: a liver fluke ────────────────────────────────────────────────────
const FLUKE_PAL = gsPal(['#3a1428', '#5e2440', '#86385a', '#ac5a7a', '#cc849c', '#e4aec0', '#f4d4de', '#fff0f4']);
// A fluke (a flatworm, like Fasciola): a flat leaf of a body, pale and see-through, its insides all on show: the oral
// sucker at its mouth end, the pharynx, the forked gut branching down both sides, the belly sucker, a coil of uterus
// full of brown eggs, lobed testes in the middle, and rows of yolk glands along the edges.
// pose: 'hang' (hanging mouth down, swaying by frame), 'flat' (lying on the floor), 'hump' (inching, by frame)
function gsFluke(pose, f) {
  const hang = pose === 'hang', W = hang ? 15 : 28, H = hang ? 26 : 14, ph = f / 8 * Math.PI * 2;
  return gutSprite('fluke' + pose + f, W, H, (x, y) => {
    // body coordinates: u along it (0 mouth .. 1 tail), v across (-1..1)
    let u, across, half;
    if (hang) {
      u = 1 - (y + 0.5) / H;
      const bend = Math.sin(ph) * 2.2 * (1 - u) * (1 - u);
      half = 6.2 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.04 + u * 1.02)), 0.7) * (u < 0.12 ? 0.55 + u * 3.7 : 1);
      across = (x + 0.5 - (W / 2 + bend)) / Math.max(0.5, half);
    } else {
      u = (x + 0.5) / W;   // mouth on the right (flip to face left)
      u = 1 - u;
      const hump = pose === 'hump' ? Math.max(0, Math.sin(ph)) * 5 * Math.sin(Math.PI * u) : 0;
      half = 3.4 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.04 + u * 1.02)), 0.7);
      across = (y + 0.5 - (H - 4 - hump)) / Math.max(0.5, half);
    }
    if (Math.abs(across) > 1 || u < 0 || u > 1) return null;
    const z = Math.sqrt(1 - across * across) * 0.55;
    const [dif, spec] = gsLight(hang ? across * 0.6 : 0, hang ? -0.2 : across * 0.6, 0.8);
    let v = 0.35 + dif * 0.45 + z * 0.15, tint = null;
    const ax = Math.abs(across);
    // the organs, back to front
    if (ax > 0.72 && ghash(x * 7, y * 3) < 0.45 && u > 0.2 && u < 0.92) tint = '#e8c070';                          // yolk glands down the edges
    if (u > 0.42 && u < 0.82 && ax < 0.55 && gnoise(x * 0.9, y * 0.9) > 0.55) tint = '#d07870';                    // the branching testes
    if (Math.abs(ax - 0.45) < 0.12 && u > 0.14 && u < 0.92) v -= 0.22;                                              // the gut, forking down both sides...
    if (ax > 0.45 && ax < 0.7 && u > 0.2 && u < 0.9 && Math.sin(u * 46) > 0.75) v -= 0.18;                         // ...and branching out
    if (u > 0.17 && u < 0.27 && ax < 0.45 && ghash(x, y * 7) < 0.4) tint = '#8a5a2a';                              // eggs in the uterus
    const ring = (uc, r) => { const d = Math.hypot((u - uc) * (hang ? H : W), across * half); return d < r ? (d > r - 1.2 ? 1 : 2) : 0; };
    const os = ring(0.05, 2.4), vs = ring(0.3, 2.6);
    if (os === 1 || vs === 1) { v += 0.18; tint = null; }                                                           // the suckers' rims
    if (os === 2 || vs === 2) { v -= 0.3; tint = null; }
    if (u > 0.09 && u < 0.14 && ax < 0.3) v -= 0.25;                                                                // the pharynx
    let col = gsRamp(FLUKE_PAL, clamp(v, 0, 1), x, y);
    if (tint) col = gsMix(col, gsRGB(tint), 0.5);
    if (spec > 0.6) col = gsMix(col, [255, 255, 255], 0.5);
    return [col[0], col[1], col[2], 235];
  }, '#2a0c1c');
}

// ── microvilli: a fuzzling ──────────────────────────────────────────────────
const VILLI_PAL = gsPal(['#4a1022', '#741c36', '#a0344e', '#c8566c', '#e4828e', '#f4aeb4', '#ffd8da', '#fff4f2']);
// A clump of intestinal villi broken loose: a knot of tissue bristling with finger-shaped villi, each with a red
// capillary up its middle and a pale brush-border tip, all waving (frame 0..5)
function gsFuzz(f, singe = false) {
  const W = 19, H = 19, ph = f / 6 * Math.PI * 2, cx = 9.5, cy = 9.5, N = 15;
  return gutSprite('fuzz' + f + singe, W, H, (x, y) => {
    const px = x + 0.5, py = y + 0.5, dc = Math.hypot(px - cx, py - cy);
    let best = null;
    if (dc < 3.6) best = { t: 0, d: dc / 3.6, core: true };
    for (let k = 0; k < N && !singe; k++) {
      const a = k / N * Math.PI * 2 + Math.sin(ph + k * 1.7) * 0.18, L = 7.2 + Math.sin(ph * 1 + k * 2.3) * 0.9;
      const bx = Math.cos(a), by = Math.sin(a), t = clamp((px - cx) * bx + (py - cy) * by, 2, L);
      const qx = cx + bx * t + Math.sin(t * 0.5 + ph + k) * 0.6 * -by, qy = cy + by * t + Math.sin(t * 0.5 + ph + k) * 0.6 * bx;
      const r = 1.25 - (t / L) * 0.25, d = Math.hypot(px - qx, py - qy);
      if (d < r && (!best || best.core === false && t < best.t)) best = { t: t / L, d: d / r, a, k };
    }
    if (singe && dc < 6) best = { t: 0, d: dc / 6, core: true };
    if (!best) return null;
    if (singe) { const col = gsRamp(gsPal(['#2a1a14', '#4a2e22', '#6a4432', '#8a5c44']), clamp(1 - best.d * 0.7 + (ghash(x, y) - 0.5) * 0.3, 0, 1), x, y); return col; }
    if (best.core) { const [dif] = gsLight((px - cx) / 3.6, (py - cy) / 3.6, Math.sqrt(Math.max(0, 1 - best.d * best.d))); return gsRamp(VILLI_PAL, 0.1 + dif * 0.4, x, y); }
    // a villus, lit as a little cylinder: brighter on the lit side, a capillary down its middle, a pale tip
    const side = Math.cos(best.a + Math.PI / 2) * GS_L[0] + Math.sin(best.a + Math.PI / 2) * GS_L[1];
    let v = 0.35 + best.t * 0.35 + (1 - best.d) * 0.15 + side * 0.15 * (1 - best.d);
    if (best.d < 0.35 && best.t < 0.8) v -= 0.25;
    if (best.t > 0.86) v += 0.3;
    return gsRamp(VILLI_PAL, clamp(v, 0, 1), x, y);
  }, '#2a0812');
}

// ── stone: a coprolith (and a gastrolith) ───────────────────────────────────
const COPRO_PAL = gsPal(['#1e170f', '#2e2418', '#433524', '#5a4932', '#735f42', '#8e7854', '#aa9268', '#c8b088', '#e6d4b0']);
const RIVER_PAL = gsPal(['#1c2026', '#2c323a', '#40484f', '#566068', '#6e7880', '#8a949a', '#a8b0b4', '#c8ced0', '#eef2f2']);
// A lumpy stone: an ovoid with bumps, lit, mottled, cracked, with things baked into it (seeds, fibres, a fish scale).
// a: how far it has rolled (the texture turns with it); smooth: polished river stone (a gastrolith) instead
function gsStone(key, W, H, a, smooth) {
  return gutSprite(key, W, H, (x, y) => {
    const cx = W / 2, cy = H / 2, rx = W / 2 - 1.2, ry = H / 2 - 1.2;
    const lump = (px, py) => { const t = Math.atan2(py - cy, px - cx); return smooth ? 1 + 0.03 * Math.sin(3 * t) : 1 + 0.08 * Math.sin(3 * t + 1) + 0.05 * Math.sin(7 * t + 2); };
    const z = (px, py) => { const q = 1 - ((px - cx) / rx) ** 2 - ((py - cy) / ry) ** 2; if (q <= 0) return 0; const l = lump(px, py); const q2 = 1 - ((px - cx) / (rx * l)) ** 2 - ((py - cy) / (ry * l)) ** 2; return q2 > 0 ? Math.sqrt(q2) : 0; };
    const px = x + 0.5, py = y + 0.5, h = z(px, py);
    if (h <= 0) return null;
    // texture coordinates turn as it rolls
    const ux = (px - cx) * Math.cos(a) - (py - cy) * Math.sin(a), uy = (px - cx) * Math.sin(a) + (py - cy) * Math.cos(a);
    const bump = smooth ? 0 : (gnoise(ux * 0.6 + 7, uy * 0.6) - 0.5) * 0.9;
    const [nx, ny, nz] = gsNormal((qx, qy) => z(qx + 0.5, qy + 0.5) + (smooth ? 0 : (gnoise(((qx + 0.5 - cx) * Math.cos(a) - (qy + 0.5 - cy) * Math.sin(a)) * 0.6 + 7, ((qx + 0.5 - cx) * Math.sin(a) + (qy + 0.5 - cy) * Math.cos(a)) * 0.6) - 0.5) * 0.25), x, y, 3);
    const [dif, spec] = gsLight(nx, ny, nz);
    let v = 0.12 + dif * 0.7 + bump * 0.12 + (gnoise(ux * 0.35, uy * 0.35) - 0.5) * 0.25;
    const pal = smooth ? RIVER_PAL : COPRO_PAL;
    let col = gsRamp(pal, clamp(v, 0, 1), x, y);
    if (smooth) {   // polished river stone: a pale quartz vein round it, a hard shine
      if (Math.abs(ux * 0.6 + uy * 0.8 + Math.sin(ux * 0.5) * 1.2) < 0.7) col = gsMix(col, gsRGB('#e8e6dc'), 0.7);
      if (spec > 0.4) col = gsMix(col, [255, 255, 255], Math.min(1, (spec - 0.4) * 2));
      return col;
    }
    const cr = Math.abs(gnoise(ux * 0.45 + 3, uy * 0.45 + 9) - 0.5);
    if (cr < 0.025 && h > 0.25) col = gsRGB('#1a120a');                                        // cracks
    const sd = ghash(Math.round(ux + 40), Math.round(uy + 40));
    if (sd < 0.03) col = gsMix(col, gsRGB('#6a8a3a'), 0.75);                                    // seeds
    else if (sd > 0.975) col = gsMix(col, gsRGB('#e0d090'), 0.7);                               // grit
    if (Math.abs(uy - ux * 0.3 - 2) < 0.5 && Math.abs(ux) < 3) col = gsMix(col, gsRGB('#d8c8a0'), 0.6);   // a plant fibre
    if (Math.hypot(ux + 2.5, uy + 1.5) < 1.6) col = gsMix(col, gsRGB('#bfe8ff'), 0.6 + spec);   // a fish scale, glinting
    if (spec > 0.7) col = gsMix(col, [255, 255, 255], 0.3);
    return col;
  }, smooth ? '#101418' : '#140e08');
}

// ── jagged gastrolith: a rotating crown of broken mineral teeth ─────────────
function gsGastrolith(frame, kind) {
  const a = frame * Math.PI / 8 + kind * 0.3;
  return gutSprite('grinder' + kind + ':' + frame, 20, 20, (x, y) => {
    const dx = x + 0.5 - 10, dy = y + 0.5 - 10, r = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) - a;
    const tooth = Math.pow(Math.max(0, Math.cos(angle * 7)), 3);
    const edge = 6.2 + tooth * 3;
    if (r > edge) return null;
    if (r > 5.8) return gsRGB(dy < -1 ? '#fff0bc' : dx < 0 ? '#d5a168' : '#9c6045');
    const ux = dx * Math.cos(a) + dy * Math.sin(a), uy = -dx * Math.sin(a) + dy * Math.cos(a);
    // Branching red-orange fractures, never the rounded spiral of a carryable shell.
    const crack = Math.abs(ux + Math.sin(uy * 0.9) * 1.4) < 0.65 ||
      (uy > 0 && Math.abs(uy - ux * 0.7 - 1) < 0.6);
    if (crack) return gsRGB(r < 3 ? '#ffd080' : '#e76035');
    const facet = Math.sin(angle * 5) * 0.09;
    return gsRamp(RIVER_PAL, clamp(0.25 - dx * 0.025 - dy * 0.04 + facet, 0, 0.7), x, y);
  }, '#210d12');
}

// ── parasite: a long, ringed worm with a red sucker mouth ────────────────────
const WORM_PAL = gsPal(['#65353c', '#99605b', '#bf8b74', '#dbb18b', '#efcf9c', '#fff0be']);
const GS_WORM_FRAMES = 64;
function gsWorm(frame) {
  frame=((frame%GS_WORM_FRAMES)+GS_WORM_FRAMES)%GS_WORM_FRAMES;
  const phase = frame * Math.PI * 2 / GS_WORM_FRAMES;
  return gutSprite('wormFluid' + frame, 36, 16, (x, y) => {
    let best = null;
    for (let i = 0; i < 9; i++) {
      const cx = 4 + i * 3.25 + Math.sin(phase-i*.65)*.22, cy = 10 - Math.sin(phase - i * 0.65) * 1.15 - (i === 8 ? 2 : 0);
      const rx = i === 0 ? 2.2 : i === 8 ? 4 : 3, ry = i === 0 ? 1.8 : i === 8 ? 3.8 : 2.8;
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy;
      if (d >= 1) continue;
      let col = gsRamp(WORM_PAL, clamp(0.65 - dy * 0.3 - dx * 0.12, 0, 1), x, y);
      if (i < 8 && dx > 0.45) col = gsRGB('#ad7264'); // annular seams
      if (i === 8 && dx > 0.12) {
        const mouth = ((dx - 0.4) / 0.45) ** 2 + (dy / 0.7) ** 2;
        if (mouth < 1) col = gsRGB(mouth < 0.45 ? '#3a091b' : '#db4a60');
        if (mouth > 0.45 && mouth < 0.9 && y % 3 === 0) col = gsRGB('#fff5d2');
      }
      best = col;
    }
    return best;
  }, '#32151e');
}

// ── film: a plastic bag ─────────────────────────────────────────────────────
// A thin, crumpled, half-see-through bag drifting bottom-first like a jellyfish: its bell puffing and squeezing
// (frame 0..7), wrinkles catching the light, yellowed and cracking from the acid, its handles trailing
function gsBag(f){
  const phase=f*Math.PI/4,puff=.5+.5*Math.sin(phase),W=32,H=34;
  return gutSprite('bagRedraw'+f,W,H,(x,y)=>{
    const px=x+.5,py=y+.5,cy=3,bodyH=17-puff*2,t=(py-cy)/bodyH;
    const half=10.5+puff*.9+Math.sin(py*.45+phase)*.5-t*.7;
    const dx=px-16,hem=cy+bodyH+Math.sin(px*.7+phase)*.65;
    const inside=t>=0&&py<=hem&&Math.abs(dx)<half&&!(py<5&&Math.abs(dx)>7.5+(py-3)*1.5);
    if(!inside){
      if(py<hem-1||py>32)return null;
      const u=clamp((py-hem)/13,0,1),spread=6+Math.sin(u*Math.PI)*2,drift=Math.sin(u*5+phase)*1.5;
      const d=Math.min(Math.abs(dx-spread-drift),Math.abs(dx+spread-drift));
      if(d>1.45||u>.93)return null;
      return [221,222,213,d<.55?150:220];
    }
    const fold=Math.sin(dx*.8+Math.sin(py*.22+phase)*1.5),crease=Math.abs(Math.sin((dx+py*.25)*.77));
    const edge=half-Math.abs(dx),seam=py>hem-.7;
    let brightness=205+fold*12+(dx<0?8:-7),alpha=125+Math.abs(fold)*48;
    if(edge<.6||seam){brightness=237;alpha=220;}
    if(crease<.08){brightness=241;alpha=213;}
    if(crease>.92&&py>6){brightness-=24;alpha+=20;}
    const diagonal=Math.abs(py-(8.5+dx*.65));if(diagonal<.3){brightness=245;alpha=205;}
    return [brightness,brightness+1,brightness-7,alpha];
  },null);
}

// ── tin: a can of beans (the squatter's house) ──────────────────────────────
// A tin can lying on its side, seen side-on: a lit cylinder with rolled rims and ribs round it, a red label (a cream
// band printed round it with a picture of beans), dents and rust. roll: how far round it has turned (0..1)
function gsTin(roll){
  const key='tinRedraw'+Math.round(roll*12);if(GS_CACHE.has(key))return GS_CACHE.get(key);
  const A=mArt(20,14),metal=['#505860','#7c8790','#aab6bb','#d8dfdc','#f2f3e5'];
  A.soft(9,7,8.8,6.4,metal);A.fill(3,1,17,13,(x,y)=>softTone(metal,.6-Math.abs((y-6)/6)*.8));
  A.poly([[4,1.7],[8,2.1],[10,1.5],[15,2.4],[15.2,11.7],[12,11.2],[9,12.3],[4,11.5]],'#b65740');
  A.fill(4,2,15,12,(x,y)=>softTone(['#663d36','#934b3c','#b96a48','#d49767','#e9bf8f'],.6-Math.abs((y-5)/6)*.65),true);
  A.poly([[4.2,5],[9,4.8],[14.6,5.8],[14.7,8.8],[9.5,8.2],[4.3,8.7]],'#dccc9d');
  for(const [x,y]of[[7,6.3],[10.4,6.7],[12.5,7]])A.soft(x,y,1,.55,['#784333','#a76740','#c8915c','#dbb17b','#eed0a1'],true,.4);
  for(const x of [2,16.5]){A.soft(x,7,1.3,6.1,metal);A.line(x-.4,2,x-.4,11.7,'#e2e7df',null,.4);A.line(x+.6,2.3,x+.6,11.7,'#606c72',null,.4);}
  for(const [x,y]of[[3.2,10.5],[15,3],[16,11],[5,2.3]]){A.ell(x,y,.65,.4,'#8c674d',true);A.ell(x-.2,y-.2,.25,.2,'#c89867',true);}
  A.line(11,2.5,12.8,3.6,'#814739',null,.34);A.line(12.8,3.6,12,5,'#814739',null,.34);
  const art=A.outline('#384249',1).canvas();GS_CACHE.set(key,art);return art;
}

// ── shell and claw: a hermit crab ───────────────────────────────────────────
// A hermit crab half out of its tin (the open end is the sprite's left edge; it faces right): its front end, a big
// granular claw gaping (frame 0..3) and a little one, banded walking legs stepping, eyes on pale stalks.
// hide: tucked in, just the big claw held across the door
function gsCrab(f,hide){
  const key='hermitRedraw'+f+hide;if(GS_CACHE.has(key))return GS_CACHE.get(key);
  const A=mArt(17,18),C=['#6a2e28','#9c4935','#c96c44','#e99b63','#f5cca0'],step=Math.sin(f*Math.PI/2);
  if(!hide){
    for(let i=0;i<3;i++){
      const x=1.5+i*1.4,ex=5+i*1.5+step*(i%2?.7:-.7),ey=13+i*.8;
      A.line(x,10,ex,ey,C[1],null,1.2);A.line(ex,ey,ex+1.2+step*.4,17,C[2],null,.8);A.soft(ex,ey,.85,.8,C);A.line(ex+1,16,ex+1.5,17,'#5b3430',null,.45);
    }
    A.soft(2.7,9.8,3.4,3.1,C);A.soft(5.4,8.9,3.2,2.5,C);
    for(const [x,y]of[[4.4,3.2],[7,4]]){A.line(x-1,8,x,y+1,'#ca9c72',null,.85);A.soft(x,y,1.3,1.1,['#44393b','#76605b','#ab8f79','#d8c4a0','#f1e1bd']);A.ell(x+.3,y,.6,.8,'#201f24');A.ell(x,y-.35,.3,.25,'#fff3d2');}
    A.soft(7.2,12.7,1.5,.9,C);A.poly([[7.7,12.1],[10,11.6],[9,12.8],[10,13.6],[7.8,13.2]],C[3]);
  }
  const ox=hide?-3:0,gape=f===1?1.1:.2;
  A.line(3,10,7+ox,9,C[1],null,1.6);A.soft(8+ox,9.4,3.5,2.8,C);
  A.poly([[9+ox,7.7],[12+ox,5.6-gape],[16+ox,6.5-gape],[14+ox,8-gape],[11+ox,8.7]],C[2]);
  A.poly([[10+ox,10.4],[13+ox,12+gape],[16+ox,11.6+gape],[14.2+ox,10+gape],[11.7+ox,9.2]],C[2]);
  A.line(10+ox,7.8,14+ox,6.6-gape,'#efba86',null,.5);A.line(11+ox,10.9,14+ox,11.3+gape,'#d99264',null,.4);
  for(const [x,y]of[[7.4,8.5],[9,9],[8.2,10.6]])A.ell(x+ox,y,.3,.25,'#edbf94',true);
  const art=A.outline('#4c2c2a',1).canvas();GS_CACHE.set(key,art);return art;
}
