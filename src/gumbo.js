'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 4-1 THE GUMBO FEVER DREAM: the set pieces. The pot is alive: the roux simmers up bubbles to bounce on,
// okra makes everything slippery, steam lifts you, bay leaves carry you, hot sauce sets your feet on fire.
// (Its critters are in enemies-gumbo.js; what the gumbo does to Chickaroo, and the dream around the stage,
// in game-gumbo.js.)
// ═══════════════════════════════════════════════════════════════════════════

// a crisp filled ellipse from horizontal spans (no anti-aliasing)
function gumboEll(ctx, cx, cy, rx, ry, col) {
  if (isFineCtx(ctx)) { fEll(ctx, Math.round(cx) + 0.5, Math.round(cy) + 0.5, rx + 0.5, ry + 0.5, col); return; }   // (on the fine screen: smooth, hires.js)
  ctx.fillStyle = col; cx = Math.round(cx); cy = Math.round(cy);
  for (let dy = -ry; dy <= ry; dy++) { const dx = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2))); ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1); }
}
// ── the roux, as a liquid: painted column by column in world space (so it runs on unbroken from tile to tile), glowing
// amber like the concept's gumbo -- a glossy top, deepening to a dark red-brown. Shared by the roux tiles
// (Game.drawRoux) and the cauldron's broth (Surge) ──
const ROUX_BANDS = [[0, '#ffc060'], [1, '#f08a30'], [3, '#d8621e'], [7, '#bc4c18'], [14, '#9a3814'], [24, '#76280e'], [38, '#5a1e0a']];
// the boiling broth of the master pot (a stage's `scalding` columns, and the surge): red hot, it scalds on contact -- it
// has to read differently from the forgiving amber roux
const BROTH_BANDS = [[0, '#ffb08a'], [1, '#ff5a30'], [3, '#e0381c'], [7, '#c02616'], [14, '#9a1a10'], [24, '#78120c'], [38, '#560c08']];
const rouxWaveF = (x, t) => Math.sin(x * 0.085 + t * 0.035) * 1.2 + Math.sin(x * 0.029 - t * 0.022) * 1.1;   // (unrounded: for drawing it smooth)
const ROUX_GRAD_CACHE = new Map();
function getRouxGradient(ctx, rest, hot) {
  const roundedRest = Math.round(rest * 2) / 2;
  const key = roundedRest + ':' + (hot ? 1 : 0);
  let gr = ROUX_GRAD_CACHE.get(key);
  if (!gr) {
    const B = hot ? BROTH_BANDS : ROUX_BANDS;
    gr = ctx.createLinearGradient(0, roundedRest - 1.6, 0, roundedRest + 40);
    for (const [o, c] of B) gr.addColorStop(clamp((o + 1.6) / 41.6, 0, 1), c);
    ROUX_GRAD_CACHE.set(key, gr);
  }
  return gr;
}
// a stretch of roux from xa to xb (world px): its surface at surfAt(x), down to `bottom` -- one smooth shape, the bands
// blended into a glow from the glossy top down to the dark red-brown (in fine pixels: hires.js), a sheen sliding along it
function paintRouxSpan(ctx, xa, xb, surfAt, bottom, t, hot = false) {
  if (xb <= xa) return;
  const rest = surfAt(xa), q = 0.5;
  const gr = getRouxGradient(ctx, rest, hot);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(xa, bottom);
  for (let x = xa; x < xb; x += q) ctx.lineTo(x, surfAt(x));
  ctx.lineTo(xb, surfAt(xb)); ctx.lineTo(xb, bottom); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hot ? '#ffc8a8' : '#ffd890'; ctx.lineWidth = 0.7; ctx.beginPath();   // the glossy lip
  for (let x = xa; x <= xb; x += q) ctx.lineTo(x, surfAt(x) + 0.35);
  ctx.stroke();
  for (let x = Math.ceil(xa); x < xb; x++) {   // a sheen sliding slowly along the top (calm, never flickering)
    if ((x + Math.floor(t / 5)) % 41 === 0) fRoundRect(ctx, x, surfAt(x) + 0.2, Math.min(4, xb - x), 0.67, 0.3, hot ? '#ffe8d8' : '#fff4d0');
    else if ((x * 3 + Math.floor(t / 7)) % 53 === 0) fRoundRect(ctx, x, surfAt(x) + 2, Math.min(3, xb - x), 0.67, 0.3, hot ? '#ff9a70' : '#ffe08a');
  }
}
// (one column of it: kept for anything still drawing a single column)
function paintRouxColumn(ctx, x, surf, bottom, t, hot = false) { paintRouxSpan(ctx, x, x + 1, () => surf, bottom, t, hot); }
// a glowing bubble of roux, a dome swelling up out of the surface at (x, surf) -- r 0..5 -- then a ring as it pops (k 0..1)
function paintRouxBubble(ctx, x, surf, r, pop, hot = false) {   // (fine: hires.js)
  if (pop > 0) {
    ctx.globalAlpha = 1 - pop; ctx.strokeStyle = hot ? '#ffb08a' : '#ffd08a'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.ellipse(x + 0.5, surf, 2 + pop * 5, (2 + pop * 5) * 0.45, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; return;
  }
  if (r < 0.5) return;
  const dome = (rr, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x + 0.5, surf + 0.5, rr * 1.15, rr, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); };
  dome(r + 0.6, hot ? '#9a1a10' : '#9a3814');
  const gr = ctx.createRadialGradient(x - r * 0.3, surf - r * 0.5, 0.3, x, surf, r * 1.2);
  gr.addColorStop(0, hot ? '#ffd0b8' : '#fff0b0'); gr.addColorStop(0.4, hot ? '#ff5a30' : '#ff9a30'); gr.addColorStop(1, hot ? '#c82a18' : '#c85a1c');
  dome(r, gr);
  fEll(ctx, x - r * 0.35, surf - r * 0.62, Math.max(0.5, r * 0.32), Math.max(0.3, r * 0.14), '#fff6d8');
}
// the bubbles and glossy droplets of oil for a stretch of roux from x0 to x1 (world px) whose rest line is `rest`;
// `ok(x)` says whether there's roux at x (so nothing floats over the banks)
function paintRouxLife(ctx, x0, x1, rest, t, ok, hot = false) {
  for (let k = Math.floor(x0 / 22); k * 22 < x1; k++) {   // fat droplets drifting under the surface
    const x = k * 22 + 11 + Math.sin(t * 0.008 + k * 1.7) * 7;
    if (x < x0 || x >= x1 || !ok(Math.round(x))) continue;
    const y = rest + rouxWaveF(x, t) + 5 + (k * 7) % 9 + Math.sin(t * 0.017 + k) * 1.5;
    fEll(ctx, x + 1, y + 0.5, 1.2, 0.6, hot ? '#ff7a50' : '#ffb04a'); fEll(ctx, x + 0.6, y + 0.3, 0.45, 0.3, hot ? '#ffc0a0' : '#ffe2a0');
  }
  for (let k = Math.floor(x0 / 37); k * 37 < x1; k++) {   // bubbles swelling up and popping, each on its own slow cycle
    const per = 170 + (k * 53) % 110, u = ((t + k * 61) % per) / per, x = k * 37 + 10 + (k * 13) % 17;
    if (x - 7 < x0 || x + 7 >= x1 || !ok(x - 6) || !ok(x + 6)) continue;
    const surf = rest + rouxWaveF(x, t);
    if (u < 0.75) paintRouxBubble(ctx, x, surf, Math.min(1, u / 0.6) * (3 + (k % 3)), 0, hot);
    else if (u < 0.88) paintRouxBubble(ctx, x, surf, 0, (u - 0.75) / 0.13, hot);
  }
}

// Is he standing (or wading) with his feet in this box?
const gumboFeet = (p, box) => p.state === 'play' && p.x + p.w > box.x + 1 && p.x < box.x + box.w - 1 && p.y + p.h >= box.y - 1 && p.y + p.h <= box.y + box.h + 1;

// ── simmer bubbles ('simmer', x0, x1, topRow, every, surfRow): the roux over columns x0-x1 keeps sending up big
// glossy bubbles. Land on one and it bounces you (higher with jump held); it pops just after the 4th bounce ──
const BUBBLE_R = 10, BUBBLE_LO = 5.4, BUBBLE_HI = 6.0, BUBBLE_FUSE = 12;   // (held: ~106 px of air, a good clear above a running jump, never off the screen)
const BUBBLE_BOUNCES = 4;   // bounces a bubble takes before it pops (just after the last; it pops at the top of its rise anyway)
class Simmer extends Enemy {
  constructor(x0, x1, top = 4, every = 80, surf = 12) {
    super(x0 * TILE, 0, (x1 - x0 + 1) * TILE, 1);
    this.top = top * TILE; this.every = every; this.surf = surf * TILE + 4; this.timer = 20; this.kids = [];
    this.passive = this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    this.kids = this.kids.filter(b => !b.remove);
    const near = this.x < g.camX + VIEW_W + 64 && this.x + this.w > g.camX - 64;
    if (!near || --this.timer > 0 || this.kids.length >= 4) return;
    this.timer = this.every + Math.floor(rand(-15, 15));
    const b = new SimmerBubble(rand(this.x + BUBBLE_R + 2, this.x + this.w - BUBBLE_R - 2), this.surf, this.top);
    this.kids.push(b); g.entities.push(b);
  }
  draw() {}
}
class SimmerBubble extends Enemy {
  constructor(cx, surf, top) {
    super(cx - 2, surf - 2, 4, 4);
    this.bx = cx; this.surf = surf; this.by = surf; this.r = 2; this.top = top; this.fuse = 0; this.squash = 0; this.ph = rand(0, 6); this.hits = 0;
    this.passive = this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { const r = this.r; return r < 6 ? null : { x: this.bx - r, y: this.by - r, w: r * 2, h: r * 2 }; }
  update(g) {
    this.t++;
    if (this.r < BUBBLE_R) { this.r += 0.3; this.by = this.surf - this.r + 3; }   // swelling up out of the roux
    else this.by -= 0.42 + Math.sin(this.t * 0.05) * 0.08;
    this.bx += Math.sin(this.t * 0.04 + this.ph) * 0.25;
    if (this.squash > 0) this.squash--;
    const hb = this.hitbox() || { x: this.bx, y: this.by, w: 0, h: 0 };
    this.x = hb.x; this.y = hb.y; this.w = hb.w; this.h = hb.h;
    if ((this.fuse && --this.fuse <= 0) || this.by < this.top) this.pop(g);
  }
  onTouch(g, p) {
    // only from above: landing on top of it is a bounce (the sides are just soft)
    if (!(p.vy > 0 && p.prevY + p.h <= this.by - this.r * 0.2 + 3)) return;
    const held = Input.down('jump') || Input.down('up');
    p.vy = -(held ? BUBBLE_HI : BUBBLE_LO); p.jumping = held; p.holdGrace = 0; p.onGround = false; p.platform = null; p.flaps = 0; p.combo = 0;
    p.sx = 0.82; p.sy = 1.22; p.y = this.by - this.r - p.h;
    this.squash = 10; if (++this.hits >= BUBBLE_BOUNCES && !this.fuse) this.fuse = BUBBLE_FUSE;   // (good for BUBBLE_BOUNCES bounces, then it pops)
    Sound.play('spring');
  }
  pop(g) {
    this.remove = true;
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.particles.push({ kind: 'px', x: this.bx + Math.cos(a) * this.r, y: this.by + Math.sin(a) * this.r, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 1.2 - 0.5, g: 0.12, life: 22, t: 0, color: i % 2 ? '#c8763a' : '#f0b070', size: 2 }); }
    Sound.play('pop');
  }
  draw(ctx) {
    const sq = this.squash / 10, r = this.r, rx = Math.round(r * (1 + sq * 0.25)), ry = Math.round(r * (1 - sq * 0.25));
    const x = Math.round(this.bx), y = Math.round(this.by + (r - ry)), wob = this.fuse || this.hits === BUBBLE_BOUNCES - 1 ? Math.sin(this.t * 0.6) * 0.8 : 0;   // (wobbling: one bounce left)
    // a glowing bubble of roux: an amber skin you can see the light through, darker round its lower edge, glossy on top
    ctx.globalAlpha = 0.7; gumboEll(ctx, x, y, rx + wob, ry, '#d8621e');
    ctx.globalAlpha = 0.75; gumboEll(ctx, x, y - 1, Math.max(1, rx + wob - 2), Math.max(1, ry - 2), '#ff9a34');
    ctx.globalAlpha = 0.6; gumboEll(ctx, x - 1, y - Math.round(ry * 0.3), Math.max(1, Math.round(rx * 0.55)), Math.max(1, Math.round(ry * 0.4)), '#ffc870'); ctx.globalAlpha = 1;
    ctx.lineWidth = 0.7; ctx.strokeStyle = '#8a3210'; ctx.beginPath(); ctx.ellipse(x + 0.5, y + 0.5, rx + wob + 0.2, ry + 0.2, 0, -0.3, Math.PI + 0.3); ctx.stroke();   // its rim: dark below,
    ctx.strokeStyle = '#ffd08a'; ctx.beginPath(); ctx.ellipse(x + 0.5, y + 0.5, rx + wob + 0.2, ry + 0.2, 0, Math.PI + 0.3, -0.3); ctx.stroke();   // lit above (fine: hires.js)
    ctx.save(); ctx.translate(x - rx * 0.45, y - ry * 0.55); ctx.rotate(-0.5); fEll(ctx, 0, 0, 1.8, 0.6, '#ffffff'); ctx.restore(); fBlob(ctx, x - rx * 0.62, y - ry * 0.2, 0.45, '#ffffff');
    if (this.fuse) { ctx.globalAlpha = 0.25 + (1 - this.fuse / BUBBLE_FUSE) * 0.3; gumboEll(ctx, x, y, Math.max(1, rx - 2), Math.max(1, ry - 2), '#ffd0a0'); ctx.globalAlpha = 1; }
  }
}

// ── okra slices ('okra', x, row, drift = 0, period = 240): a fat round slice of okra floating on the roux, bobbing.
// It's springy (you bounce off it) -- and slimy: it coats his feet in okra goo ──
class OkraSlice extends Enemy {
  constructor(col, row, drift = 0, period = 240) {
    super(col * TILE - 2, (row + 1) * TILE - 6, 20, 6);
    this.x0 = this.x; this.y0 = this.y; this.drift = drift * TILE; this.period = period; this.squash = 0;
    this.passive = this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  update(g) {
    this.t++;
    this.x = this.x0 + this.drift * (0.5 - 0.5 * Math.cos(this.t / this.period * Math.PI * 2));
    this.y = this.y0 + Math.round(Math.sin(this.t * 0.06) * 1.5);
    if (this.squash > 0) this.squash--;
  }
  onTouch(g, p) {
    if (!(p.vy > 0 && p.prevY + p.h <= this.y + 5)) return;
    const held = Input.down('jump') || Input.down('up');
    p.vy = -(held ? 6.2 : 5.6); p.jumping = held;   // (held: ~113 px of air) p.holdGrace = 0; p.onGround = false; p.platform = null; p.flaps = 0; p.y = this.y - p.h;
    p.sx = 0.8; p.sy = 1.25; this.squash = 12;
    g.slimeFeet(p);
    Sound.play('sproing');
    for (let i = 0; i < 5; i++) g.particles.push({ kind: 'px', x: this.cx + rand(-6, 6), y: this.y, vx: rand(-0.8, 0.8), vy: rand(-1.6, -0.4), g: 0.12, life: 24, t: 0, color: i % 2 ? '#b8e890' : '#e8ffc8', size: 2 });
  }
  draw(ctx) {
    const k = this.squash / 12, cx = Math.round(this.cx), cy = Math.round(this.y + 3 + k * 2), rx = 10 + Math.round(k * 2), ry = 4 - Math.round(k * 1.5);
    gumboEll(ctx, cx, cy + 1, rx + 1, ry + 1, INK);
    gumboEll(ctx, cx, cy + 1, rx, ry, '#3a8a2a');            // the skin, round its edge
    gumboEll(ctx, cx, cy, rx - 1, Math.max(1, ry - 1), '#d8f4a8');   // the pale flesh
    for (const [dx, len] of [[-6, 3 + (this.t >> 5) % 2], [4, 2 + ((this.t >> 5) + 1) % 3]]) { fRoundRect(ctx, cx + dx + 0.15, cy + ry + 1, 0.7, len, 0.35, '#8ad860'); fBlob(ctx, cx + dx + 0.5, cy + ry + len + 0.5, 0.55, '#c8ffa0'); }   // slime dripping off it (fine)
    for (let i = 0; i < 5; i++) {   // the seed chambers: a five-pointed star of little white seeds
      const a = i / 5 * Math.PI * 2 + 0.3, sx = cx + 0.5 + Math.cos(a) * (rx * 0.5), sy = cy + 0.5 + Math.sin(a) * Math.max(1, ry * 0.5);
      fEll(ctx, sx, sy, 1.4, 0.6, '#7ab850'); fEll(ctx, sx, sy, 0.55, 0.45, '#f4ffe0');
    }
    fEll(ctx, cx + 0.5, cy + 0.5, 1.4, 0.5, '#4a9a3a');
    fEll(ctx, cx - rx + 4.5, cy - Math.max(1, ry - 1) + 0.5, 1.6, 0.4, '#ffffff');   // a slick of goo catching the light
  }
}

// ── okra slime ('slime', x, row, w = 2): a puddle of okra goo on the floor. Walk through it and his feet slide like
// on ice -- but faster: slimed, he's quick, and can't stop. The okra spitters' seeds leave fresh puddles ──
class SlimePuddle extends Enemy {
  constructor(col, row, w = 2, life = 0) {
    super(col * TILE, (row + 1) * TILE - 3, w * TILE, 4);
    this.life = life; this.ph = rand(0, 6);
    this.passive = this.noFreeze = true; this.behindTiles = false; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    if (this.life && this.t >= this.life) { this.remove = true; return; }
    const p = g.player;
    if (p.onGround && gumboFeet(p, this)) g.slimeFeet(p);
  }
  draw(ctx) {
    const fade = this.life ? Math.min(1, this.t / 10, (this.life - this.t) / 60) : 1;
    ctx.globalAlpha = 0.9 * fade;
    const x0 = Math.round(this.x), y = Math.round(this.y + 3), w = this.w;
    const top = i => y - (1 + 2 * Math.sin(Math.PI * (i + 0.5) / w) + Math.sin(i * 0.9 + this.ph) * 0.6);   // a lumpy green pool, thicker in the middle (fine)
    ctx.fillStyle = '#2e6a24'; ctx.beginPath(); ctx.moveTo(x0, y + 1); for (let i = 0; i <= w; i += 1 / ART_R) ctx.lineTo(x0 + i, top(i)); ctx.lineTo(x0 + w, y + 1); ctx.fill();
    ctx.strokeStyle = '#7ac850'; ctx.lineWidth = 0.7; ctx.beginPath(); for (let i = 0; i <= w; i += 1 / ART_R) ctx.lineTo(x0 + i, top(i) + 0.35); ctx.stroke();
    const sx = (this.t * 0.25 + this.ph * 8) % w;   // the sheen sliding across it
    fEll(ctx, x0 + sx + 1, top(sx) + 1, 1.2, 0.35, '#e8ffc8');
    ctx.globalAlpha = 1;
  }
}

// ── steam vents ('steam', x, top, period = 0, phase = 0, w = 2, row = 11): an iron grate in the floor (or a hot spring
// in the roux) at columns x..x+w-1 that blasts a column of steam up to row `top`. In the steam he's lifted up; on a
// bay leaf he rides it as high as it goes. period 0: always on (a thermal draft); otherwise it hisses, then blows.
// A crawdad caught in it is cooked ──
const STEAM_WARN = 50, STEAM_LIFT = 0.85, STEAM_MAX = 3.3;
class SteamVent extends Enemy {
  constructor(col, top, period = 0, phase = 0, w = 2, row = 11) {
    super(col * TILE, top * TILE, w * TILE, (row + 1 - top) * TILE);
    this.floor = (row + 1) * TILE; this.period = period; this.phase = phase; this.on = !period; this.amt = period ? 0 : 1;
    this.passive = this.noFreeze = true; this.behindTiles = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  phaseAt() {
    if (!this.period) return 'on';
    const k = (this.t + Math.floor(this.phase * this.period)) % this.period, on = Math.round(this.period * 0.42);
    return k < on ? 'on' : k >= this.period - STEAM_WARN ? 'warn' : 'off';
  }
  update(g) {
    this.t++;
    if (this.wet == null) this.wet = g.level.get(Math.floor(this.x / TILE), Math.floor(this.floor / TILE)) === T.QSAND;
    const ph = this.phaseAt(), was = this.on;
    this.on = ph === 'on'; this.warn = ph === 'warn';
    this.amt += ((this.on ? 1 : 0) - this.amt) * 0.12;
    if (this.on && !was) Sound.play('spout');
    if (this.warn && this.t % 12 === 0) Sound.play('sizzle');
    if (this.amt < 0.5) return;
    const p = g.player;
    if (p.state === 'play' && !p.inPod && overlap({ x: p.x + 2, y: p.y, w: p.w - 4, h: p.h }, this)) {
      const leaf = p.floatT > 0 && p.chute === 'leaf';
      p.vy = Math.max(-(leaf ? STEAM_MAX * 0.8 : STEAM_MAX), p.vy - STEAM_LIFT);
      p.onGround = false; p.platform = null; p.jumping = false; p.coyote = 0; p.pounding = false; p.airMax = Math.max(p.airMax || 0, 1.6);
    }
    for (const e of g.entities) if (e.cook && !e.dead && overlap(e, this)) e.cook(g);
  }
  draw(ctx) {
    const x0 = Math.round(this.x), w = this.w, f = this.floor, t = this.t;
    // the grate, or a ring of boiling roux
    if (this.wet) {   // a patch of roux boiling hard: bubbles swelling and popping, quicker as it's about to blow
      for (let i = 0; i < 3; i++) {
        const per = this.warn ? 26 : 50, u = ((t + i * 17) % per) / per, bx = x0 + 6 + ((i * 9) % Math.max(1, w - 10));
        if (u < 0.7) paintRouxBubble(ctx, bx, f + 4, Math.round(u / 0.7 * 3), 0); else paintRouxBubble(ctx, bx, f + 4, 0, (u - 0.7) / 0.3);
      }
    }
    else {
      fRoundRect(ctx, x0 + 1, f - 2, w - 2, 3, 1, INK);   // the grate (fine)
      for (let i = 3; i < w - 3; i += 3) fRoundRect(ctx, x0 + i, f - 1.2, 2, 1.2, 0.5, this.warn ? '#8a3a1a' : '#4a444e');
    }
    // hissing wisps while it's about to blow
    if (this.warn || this.amt < 0.5) {
      const n = this.warn ? 4 : 2;
      for (let i = 0; i < n; i++) {
        const u = ((t * 0.02 + i / n) % 1), y = f - 3 - u * (this.warn ? 30 : 14), x = x0 + w / 2 + Math.sin(u * 6 + i * 2) * 4;
        ctx.globalAlpha = 0.3 * Math.sin(u * Math.PI); fBlob(ctx, x, y, 2 + u * 2, '#fff4e8');
      }
      ctx.globalAlpha = 1;
    }
    if (this.amt < 0.05) return;
    // the column: puffy white clouds of steam billowing up (shaded underneath, like the concept's), thinning toward the top
    const h = f - this.y, n = Math.round(h / 9) + 4, puffs = [];
    for (let i = 0; i < n; i++) {
      const u = ((t * 0.012 + i / n) % 1), sway = Math.sin(t * 0.03 + i * 2.1) * (w * 0.18);
      puffs.push({ x: x0 + w / 2 + sway, y: f - u * h, r: w * 0.3 + u * 6 + (i % 3), a: this.amt * Math.min(0.8, (1 - u) * 1.6) });
    }
    puffs.sort((p, q) => q.y - p.y);
    for (const p of puffs) { ctx.globalAlpha = p.a; fBlob(ctx, p.x, p.y + 1, p.r + 1, '#c8a898'); }   // (fine circles: hires.js)
    for (const p of puffs) { ctx.globalAlpha = p.a; fBlob(ctx, p.x, p.y, p.r, '#f4e8e0'); fBlob(ctx, p.x - 1, p.y - 2, Math.max(1, p.r - 3), '#ffffff'); }
    ctx.globalAlpha = 1;
  }
}

// ── bay leaves ('bayleaf', x, row): a big dried bay leaf, hanging in the air. Grab it and it's a glider: a slow fall,
// steerable; flaps to bounce up; it's his until he lands (down glides faster). In steam it soars. A fresh one turns up after it's used ──
const LEAF_TIME = 360, LEAF_WARN = 90;   // like the brolly, but six seconds of flight; flutter and blink for the last second and a half
class BayLeaf extends Enemy {
  constructor(col, row) {
    super(col * TILE, row * TILE + 2, 16, 12);
    this.y0 = this.y; this.gone = 0; this.ph = rand(0, 6);
    this.passive = this.friendly = this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return this.gone ? null : this; }
  update(g) {
    this.t++;
    this.y = this.y0 + Math.round(Math.sin(this.t * 0.05 + this.ph) * 2);
    const p = g.player;
    if (this.gone && !(p.floatT > 0 && p.chute === 'leaf' && p.leaf === this) && ++this.gone > 120) this.gone = 0;   // (another drifts in)
  }
  onTouch(g, p) {
    if (this.gone || p.floatT > 0 || p.vine || g.held || p.onGround) return;   // (caught on the way past, in mid-air)
    this.gone = 1; p.leaf = this;
    p.floatT = LEAF_TIME; p.chute = 'leaf'; p.vy = Math.min(p.vy, 0.5); p.pounding = false;
    if (p.roll > 0) g.endRoll(p);
    Sound.play('leaf');
  }
  draw(ctx) {
    if (this.gone) return;
    drawBayLeaf(ctx, this.cx, this.y + 6, Math.sin(this.t * 0.04 + this.ph) * 0.25);
  }
}
// a dried bay leaf, centred on (x, y), tilted by `a` (a slope: pixels down per pixel along), `len` px either side of
// the middle and `wid` px at its widest (drawn column by column, so it stays crisp)
function drawBayLeaf(ctx, x, y, a, len = 10, wid = 4) {   // a long bay leaf, tilted by a: lit above its midrib, veined (fine: hires.js)
  ctx.save(); ctx.translate(x + 0.5, y + 0.5); ctx.rotate(Math.atan(a));
  const L = len + 1, shape = (g2, grow) => { g2.beginPath(); g2.moveTo(-L - grow, 0); g2.quadraticCurveTo(0, -wid * 1.6 - grow, L + grow, 0); g2.quadraticCurveTo(0, wid * 1.6 + grow, -L - grow, 0); g2.closePath(); };
  ctx.fillStyle = INK; shape(ctx, 0.9); ctx.fill();
  const gr = ctx.createLinearGradient(0, -wid, 0, wid); gr.addColorStop(0, '#c8d070'); gr.addColorStop(0.45, '#a8b858'); gr.addColorStop(0.55, '#7a8a3a'); gr.addColorStop(1, '#5a6a2a');
  ctx.fillStyle = gr; shape(ctx, 0); ctx.fill();
  ctx.strokeStyle = '#d8d890'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-L + 1, 0); ctx.lineTo(L - 1, 0); ctx.stroke();   // the midrib
  ctx.lineWidth = 0.35;
  for (let k = -len + 3; k < len - 2; k += 4) for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + 2.6, sd * wid * 0.75 * Math.sqrt(1 - (k / L) ** 2)); ctx.stroke(); }   // its veins
  fRoundRect(ctx, L - 0.4, -0.5, 3, 1, 0.4, '#5a4a24');   // the stem
  ctx.restore();
}

// ── cleavers ('cleaver', x, w = 3, h = 3, period = 200, phase = 0, floor = 12): a giant serrated cleaver over columns
// x..x+w-1 that chops down onto the board (or into the roux) whose top is row `floor`. Saw teeth along its top AND its
// bottom: both bite (its flat sides never do). It hangs high, gives fair warning (it shivers, its shadow darkens on the
// board below, its edge glints), slams down, and stays wedged for a beat -- a wall of steel (BODY tiles) you can't hop
// (the top's all teeth) -- then lifts away. So you wait for it, and dash underneath while it's up. A sausage caught
// under it is sliced ──
// what's lying on the board under each cleaver (it chops it into slices, juice flying): [kind, juice colour]
const CLEAVER_VEG = [['redpep', '#ff5a3a'], ['celery', '#b8e890'], ['onion', '#f4f0d8'], ['corn', '#ffd23a'], ['pepper', '#7ad050'], ['okra', '#9ad860']];
const CLEAVER_VEG_ART = {};
// the vegetable, whole, lying on the board (baked once per kind and width): w px wide, its bottom at the canvas's bottom
function cleaverVegArt(kind, w) {
  const key = kind + w;
  if (CLEAVER_VEG_ART[key]) return CLEAVER_VEG_ART[key];
  const c = makeHiCanvas(w, 16), g = c.getContext('2d'), m = w / 2;   // (painted fine: hires.js)
  if (kind === 'redpep' || kind === 'pepper') { VEG.pepper(g, Math.round(m - 6), 9, 5, kind === 'redpep'); VEG.pepper(g, Math.round(m + 7), 10, 4, kind === 'redpep'); }
  else if (kind === 'onion') { VEG.onion(g, Math.round(m - 5), 9, 5); VEG.onion(g, Math.round(m + 7), 10, 4); }
  else VEG[kind](g, 4, 10, w - 10, 1, 0);
  return (CLEAVER_VEG_ART[key] = c);
}
const CLEAVER_WARN = 40, CLEAVER_STUCK = 84, CLEAVER_LIFT = 44, CLEAVER_RAISE = 3;   // (frames; how many tiles above its bite it hangs)
class Cleaver extends Enemy {
  constructor(col, w = 3, h = 3, period = 200, phase = 0, floor = 12) {
    super(col * TILE, (floor - h - CLEAVER_RAISE) * TILE, w * TILE, h * TILE);
    this.col = col; this.cw = w; this.ch = h; this.floorRow = floor; this.period = Math.max(period, CLEAVER_WARN + CLEAVER_STUCK + CLEAVER_LIFT + 20); this.phase = phase;
    this.bite = (floor - h) * TILE; this.hang = this.bite - CLEAVER_RAISE * TILE; this.y = this.hang;
    this.state = 'up'; this.cells = []; this.vy = 0; this.shake = 0;
    this.veg = CLEAVER_VEG[(col * 7) % CLEAVER_VEG.length]; this.cut = false; this.hop = 0;   // what it's chopping, on the board below it
    this.passive = this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  // where in its cycle it is: k frames since it last began to warn
  cycle() { return (this.t + Math.floor(this.phase * this.period)) % this.period; }
  hitbox() { return { x: this.x + 1, y: this.y - 3, w: this.w - 2, h: this.ch * TILE + 6 }; }   // (the saw teeth, top and bottom, reach a little past the steel)
  update(g) {
    this.t++;
    const k = this.cycle(), lv = g.level;
    if (this.state === 'up' && k < 2) { this.state = 'warn'; Sound.play('sizzle'); }
    if (this.state === 'warn') { this.shake = (this.t >> 1) % 2 ? 1 : -1; if (k >= CLEAVER_WARN) { this.state = 'drop'; this.shake = 0; this.vy = 2; } }
    if (this.state === 'drop') {
      this.vy = Math.min(this.vy + 1.6, 14); this.y += this.vy;
      if (this.y >= this.bite) { this.y = this.bite; this.chop(g); }
    }
    if (this.state === 'stuck' && k >= CLEAVER_WARN + 8 + CLEAVER_STUCK) {   // free: it lifts away (and the steel goes with it)
      this.state = 'lift';
      for (const [c, r] of this.cells) if (lv.get(c, r) === T.BODY) lv.set(c, r, T.EMPTY);
      this.cells = [];
    }
    if (this.hop > 0) this.hop--;
    this.munch(g);
    if (this.state === 'lift') { this.y = Math.max(this.hang, this.y - (this.bite - this.hang) / CLEAVER_LIFT); if (this.y <= this.hang) this.state = 'up'; }
  }
  chop(g) {
    this.state = 'stuck'; this.vy = 0;
    const lv = g.level, p = g.player, box = { x: this.x, y: this.bite, w: this.w, h: this.ch * TILE };
    Sound.play('pound'); g.shake = Math.max(g.shake, 2);
    // it bites through the vegetable under it: juice spurting out both sides, a few pieces flying, the slices hopping
    const juice = this.veg[1], fy = this.floorRow * TILE - 3;
    if (!this.eaten) this.juiced = true;   // the puddle belongs to the board, independent of the edible pixels
    if (!this.eaten) for (let i = 0; i < 18; i++) { const sd = i % 2 ? 1 : -1; g.particles.push({ kind: 'px', x: this.x + (sd > 0 ? this.w + 1 : -1), y: fy - rand(0, 6), vx: sd * rand(0.8, 3), vy: rand(-4.2, -1.4), g: 0.22, life: 34, t: 0, color: i % 3 ? juice : '#ffffff', size: i % 4 ? 2 : 1 }); }
    if (!this.eaten) for (let i = 0; i < 4; i++) g.particles.push({ kind: 'px', x: this.x + this.w / 2 + rand(-12, 12), y: fy - 4, vx: rand(-2, 2), vy: rand(-3.5, -2), g: 0.25, life: 30, t: 0, color: juice, size: 3 });
    this.cut = true; this.hop = 10; if (!this.eaten) Sound.play('plop');
    g.dust(this.x + 2, this.bite + this.ch * TILE, 4); g.dust(this.x + this.w - 2, this.bite + this.ch * TILE, 4);
    // caught underneath: a hit, and out to the nearer side (so he's never inside the steel)
    if (p.state === 'play' && overlap(p, box)) {
      g.hurtPlayer();
      const left = p.x + p.w / 2 < this.x + this.w / 2;
      p.x = left ? this.x - p.w - 1 : this.x + this.w + 1; p.vx = left ? -1.5 : 1.5; p.vy = Math.min(p.vy, -3); p.onGround = false;
    }
    // anything else under it: sliced (a sausage into rounds)
    for (const e of g.entities) {
      if (e === this || e.dead || e.passive || e.friendly || !e.hitbox || !e.hitbox() || !overlap(e.hitbox(), box)) continue;
      if (e instanceof Andouille) for (let i = 0; i < 6; i++) g.particles.push({ kind: 'px', x: e.cx + rand(-10, 10), y: e.y + 6, vx: rand(-1.8, 1.8), vy: rand(-3.5, -1.5), g: 0.2, life: 40, t: 0, color: i % 2 ? '#d8503a' : '#ffb090', size: 3 });
      if (e.stompable || e.rollKill) { e.flipKill(g, e.cx < this.x + this.w / 2 ? -1 : 1); g.stompScore(e); }
    }
    // the blade is solid steel for a beat
    for (let c = this.col; c < this.col + this.cw; c++) for (let r = this.floorRow - this.ch; r < this.floorRow; r++) if (lv.get(c, r) === T.EMPTY) { lv.set(c, r, T.BODY); this.cells.push([c, r]); }
  }
  // Each cleaver owns its edible copy; bites must never erase the shared art or the juice on the board.
  prepareVegetable() {
    if (this.food) return this.food;
    const w = this.w + 8, c = makeCanvas(w, 16), ctx = c.getContext('2d');
    ctx.drawImage(cleaverVegArt(this.veg[0], w), 0, 0);
    const pixels = ctx.getImageData(0, 0, w, 16).data;
    let remaining = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) remaining++;
    return (this.food = { c, ctx, pixels, remaining });
  }
  // The same placement is used for drawing and biting, including the spread and hop of chopped slices.
  vegetablePieces() {
    const w = this.w + 8, x = Math.round(this.x) - 4, y = this.floorRow * TILE - 16;
    if (!this.cut) return [{ sx: 0, w, x, y }];
    const sw = Math.ceil(w / 4), lift = this.hop > 0 ? Math.round(Math.sin(this.hop / 10 * Math.PI) * 3) : 0;
    return Array.from({ length: 4 }, (_, i) => ({ sx: i * sw, w: Math.min(sw, w - i * sw),
      x: x + i * sw + Math.round((i - 1.5) * 3), y: y - (i % 2 ? lift : Math.round(lift / 2)) }));
  }
  // Eat only the solid vegetable pixels Chickaroo reaches as he crosses it, in either direction.
  munch(g) {
    const p = g.player;
    if (this.eaten || p.state !== 'play') return;
    const floorY = this.floorRow * TILE, vw = this.w + 8;
    if (p.x + p.w < this.x - 10 || p.x > this.x + this.w + 10 || p.y + p.h < floorY - 20 || p.y > floorY) return;
    const food = this.prepareVegetable();
    let removed = 0;
    for (const piece of this.vegetablePieces()) {
      const left = Math.max(0, Math.ceil(p.x - piece.x - 0.5)), right = Math.min(piece.w, Math.ceil(p.x + p.w - piece.x - 0.5));
      const top = Math.max(0, Math.ceil(p.y - piece.y - 0.5)), bottom = Math.min(16, Math.ceil(p.y + p.h - piece.y - 0.5));
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        const sx = piece.sx + x, a = (y * vw + sx) * 4 + 3;
        if (!food.pixels[a]) continue;
        food.pixels[a] = 0; food.ctx.clearRect(sx, y, 1, 1); removed++; food.remaining--;
      }
    }
    if (!removed) return;
    if (!(p.chewT > 0)) p.chewPhase = 0;
    p.chewT = 12;
    this.eaten = food.remaining === 0;
    if (!this.tasted) { this.tasted = true; g.level.chomps = (g.level.chomps || 0) + 1; }
    if (this.t < (this.crunchAt || 0)) return;
    this.crunchAt = this.t + 6;
    const juice = this.veg[1], cx = p.x + p.w / 2 + p.facing * 5, cy = p.y + p.h * 0.55;
    for (let i = 0; i < 3; i++) g.particles.push({ kind: 'px', x: cx + rand(-3, 3), y: cy + rand(-2, 2), vx: p.facing * rand(0.2, 1.4) + rand(-0.6, 0.6), vy: rand(-2.2, -0.6), g: 0.2, life: 24, t: 0, color: i % 3 ? juice : '#fff6e0', size: 1 });
    p.sx = 1.18; p.sy = 0.86;
    Sound.play('vegcrunch');
  }
  // the teeth bite, top or bottom, whatever it's doing (its flat sides are a wall: the tiles keep him off them when it's stuck)
  onTouch(g, p) { g.hurtPlayer(); }
  draw(ctx) {
    const x = Math.round(this.x) + this.shake, y = Math.round(this.y), w = this.w, h = this.ch * TILE + 4, floorY = this.floorRow * TILE;
    // its shadow on the board below, darkening as it's about to fall
    if (this.state === 'warn' || this.state === 'drop' || this.state === 'up') {
      const k = this.state === 'up' ? 0.12 : this.state === 'warn' ? 0.12 + 0.4 * this.cycle() / CLEAVER_WARN : 0.55;
      ctx.globalAlpha = k; gumboEll(ctx, this.x + w / 2, floorY + 1, w / 2 + 2, 3, '#1a0804'); ctx.globalAlpha = 1;
    }
    // the vegetable on the board under it: whole -- or, once it's been chopped, slices with a puddle of its juice
    if (this.juiced) {
      ctx.globalAlpha = 0.75; gumboEll(ctx, this.x + w / 2, floorY - 1, w / 2 + 6, 2, this.veg[1]); ctx.globalAlpha = 1;
    }
    if (!this.eaten) {
      const art = this.food ? this.food.c : cleaverVegArt(this.veg[0], w + 8);
      for (const piece of this.vegetablePieces()) ctx.drawImage(art, piece.sx, 0, piece.w, 16, piece.x, piece.y, piece.w, 16);
    }
    // the handle: polished wood, riveted, running off the top of the picture (held by someone very big) -- (in fine pixels: hires.js)
    const hx = x + Math.round(w / 2) - 5;   // (centred on the blade)
    fRect(ctx, hx - 2 / 3, -40, 11.33, y + 44, INK);
    const hg = ctx.createLinearGradient(hx, 0, hx + 10, 0); hg.addColorStop(0, '#cf9656'); hg.addColorStop(0.25, '#a86c34'); hg.addColorStop(0.7, '#7a4a20'); hg.addColorStop(1, '#5a3418');
    ctx.fillStyle = hg; ctx.fillRect(hx, -40, 10, y + 42);
    for (const ry of [y - 10, y - 26]) { fEll(ctx, hx + 5, ry + 1, 2.2, 2.2, INK); fEll(ctx, hx + 5, ry + 1, 1.4, 1.4, '#c8ccd8'); fBlob(ctx, hx + 4.6, ry + 0.6, 0.45, '#ffffff'); }
    // the blade: a slab of steel, a dark spine along its top, brushed lighter toward the bevelled edge
    fRoundRect(ctx, x - 1, y - 1, w + 2, h + 2, 1.2, INK);
    const bg = ctx.createLinearGradient(0, y, 0, y + h); const bands = ['#5a5e6a', '#8a909e', '#a4aab8', '#b8bfcc', '#c8ced8', '#9aa0ae', '#e8eef8'], stops = [0, 0.1, 0.22, 0.45, 0.7, 0.86, 0.97];
    bands.forEach((c, i) => bg.addColorStop(stops[i], c));
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    for (const [ey, d] of [[y - 1, -1], [y + h, 1]]) for (let i = 0; i < w; i += 4) {   // saw teeth along the top and the bottom: sharp, bright-tipped, both bite
      const tip = ey + d * 3.2;
      fPoly(ctx, [[x + i - 0.2, ey], [x + i + 4.2, ey], [x + i + 2, tip + d * 0.6]], INK);
      fPoly(ctx, [[x + i + 0.7, ey + d * 0.3], [x + i + 3.3, ey + d * 0.3], [x + i + 2, tip - d * 0.2]], '#c8ced8');
      fBlob(ctx, x + i + 2, tip - d * 0.6, 0.45, '#ffffff');
    }
    for (let i = 0; i < w; i += 7) fRoundRect(ctx, x + i + ((i * 3) % 5), y + 6 + (i % 4) * 4, 3, 2 / 3, 0.3, '#d8dee8');   // brushed streaks
    if (this.state === 'warn' && (this.cycle() >> 3) % 2) fRoundRect(ctx, x + 4, y + h - 3, w - 8, 2 / 3, 0.3, '#ffffff');   // the edge glinting
  }
}

// ── the cutting board ('board', x0, x1, row = 12): a long wooden board laid on the floor whose top is row `row`, scored
// with old knife marks (scenery; it sits flush with the floor, so it never changes the footing) ──
class CuttingBoard extends Enemy {
  constructor(x0, x1, row = 12) {
    super(x0 * TILE, row * TILE, (x1 - x0 + 1) * TILE, 12);
    this.passive = this.friendly = this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  // off the end of the board, full of the vegetables he gobbled on the way (Cleaver.munch): BURP!
  update(g) {
    this.t++;
    const p = g.player, lv = g.level;
    if (lv.burped || !lv.chomps || p.state !== 'play' || !p.onGround || p.x < this.x + this.w + 4) return;
    lv.burped = true;
    g.popup(p.x + p.w / 2, p.y - 14, 'BUUURP!', '#9ae8a8', 84);
    const x = p.x + p.w / 2 + p.facing * 8, y = p.y + p.h * 0.55;
    for (let i = 0; i < 6; i++) g.particles.push({ kind: 'burp', x, y: y + rand(-2, 2), vx: p.facing * rand(1.1, 2.7), vy: rand(-0.65, 0.35), g: -0.012, drag: 0.97, life: 54 + i * 4, t: 0, r: 3 + i % 3 });
    for (let i = 0; i < 8; i++) g.particles.push({ kind: 'px', x, y, vx: p.facing * rand(1.3, 3.3), vy: rand(-1.3, 0.4), g: -0.01, drag: 0.96, life: 36, t: 0, color: i % 2 ? '#d8f0c0' : '#ffffff', size: 2 });
    p.chewT = 0; p.burpT = 66;
    p.sx = 1.3; p.sy = 0.8;
    Sound.play('burp');
  }
  draw(ctx, g) {
    const x0 = Math.round(this.x), y = Math.round(this.y), cam = Math.round(g.camX);   // (in fine pixels: hires.js)
    const a = Math.max(x0, cam - 4), b = Math.min(x0 + this.w, cam + VIEW_W + 4);
    if (b <= a) return;
    fRect(ctx, a, y - 1, b - a, 1, INK);
    const gr = ctx.createLinearGradient(0, y, 0, y + 12); gr.addColorStop(0, '#e8bc80'); gr.addColorStop(0.15, '#d8a868'); gr.addColorStop(0.3, '#b8864a'); gr.addColorStop(0.75, '#a87840'); gr.addColorStop(1, '#7a4a20');
    ctx.fillStyle = gr; ctx.fillRect(a, y, b - a, 12);
    for (let x = a; x < b; x++) {
      const u = x - x0, h = (x * 2654435761) >>> 0;
      if (h % 7 === 0) fRoundRect(ctx, x, y + 3 + (h >> 5) % 5, 2.4, 0.5, 0.25, '#a07038');   // grain
      if (u % 37 < 1 || (u + 11) % 53 < 1) fRect(ctx, x + 1 / 3, y, 1 / 3, 4, '#7a4a20');   // knife scores
    }
    for (const ex of [x0, x0 + this.w - 1]) if (ex >= a && ex < b) fRoundRect(ctx, ex, y - 1, 1, 13, 0.4, INK);
  }
}

// ── broth surges ('surge', x0, x1, low, high, period = 420, phase = 0): the cauldron's broth over columns x0-x1 heaves
// up from row `low` to row `high` and back, again and again (bubbling hard just before). It's scalding: touch it and
// he yelps up out of it, a hit lighter ──
const SURGE_WARN = 70, SURGE_RISE = 70, SURGE_HOLD = 110, SURGE_FALL = 90;
class Surge extends Enemy {
  constructor(x0, x1, low = 13.4, high = 9, period = 420, phase = 0) {
    super(x0 * TILE, 0, (x1 - x0 + 1) * TILE, VIEW_H);
    this.lo = low * TILE; this.hi = high * TILE; this.period = Math.max(period, SURGE_WARN + SURGE_RISE + SURGE_HOLD + SURGE_FALL + 30); this.phase = phase;
    this.surf = this.lo;
    this.passive = this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    const k = (this.t + Math.floor(this.phase * this.period)) % this.period, calm = this.period - SURGE_WARN - SURGE_RISE - SURGE_HOLD - SURGE_FALL;
    let u = 0;
    this.warn = k >= calm && k < calm + SURGE_WARN;
    if (k >= calm + SURGE_WARN) {
      const j = k - calm - SURGE_WARN;
      u = j < SURGE_RISE ? j / SURGE_RISE : j < SURGE_RISE + SURGE_HOLD ? 1 : 1 - (j - SURGE_RISE - SURGE_HOLD) / SURGE_FALL;
      u = u * u * (3 - 2 * u);
    }
    if (k === calm + SURGE_WARN) Sound.play('rumble');
    if (this.warn && this.t % 16 === 0) Sound.play('plop');
    this.surf = this.lo + (this.hi - this.lo) * u;
    const p = g.player;
    const contact = p.state === 'play' && p.x + p.w > this.x && p.x < this.x + this.w && p.y + p.h > this.surf;
    if (contact && !this.playerInBroth) g.hotFootReaction(p);
    this.playerInBroth = contact;
    if (contact && p.y + p.h > this.surf + 3) g.scald(p, 7.4);
  }
  draw(ctx, g) {
    const x0 = Math.round(this.x), s = Math.round(this.surf), t = this.t, bottom = VIEW_H + 8, cam = Math.round(g.camX);
    const a = Math.max(x0, cam - 4), b = Math.min(x0 + this.w, cam + VIEW_W + 4);
    paintRouxSpan(ctx, a, b, x => s + rouxWaveF(x, t) + (this.warn ? Math.sin((x * 3 + t * 5) / 7) : 0), bottom, t, true);
    paintRouxLife(ctx, a, b, s, this.warn ? t * 3 : t, () => true, true);   // (just before it heaves, it boils hard)
  }
}

// ── roux bubbles ('dome', x, row, w = 2): a big glossy bubble of roux bulging up out of the surface, bobbing, firm
// enough to stand on (a stepping stone). Its top is row `row` ──
class RouxDome extends Platform {
  constructor(col, row, wt = 2) {
    super(col, row, wt, 'h', 0, 1, 0);
    this.h = 10; this.bobPh = col * 1.3;
    this.place();this.prevY=this.y;
  }
  place() { super.place(); this.y = this.y0 + 2 + Math.round(Math.sin(this.t * 0.045 + this.bobPh) * 1.5); }
  draw(ctx) {
    const cx = Math.round(this.x + this.w / 2), top = Math.round(this.y), rx = this.w / 2, ry = 14, by = top + ry;
    gumboEll(ctx, cx, by, rx + 1, ry + 1, INK);
    gumboEll(ctx, cx, by, rx, ry, '#c8541c');
    gumboEll(ctx, cx, by - 1, rx - 2, ry - 2, '#e8702a');
    gumboEll(ctx, cx - 3, by - 6, Math.round(rx * 0.55), 5, '#ff9a40');
    gumboEll(ctx, cx - 5, by - 9, 4, 2, '#ffc878'); fEll(ctx, cx - 5.5, top + 4.6, 1.6, 0.6, '#fff6d8');
  }
}

// ── cornbread rafts ('raft', x, row, w, range = 0, period = 300, phase = 0): a slab of cornbread floating on the roux,
// drifting `range` tiles right and back, bobbing ──
class CornRaft extends Platform {
  constructor(col, row, wt, range = 0, period = 300, phase = 0) {
    super(col, row, wt, 'h', range, period, phase);
    this.h = 10; this.bobPh = col * 0.7;
    this.place();this.prevY=this.y;
  }
  place() { super.place(); this.y = this.y0 + 3 + Math.round(Math.sin(this.t * 0.05 + this.bobPh) * 1.5); }
  draw(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y), w = this.w;   // a raft of cornbread: crust, crumb, kernels, soaked below (fine: hires.js)
    fRoundRect(ctx, x - 1, y - 1, w + 2, 12, 2, INK);
    const gr = ctx.createLinearGradient(0, y, 0, y + 10); gr.addColorStop(0, '#eaa050'); gr.addColorStop(0.1, '#c8742a'); gr.addColorStop(0.28, '#b06a24'); gr.addColorStop(0.32, '#ffe080'); gr.addColorStop(0.6, '#eebc4c'); gr.addColorStop(0.8, '#d8a040'); gr.addColorStop(1, '#9a3814');
    fRoundRect(ctx, x - 1 / 3, y - 1 / 3, w + 2 / 3, 10.67, 1.6, gr);
    for (let i = 3; i < w - 2; i += 5) fEll(ctx, x + i + 0.8, y + 4.5 + (i % 4), (i % 3) ? 0.6 : 1, 0.45, '#b07c24');   // crumb
    for (let i = 6; i < w - 3; i += 13) { fRoundRect(ctx, x + i, y + 5, 3, 2, 0.8, '#ffd23a'); fEll(ctx, x + i + 0.8, y + 5.5, 0.5, 0.35, '#fff6b0'); }   // kernels
  }
}

// ── the stockpot ('stockpot', x0, x1, rim = 6, rimL = rim, rimR = rim): a giant cast-iron pot, behind everything over
// columns x0-x1 -- its far wall, and its straight rolled rim at row `rim`, with both sides at that same height.
// Over the rim, the kitchen. `spoons`: giant
// ladles and wooden spoons left standing in it, leaning on the rim (scenery) ──
class StockPot extends Enemy {
  constructor(x0, x1, rim = 6, rimL = rim, rimR = rim, spoons = 1, wallL = 0) {
    super(x0 * TILE, rim * TILE, (x1 - x0 + 1) * TILE, VIEW_H - rim * TILE);
    this.rim = rim * TILE; this.spoons = !!spoons; this.wallL = !!wallL;
    this.passive = this.noFreeze = true; this.behindTiles = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    if (this.wallL && !this.walled) {   // its left side: a solid wall of iron from the rim down (never drawn: draw() paints it), and its loop handle a ledge to hop up on
      this.walled = true;
      const lv = g.level, c = Math.floor(this.x / TILE) - 1, top = this.rimAt(this.x + 2);
      for (let r = Math.floor(top / TILE); r < ROWS; r++) if (lv.get(c, r) === T.EMPTY) lv.set(c, r, T.BODY);
      const hy = top + 10, hx = this.x - 12 - 25;
      g.platforms.push({ x: hx, y: hy, w: 24, h: 6, prevY: hy, dx: 0, dy: 0, update() {}, draw() {} });
    }
  }
  // the top of the rim at world x
  rimAt(x) { return this.rim; }
  draw(ctx, g) {
    // (in fine pixels: hires.js) the far inner wall, the old gumbo stains, the rolled rim -- shapes along rimAt(x)
    const x0 = Math.round(this.x), x1 = x0 + this.w, cam = Math.round(g.camX), t = this.t;
    const a = Math.max(x0, cam - 8), b = Math.min(x1, cam + VIEW_W + 8), q = 1 / ART_R;
    const floor = 12 * TILE;   // where the roux glow comes from
    if (b > a) {
      const along = (f, close) => { ctx.beginPath(); ctx.moveTo(a, close); for (let x = a; x <= b; x += q) ctx.lineTo(x, f(x)); ctx.lineTo(b, close); ctx.closePath(); };
      const wall = x => this.rimAt(x) + 6, wTop = Math.min(wall(a), wall(b), this.rimAt((a + b) / 2) + 6);
      const wg = ctx.createLinearGradient(0, wTop, 0, floor);   // cool iron under the lip, warming to a red glow down where the roux lights it
      [['#2a1e24', 0], ['#342224', 0.12], ['#42261e', 0.3], ['#5a2a18', 0.5], ['#7a3216', 0.68], ['#a0441a', 0.84]].forEach(([c, u]) => wg.addColorStop(u, c));
      ctx.fillStyle = wg; along(wall, VIEW_H + 16); ctx.fill();
      ctx.strokeStyle = '#4a3a40'; ctx.lineWidth = 0.7; ctx.beginPath(); for (let x = a; x <= b; x += q) ctx.lineTo(x, wall(x) + 0.4); ctx.stroke();   // the curve catching the light under the lip
      for (let x = Math.ceil(a); x < b; x++) {
        const h = (x * 2654435761) >>> 0, drip = h % 97;
        if (drip < 3) { const len = 6 + (h >> 8) % 22; fRoundRect(ctx, x, wall(x) + 2, 0.8, len, 0.4, '#5a2410'); fEll(ctx, x + 0.4, wall(x) + 2 + len, 0.6, 0.8, '#5a2410'); }   // old gumbo stains dribbling down
        if (h % 211 < 2) fEll(ctx, x + 0.5, wall(x) + 19 + (h >> 10) % 40, 1.4, 0.8, '#3e2c2c');   // hammered dents
      }
      const tide = x => floor - 22 + Math.sin(x * 0.045) * 2;   // the tide line of old gumbo round the inside
      ctx.strokeStyle = '#5a2010'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let x = a; x <= b; x += q) ctx.lineTo(x, tide(x) + 1.6); ctx.stroke();
      ctx.strokeStyle = '#9a4418'; ctx.lineWidth = 0.6; ctx.beginPath(); for (let x = a; x <= b; x += q) ctx.lineTo(x, tide(x) + 0.3); ctx.stroke();
      // the rolled rim: ink outline, a fat round iron lip with a bright top edge and a warm underside
      ctx.fillStyle = INK; ctx.beginPath(); for (let x = a; x <= b; x += q) ctx.lineTo(x, this.rimAt(x) - 1); for (let x = b; x >= a; x -= q) ctx.lineTo(x, this.rimAt(x) + 7); ctx.fill();
      const rg = ctx.createLinearGradient(0, this.rimAt(a), 0, this.rimAt(a) + 6); rg.addColorStop(0, '#a8a2b0'); rg.addColorStop(0.15, '#6e6874'); rg.addColorStop(0.5, '#4a444e'); rg.addColorStop(0.85, '#3a343e'); rg.addColorStop(1, '#8a4a2a');
      ctx.fillStyle = rg; ctx.beginPath(); for (let x = a; x <= b; x += q) ctx.lineTo(x, this.rimAt(x) - 1 / 3); for (let x = b; x >= a; x -= q) ctx.lineTo(x, this.rimAt(x) + 6); ctx.fill();
      for (let x = Math.ceil(a); x < b; x++) if ((x + 3) % 96 < 1) fEll(ctx, x + 1, this.rimAt(x) + 1.4, 2, 0.5, '#e8e4f0');   // glints
    }
    // giant utensils left standing in the pot: a handle rising out of the roux, leaning on the rim and hooked over it
    if (this.spoons) for (let k = 0, sx = x0 + 18 * TILE; sx < x1 - 12 * TILE; k++, sx += 31 * TILE) {
      const lean = k % 2 ? -1 : 1, topX = sx + lean * 36, topY = this.rimAt(topX) - 2, baseY = floor + 24;
      if (Math.max(sx, topX) + 20 < cam || Math.min(sx, topX) - 20 > cam + VIEW_W) continue;
      const wood = k % 2 === 1, C = wood ? ['#6a3a18', '#a8682e', '#d89a5a'] : ['#3a343a', '#5a5460', '#a8a2b0'];
      ctx.lineCap = 'round';   // the shaft, 5 px thick, lit along one edge (fine strokes: hires.js)
      for (const [wdt, c, off] of [[7.4, INK, 0], [5, C[1], 0], [1, C[2], -1.2], [0.8, C[0], 1.6]]) { ctx.strokeStyle = c; ctx.lineWidth = wdt; ctx.beginPath(); ctx.moveTo(sx + 0.5 + off, baseY); ctx.lineTo(topX + 0.5 + off, topY); ctx.stroke(); }
      // the hook (an iron ladle) or the rounded end (a wooden spoon) over the rim
      if (wood) { gumboEll(ctx, topX, topY - 3, 4, 5, INK); gumboEll(ctx, topX, topY - 3, 3, 4, C[1]); fEll(ctx, topX - 0.6, topY - 4.6, 0.6, 1.6, C[2]); }
      else {
        const rim=this.rimAt(topX),cross=topX+(sx-topX)*(rim+3-topY)/(baseY-topY);
        // The shaft passes behind the rolled lip; only its return hook curls in front.
        const rg=ctx.createLinearGradient(0,rim,0,rim+6);rg.addColorStop(0,'#a8a2b0');rg.addColorStop(.2,'#6e6874');rg.addColorStop(.7,'#3e3842');rg.addColorStop(1,'#8a4a2a');
        fRoundRect(ctx,cross-3.8,rim-1/3,7.6,6.3,1,rg);
        fEll(ctx,topX+lean*10,rim+6,2.6,.6,'#272028');
        for(const [width,color,off] of [[6.8,INK,0],[4.8,C[1],0],[.7,C[2],-.7]]){
          ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(topX+.5+off,topY);
          ctx.bezierCurveTo(topX+lean*1+off,rim-8,topX+lean*8+off,rim-10,topX+lean*10.5+off,rim-3);
          ctx.bezierCurveTo(topX+lean*11.5+off,rim,topX+lean*11+off,rim+4,topX+lean*10+off,rim+7);
          ctx.stroke();
        }
      }
    }
    // rivets along the rim, every so often
    for (let x = Math.ceil(a / 48) * 48; x < b; x += 48) {
      const y = this.rimAt(x) + 9;
      fEll(ctx, x + 1, y + 1, 2, 2, INK); fEll(ctx, x + 1, y + 1, 1.3, 1.3, '#5a5460'); fBlob(ctx, x + 0.6, y + 0.6, 0.45, '#8a8494');
    }
    // at each end, the pot's side: a thick wall of iron curving round from the rim (behind the stage's own wall tiles,
    // where it has them), and a big loop handle riveted on outside it
    for (let [hx, s] of [[x0, -1], [x1, 1]]) {
      if (hx < cam - 60 || hx > cam + VIEW_W + 60) continue;
      const top = this.rimAt(hx - s * 2), wx = s < 0 ? hx - 12 : hx, H2 = VIEW_H - top + 16;   // (fine: hires.js)
      fRoundRect(ctx, wx - 1, top - 1, 14, H2 + 1, 2, INK);
      const wg = ctx.createLinearGradient(wx, 0, wx + 12, 0); wg.addColorStop(s < 0 ? 0 : 1, '#2a242a'); wg.addColorStop(0.5, '#3a343a'); wg.addColorStop(s < 0 ? 0.85 : 0.15, '#5a5460'); wg.addColorStop(s < 0 ? 1 : 0, '#8a4a2a');
      fRoundRect(ctx, wx - 1 / 3, top - 1 / 3, 12.67, H2, 1.6, wg); fRect(ctx, wx, top, 12, 2 / 3, '#a8a2b0');
      hx += s * 12;
      const hy = top + 10, lx = s < 0 ? hx - 26 : hx;
      ctx.lineWidth = 6.6; ctx.strokeStyle = INK; ctx.beginPath(); ctx.ellipse(lx + 13, hy + 10, 10, 8, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 5; ctx.strokeStyle = '#4a444e'; ctx.stroke();
      ctx.lineWidth = 0.8; ctx.strokeStyle = '#7a7480'; ctx.beginPath(); ctx.ellipse(lx + 13, hy + 10, 11.6, 9.6, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    }
  }
}

// ── a heap of vegetables ('vegslope', x0, row0, x1, row1): gumbo vegetables piled into a slope he walks up, from the
// floor at (x0, row0) to the top of a ledge at (x1, row1) -- okra, celery, corn, bell peppers and onions, in layers that
// darken with depth, their tops flush with the walking line. It's a one-way slope (LadleSlope), so no blocks under it ──
// a crisp filled disc (spans, no anti-aliasing)
function vegDisc(g, x, y, r, col) {   // (a smooth one on a fine canvas: hires.js)
  if (isFineCtx(g)) { fEll(g, x + 0.5, y + 0.5, r + 0.5, r + 0.5, col); return; }
  g.fillStyle = col; x = Math.round(x); y = Math.round(y);
  for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); g.fillRect(x - w, y + dy, w * 2 + 1, 1); }
}
// a fat stroke of discs from (x0, y0) to (x1, y1), radius tapering from r0 to r1
function vegStroke(g, x0, y0, x1, y1, r0, r1, col) {
  const fine = isFineCtx(g), n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) * (fine ? 2 : 1)));
  for (let i = 0; i <= n; i++) { const k = i / n, r = r0 + (r1 - r0) * k; vegDisc(g, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, fine ? Math.max(0.2, r) : Math.max(0, Math.round(r)), col); }
}
// the vegetables, painted on a fine canvas (makeHiCanvas): smooth bodies, one ink line, little details in fine strokes
const VEG = {
  // an okra pod lying along (dx, dy): fat at the stem end, tapering to a point, ridged, a shine along its top
  okra(g, x, y, len, dx, dy) {
    const ex = x + dx * len, ey = y + dy * len;
    vegStroke(g, x, y, ex, ey, 4, 2, INK); vegStroke(g, x, y, ex, ey, 3, 1, '#3a8a2a');
    vegStroke(g, x, y - 1, ex, ey - 1, 1, 0.2, '#7ac850');
    for (let k = 4; k < len - 2; k += 4) fRoundRect(g, x + dx * k + 0.2, y + dy * k + 1, 0.67, 2, 0.3, '#2a6a1c');   // its ridges
    vegDisc(g, x - dx * 2, y - dy * 2, 3, INK); vegDisc(g, x - dx * 2, y - dy * 2, 2, '#2a5a1a');   // the stem cap
  },
  // a rib of celery: pale green, ribbed lengthwise, a warm edge where the fire catches it
  celery(g, x, y, len, dx, dy) {
    const ex = x + dx * len, ey = y + dy * len;
    vegStroke(g, x, y, ex, ey, 4, 4, INK); vegStroke(g, x, y, ex, ey, 3, 3, '#a8d878');
    vegStroke(g, x, y - 2, ex, ey - 2, 0.35, 0.35, '#e8c070');
    vegStroke(g, x, y, ex, ey, 0.35, 0.35, '#d8f4a8'); vegStroke(g, x, y + 2, ex, ey + 2, 0.35, 0.35, '#78b050');
    for (const [fx, fy] of [[-3, -3], [-4, 1]]) vegDisc(g, ex + fx + dx * 3, ey + fy + dy * 3, 2, '#5ab048');   // a leaf at its end
  },
  // a cob of corn: golden, rows of kernels picked out
  corn(g, x, y, len, dx, dy) {
    const ex = x + dx * len, ey = y + dy * len;
    vegStroke(g, x, y, ex, ey, 5, 4, INK); vegStroke(g, x, y, ex, ey, 4, 3, '#d89a28');
    for (let k = 1; k < len; k += 3) for (const o of [-2, 1]) {
      const kx = x + dx * k, ky = y + dy * k + o;
      fRoundRect(g, kx, ky, 2, 1.8, 0.7, '#ffd23a'); fEll(g, kx + 0.6, ky + 0.5, 0.4, 0.3, '#fff3a0');   // kernels
    }
    vegStroke(g, ex, ey, ex + dx * 4, ey + dy * 4 - 1, 3, 1, '#7a9a3a');   // a tuft of husk
  },
  // a bell pepper, green or red: three lobes, a crease, a shine, a stem
  pepper(g, x, y, r, red) {
    const C = red ? ['#8a1a10', '#d8301a', '#ff8a6a'] : ['#1e5a1a', '#3a9a2a', '#9ae070'];
    vegDisc(g, x, y, r + 1, INK); vegDisc(g, x, y, r, C[1]);
    fRoundRect(g, x - 0.6, y - r + 2, 0.67, r * 2 - 3, 0.3, C[0]); fRoundRect(g, x + 2.2, y - r + 3, 0.67, r * 2 - 5, 0.3, C[0]);   // the creases
    fEll(g, x - r * 0.45 + 0.5, y - r * 0.4 + 0.5, 1.2, 0.8, C[2]); fBlob(g, x - r * 0.5 + 0.3, y - r * 0.5 + 0.3, 0.4, '#ffffff');
    fRoundRect(g, x - 1, y - r - 3, 3, 3, 1, INK); fRoundRect(g, x + 0.1, y - r - 2.4, 0.8, 2, 0.3, '#3a7a2a');   // the stem
  },
  // an onion: papery gold-white, striped, a little sprout on top
  onion(g, x, y, r) {
    vegDisc(g, x, y, r + 1, INK); vegDisc(g, x, y, r, '#ead8a0');
    for (const o of [-r / 2, r / 2]) fRoundRect(g, x + o + 0.2, y - r + 2, 0.67, r * 2 - 3, 0.3, '#c8a060');
    fEll(g, x - r * 0.5, y - r * 0.5 + 0.5, 1.2, 0.45, '#fff6d8');
    fRoundRect(g, x - 1, y - r - 3, 3, 3, 1, INK); fRoundRect(g, x + 0.1, y - r - 3, 0.8, 2, 0.3, '#9ac860');
  },
};
// Vegetables baked into the cornbread itself (Game.drawGumboTerrainVeg), painted like the real things (mArt, meadow-art.js):
// soft shading lit from the upper left, their own textures, and a ring of dark crumb round each so it sits pressed IN the
// bread, never on it. 'w' 2 pieces fill a 2x1-tile spot (28 x 12), 1 a tile (12 x 12).
const VEG_CHUNKS = {
  corn: { w: 2, paint(A) {   // a short length of buttered cob: plump kernels in curving rows, each one its own little dome
    A.fill(1.5, 1.5, 26.5, 10.5, (x, y) => { const u = (x - 14) / 12.6, v = (y - 6) / 4.4; return u * u * u * u + v * v <= 1 ? '#c8961a' : null; });
    A.fill(1.5, 1.5, 26.5, 10.5, (x, y) => {
      const u = (x - 14) / 12.6, v = (y - 6) / 4.4; if (u * u * u * u + v * v > 1) return null;
      const kx = (x - 1.5) / 2.1, ky = (y - 1.5 + Math.sin(x * 0.25) * 0.4) / 1.8, fx = kx - Math.floor(kx) - 0.5, fy = ky - Math.floor(ky) - 0.5;
      const k = fx * fx * 1.4 + fy * fy;
      if (k > 0.2) return null;   // (the gaps between the kernels)
      const tone = (Math.sin(Math.floor(kx) * 12.9 + Math.floor(ky) * 78.2) * 43758.5) % 1;
      return softTone(['#a87814', '#d8a828', '#f4cc48', '#ffe27a', '#fff4c0'], 0.9 - fy * 2.2 - fx * 1.4 - v * 0.6 + Math.abs(tone) * 0.25);
    }, true);
  } },
  okra: { w: 2, paint(A) {   // a whole pod: five ridges running its length, fine fuzz, its stem cap at the fat end
    const half = x => x < 5 ? 2.4 : 3.6 * Math.pow(1 - (x - 5) / 22, 0.75) + 0.3;
    A.fill(1, 1, 27, 11, (x, y) => {
      const h = half(x), v = (y - 6) / h; if (x > 26.5 || Math.abs(v) > 1) return null;
      const ridge = Math.abs(Math.sin(v * 2.4 + 0.3)) ;
      return softTone(['#1e4a14', '#2e6a20', '#4a9030', '#74b84a', '#b4e08a'], 0.7 - v * 0.9 + (ridge > 0.85 ? 0.35 : ridge < 0.2 ? -0.5 : 0));
    });
    A.fill(1, 2, 5, 10, (x, y) => Math.abs(y - 6) < 2.6 ? softTone(['#3a3a1a', '#5a5a2a', '#7a7a3a', '#9a9a52', '#c8c890'], 0.6 - (y - 6) * 0.3) : null);   // the cap
    A.fill(5, 2, 27, 10, (x, y) => (Math.floor(x * 3) * 7 + Math.floor(y * 3) * 13) % 17 === 0 ? '#c8ec9a' : null, true);   // fuzz
  } },
  celery: { w: 2, paint(A) {   // a rib of celery: pale green, strung with ridges, its cut ends lighter
    A.fill(1, 2, 27, 10, (x, y) => {
      const top = 3 + Math.sin(x * 0.2) * 0.4, bot = 9.4 - Math.sin(x * 0.15) * 0.3; if (y < top || y > bot) return null;
      const v = (y - top) / (bot - top), str = Math.abs(Math.sin(v * 14)) < 0.18;
      const end = x < 2.2 || x > 25.8;
      return end ? '#e8f4c0' : softTone(['#5a8a3a', '#7aa84a', '#a0c868', '#c8e490', '#eef8c8'], 0.9 - v * 1.6 + (str ? -0.45 : 0));
    });
  } },
  slice: { w: 1, paint(A) {   // a round of okra cut across: a ridged green rim, pale flesh, the star of seeds
    A.fill(0.5, 0.5, 11.5, 11.5, (x, y) => {
      const dx = x - 6, dy = y - 6, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), R = 4.6 + Math.cos(a * 5) * 0.5;
      if (r > R) return null;
      if (r > R - 1) return softTone(['#1e4a14', '#2e6a20', '#4a9030', '#74b84a', '#a4d878'], 0.4 - dx * 0.12 - dy * 0.15);
      if (r > R - 1.6) return '#c8e8a0';
      const seedR = 2.1, sa = Math.round(a / (Math.PI * 2 / 5)) * (Math.PI * 2 / 5), sx = Math.cos(sa) * seedR, sy = Math.sin(sa) * seedR;
      if (Math.hypot(dx - sx, dy - sy) < 0.9) return Math.hypot(dx - sx + 0.3, dy - sy + 0.3) < 0.45 ? '#e8f4d0' : '#5a9a3a';
      return softTone(['#a8cc80', '#c4e098', '#dcf0b4', '#ecf8d0', '#f8fff0'], 0.6 - r * 0.15);
    });
  } },
  pepper: { w: 1, paint(A) { vegPepperChunk(A, ['#123a12', '#1e5a1c', '#2e8a2a', '#5ab848', '#c0f0a8'], '#e4f4c4'); } },
  redpep: { w: 1, paint(A) { vegPepperChunk(A, ['#5a0a0a', '#8a1414', '#c42a20', '#f05a40', '#ffc0a8'], '#ffe0c8'); } },
  onion: { w: 1, paint(A) {   // a wedge of onion: translucent layers in curving bands
    A.fill(0.5, 1, 11.5, 11, (x, y) => {
      const dx = x - 1.2, dy = y - 11, r = Math.hypot(dx, dy), a = Math.atan2(-dy, dx);
      if (r > 10 || r < 2 || a < 0.15 || a > 1.45) return null;
      const layer = r % 2.1;
      return layer < 0.3 ? '#b8a8c0' : softTone(['#c8b8c8', '#e0d4e0', '#f0e8f0', '#fbf6fb', '#ffffff'], 0.5 + (layer - 1) * 0.4 - (a - 0.8) * 0.4);
    });
  } },
  sausage: { w: 1, paint(A) {   // a coin of andouille: browned skin round the edge, coarse pink-brown meat, white flecks of fat
    A.fill(0.5, 0.5, 11.5, 11.5, (x, y) => {
      const dx = x - 6, dy = y - 6, r = Math.hypot(dx / 5.2, dy / 4.6);
      if (r > 1) return null;
      if (r > 0.82) return softTone(['#3a1408', '#5a2410', '#7a3a1a', '#9a5428', '#c07a44'], 0.5 - dx * 0.1 - dy * 0.12);
      const h = Math.sin(Math.floor(x * 2) * 12.9 + Math.floor(y * 2) * 78.2) * 43758.5, f = h - Math.floor(h);
      if (f > 0.86) return '#f4e8dc';                                                       // fat
      return softTone(['#6a2a1a', '#8a3a28', '#a85a40', '#c87a5a', '#e8a888'], 0.45 - dy * 0.12 + (f < 0.2 ? -0.4 : 0));
    });
  } },
};
// a curved chunk of bell pepper: glossy skin with a bright highlight, the pale cut flesh along its inner edge
function vegPepperChunk(A, skin, flesh) {
  A.fill(0.5, 1, 11.5, 11, (x, y) => {
    const dx = x - 6, dy = y - 12.5, r = Math.hypot(dx, dy);
    if (r > 10.4 || r < 5.2 || Math.abs(dx) > 5.4) return null;
    if (r < 6.1) return flesh;
    return softTone(skin, 0.5 - dx * 0.1 + (10.4 - r) * 0.1 + (r > 9.3 && dx < -1 ? 0.8 : 0));
  });
}
const VEG_CHUNK_ART = {};
function vegChunk(kind) {   // (painted fine: hires.js)
  if (VEG_CHUNK_ART[kind]) return VEG_CHUNK_ART[kind];
  const k = VEG_CHUNKS[kind], A = mArt(k.w === 2 ? 28 : 12, 12);
  k.paint(A);
  A.outline('#7a4614', 1); A.outline('#9a6020', 1);   // (a ring of dark crumb: it's pressed into the bread)
  return (VEG_CHUNK_ART[kind] = A.canvas());
}
// Reuse the fine vegetable decorations without the cornbread crust around them.
const HEAP_VEGETABLE_ART=new Map();
function heapVegetableArt(kind){
  if(HEAP_VEGETABLE_ART.has(kind))return HEAP_VEGETABLE_ART.get(kind);
  const K=VEG_CHUNKS[kind],A=mArt(K.w===2?28:12,12);K.paint(A);
  const art=A.outline('#43401e',1).canvas();HEAP_VEGETABLE_ART.set(kind,art);return art;
}
class VegSlope extends Enemy {
  constructor(x0, row0, x1, row1) {
    super(x0 * TILE, row1 * TILE - 16, (x1 - x0) * TILE, (row0 - row1) * TILE + 16);
    this.xa = x0 * TILE; this.ya = row0 * TILE; this.xb = x1 * TILE; this.yb = row1 * TILE;
    this.xt = this.xb - 10;   // (it tops out a little short of the ledge, so his front edge never meets its face)
    this.passive = this.friendly = this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    if (!this.slope) { this.slope = new LadleSlope(this.xa, this.ya, this.xt, this.yb, this.xa - 10, this.xb + 6); g.platforms.push(this.slope); }
  }
  lineY(x) { return this.ya + (clamp(x, this.xa, this.xt) - this.xa) * (this.yb - this.ya) / (this.xt - this.xa); }
  // baked once: the heap is still life
  bake() {
    const X0=this.xa-12,X1=this.xb+6,Y0=this.yb-12,Y1=this.ya+6,W=X1-X0,H=Y1-Y0;
    const c=makeHiCanvas(W,H),g=c.getContext('2d'),angle=Math.atan2(this.yb-this.ya,this.xt-this.xa);
    const dx=Math.cos(angle),dy=Math.sin(angle),len=Math.hypot(this.xt-this.xa,this.yb-this.ya);
    const L=x=>this.lineY(x+X0)-Y0,rng=mulberry32(4101),long=['okra','celery','corn'],small=['onion','slice','pepper','redpep'];
    // A dark core only fills the tiny crevices between overlapping, shaded vegetables.
    g.fillStyle='#33321b';g.beginPath();g.moveTo(this.xa-X0-4,H);
    for(let x=this.xa-X0-4;x<=W;x+=1/ART_R)g.lineTo(x,L(x)+4);
    g.lineTo(W,H);g.closePath();g.fill();
    const layers=Math.ceil((this.ya-this.yb)/9)+2;
    for(let k=layers-1;k>=0;k--)for(let u=(k%2)*7-8;u<len+14;u+=12+rng()*7){
      const sx=this.xa-X0+dx*u,ly=L(sx)+k*9;
      if(ly>H+5)continue;
      const pick=rng(),kind=k===0?long[Math.floor(rng()*long.length)]:pick<.48?long[Math.floor(rng()*long.length)]:small[Math.floor(rng()*small.length)];
      let art=heapVegetableArt(kind),turn=angle+(k?(rng()-.5)*1.1:0),scale=.9+rng()*.2;
      // Whole bulbs and peppers are the same fine art used by the trinity, without their faces.
      if(k>0&&pick>.8){art=pick>.91?onionArt(true):pepperArt(pick>.85,0);scale=.6+rng()*.13;turn=angle+(rng()-.5)*.9;}
      g.save();g.translate(sx-dy*4.4,ly+dx*4.4);g.rotate(turn);g.scale(scale,scale);
      fEll(g,1,3,art.width*.44,art.height*.3,'#242414');
      g.drawImage(art,-art.width/2,-art.height/2);g.restore();
    }
    // A soft depth shadow binds the heap while keeping the surface vegetables bright.
    g.globalCompositeOperation='source-atop';
    const shade=g.createLinearGradient(0,0,0,H);shade.addColorStop(0,'rgba(24,30,12,0)');shade.addColorStop(.6,'rgba(24,26,10,.08)');shade.addColorStop(1,'rgba(24,20,8,.4)');
    g.fillStyle=shade;g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over';
    // Trim to the actual walkable incline, including the smooth transfer onto the ledge.
    g.globalCompositeOperation='destination-out';g.beginPath();g.moveTo(0,0);
    for(let x=0;x<=W;x+=1/ART_R)g.lineTo(x,Math.max(0,L(x)-.5));
    g.lineTo(W,0);g.closePath();g.fill();g.globalCompositeOperation='source-over';
    g.clearRect(0,this.ya+3-Y0,W,H);this.art={c,x:X0,y:Y0};
  }
  draw(ctx) {
    if (!this.art) this.bake();
    ctx.drawImage(this.art.c, this.art.x, this.art.y);
  }
}

// ── the wooden spoon ('ladle', x0, row0, x1, row1): a big wooden spoon left standing in the pot, its bowl half sunk in
// the roux at (x0, row0), its handle running up to rest on the rim at (x1, row1) -- a slope he can walk up. And sitting
// on the rim at the top: an alarm clock. Ring it, and the dream is over (the ending: game-gumbo.js) ──
class LadleSlope {
  constructor(xa, ya, xb, yb, from = xa, to = xb) {
    this.xa = xa; this.ya = ya; this.xb = xb; this.yb = yb; this.from = from; this.to = to;   // (from..to: where it catches him -- level in the bowl, and over the hook onto the rim)
    this.x = xa; this.y = VIEW_H + 200; this.w = 1; this.h = 6; this.dx = 0; this.dy = 0; this.prevY = this.y;
  }
  lineY(x) { return this.ya + (clamp(x, this.xa, this.xb) - this.xa) * (this.yb - this.ya) / (this.xb - this.xa); }
  update(g) {
    // a strip of handle that follows him about: one way, like any platform (he can jump up through it)
    const p = g.player, cx = p.x + p.w / 2, nx = cx + (p.vx || 0);
    const old = this.y;
    if (cx < this.from || cx > this.to) { this.y = this.prevY = VIEW_H + 200; this.dy = 0; return; }
    this.x = p.x - 3; this.w = p.w + 6;
    this.y = this.lineY(nx);
    this.dy = p.platform === this ? this.y - this.lineY(cx) : 0;
    this.prevY = Math.max(old, this.y) > VIEW_H ? this.y : old;
  }
  draw() {}
}
const SPOON_WOOD = ['#4a2810', '#7a4a20', '#a86c34', '#cf9656', '#ecc489'];
class Ladle extends Enemy {
  constructor(x0, row0, x1, row1) {
    super(x0 * TILE - 40, row1 * TILE - 40, (x1 - x0 + 1) * TILE + 40, (row0 - row1) * TILE + 60);
    this.xa = x0 * TILE + 24; this.ya = (row0 + 1) * TILE; this.xb = (x1 + 1) * TILE; this.yb = row1 * TILE;
    this.clockX = this.xb + 36; this.clockY = this.yb;   // (the clock stands on the counter, a little past where the handle pokes out over the rim)
    this.state = 'tick'; this.ringT = 0;
    this.passive = this.friendly = this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return { x: this.clockX - 11, y: this.clockY - 30, w: 22, h: 30 }; }
  lineY(x) { return this.ya + (clamp(x, this.xa, this.xb) - this.xa) * (this.yb - this.ya) / (this.xb - this.xa); }   // (the handle's top: anything on wheels rides it)
  update(g) {
    this.t++;
    if (!this.slope) { this.slope = new LadleSlope(this.xa, this.ya, this.xb - 4, this.yb - 2, this.xa - 30, this.xb + 8); g.platforms.push(this.slope); }
    if (this.state === 'ring') this.ringT++;
  }
  onTouch(g) {
    if (this.state !== 'tick') return;
    this.state = 'ring'; this.ringT = 0;
    g.startFeverOutro(this);
  }
  // the spoon is still life: baked once. The handle's top edge is exactly the walking line; it ends in a rounded tip
  // resting on the rim; the broad bowl curves down into the roux from the handle's neck
  bake() {
    const { xa, ya, xb, yb } = this, X0 = xa - 52, Y0 = yb - 30, W = xb + 26 - X0, H = ya + 32 - Y0;
    const c = makeHiCanvas(W, H), g = c.getContext('2d'), P = SPOON_WOOD, R = ART_R, q = 1 / R, raw = c.canvas;   // (painted fine: hires.js)
    const line = x => ya + (x - xa) * (yb - ya) / (xb - xa);
    // The neck meets the bowl at its upper right shoulder. Its smooth wooden rim sweeps left;
    // the rounded right side dips below it. Rasterize both curves to keep the artwork pixel sharp.
    const bx = xa - X0, by = ya - Y0, neckY = line(xa + 26) - ya;
    for (const hollow of [false, true]) {
      g.beginPath();
      if (!hollow) {
        g.moveTo(bx + 26, by + neckY);
        g.bezierCurveTo(bx + 8, by - 11, bx - 23, by - 8, bx - 42, by);
        g.bezierCurveTo(bx - 50, by + 4, bx - 39, by + 21, bx - 17, by + 24);
        g.bezierCurveTo(bx + 8, by + 27, bx + 28, by + 14, bx + 30, by + 2);
        g.bezierCurveTo(bx + 32, by - 5, bx + 30, by - 13, bx + 26, by + neckY);
      } else {
        g.moveTo(bx + 23, by + neckY + 6);
        g.bezierCurveTo(bx + 7, by - 7, bx - 22, by - 4, bx - 38, by + 3);
        g.bezierCurveTo(bx - 42, by + 8, bx - 32, by + 18, bx - 16, by + 20);
        g.bezierCurveTo(bx + 7, by + 22, bx + 24, by + 11, bx + 26, by + 2);
        g.bezierCurveTo(bx + 27, by - 3, bx + 25, by - 8, bx + 23, by + neckY + 6);
      }
      g.closePath();
      for (let y = Math.floor(by + neckY - 1); y <= by + 28; y += q) for (let x = bx - 48; x <= bx + 33; x += q) {
        if (!g.isPointInPath((x + q / 2) * R, (y + q / 2) * R)) continue;   // (the test is in canvas pixels)
        const u = (x - bx + 8) / 40, v = (y - by + 0.3 * (x - bx)) / 20;
        if (hollow) {
          g.fillStyle=softTone(['#835b3c','#ad8356','#ceab77','#e4c894','#f1ddb1'],-u*.3-v*.6+.15);
        } else {
          const l = -0.3 * u - v;
          g.fillStyle = P[l > 0.2 ? 4 : l > -0.15 ? 3 : l > -0.65 ? 2 : 1];
        }
        g.fillRect(x, y, q, q);
      }
    }
    // the handle, column by column: its top edge on the line, 10 px thick (a little slimmer at the neck by the bowl),
    // rounded wood with a grain running along it, and a rounded tip
    // (like a real one: slim at the neck, flaring gently toward the end, finished in a round cap about its middle)
    const tip0 = xb + 6, x1 = xb + 18;   // (it leans on the rim and pokes out over it, the way a spoon left in a pot does)
    for (let x = xa + 20; x <= x1; x += q) {
      const y = line(x) - Y0, cx = x - X0, u = clamp((x - xa) / (tip0 - xa), 0, 1);
      const T = 6 + 3.5 * u * u, k = x > tip0 ? (x - tip0) / (x1 - tip0 + 0.5) : 0, half = T / 2 * Math.sqrt(Math.max(0, 1 - k * k));
      const top = T / 2 - half, bot = Math.max(top + q, T / 2 + half), span = bot - top;
      for (const [r0, r1, col] of [[0, 0.15, P[4]], [0.15, 0.45, P[3]], [0.45, 0.8, P[2]], [0.8, 1, P[1]]]) { g.fillStyle = col; g.fillRect(cx, y + top + span * r0, q, span * (r1 - r0)); }
    }
    for (let x = Math.round(xa + 22); x <= tip0 - 2; x++) {   // the grain, and a knot now and then
      const y = line(x) - Y0, h = (x * 2654435761) >>> 0;
      if (h % 5 === 0) fRoundRect(g, x - X0, y + 2 + (h >> 4) % 3, 2.4, 0.5, 0.25, P[1]);
      if ((x + 9) % 61 < 1) { fEll(g, x - X0 + 0.5, y + 3.2, 1.2, 0.8, P[0]); fEll(g, x - X0 + 0.2, y + 2.7, 0.5, 0.3, P[4]); }
    }
    const hx = xb + 8, hy = line(hx) + 4;   // the hole for hanging it up, near the tip
    fEll(g, hx - X0 + 0.5, hy - Y0 + 1, 1.6, 1.1, P[0]); fEll(g, hx - X0 + 0.5, hy - Y0 + 1, 0.8, 0.6, '#2a1408');
    try {   // one ink outline round the whole spoon (two art pixels)
      for (let pass = 0; pass < 2; pass++) {
        const RW = raw.width, RH = raw.height, img = g.getImageData(0, 0, RW, RH), a = img.data, solid = (x, y) => x >= 0 && y >= 0 && x < RW && y < RH && a[(y * RW + x) * 4 + 3] > 40, edge = [];
        for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) edge.push(x, y);
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = INK; for (let k = 0; k < edge.length; k += 2) g.fillRect(edge[k], edge[k + 1], 1, 1); g.restore();
      }
    } catch (e) { /* (no pixel access: no outline) */ }
    for (let x = xa + 30; x < xb - 20; x += 46) { g.strokeStyle = '#fff2d0'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x - X0, line(x) - Y0 + 0.5); g.lineTo(x + 6 - X0, line(x + 6) - Y0 + 0.5); g.stroke(); }   // a glint along the top of the handle
    this.art = { c, x: X0, y: Y0 };
  }
  draw(ctx, g) {
    if (!this.art) this.bake();
    ctx.drawImage(this.art.c, this.art.x, this.art.y);

  }
  // The alarm clock ends the dream.
  drawClock(ctx,g) {
    const ring=this.state==='ring',shake=ring?Math.sin(this.ringT*1.3)*1.5:0;
    ctx.save(); ctx.translate(this.clockX + shake, this.clockY);
    ctx.drawImage(ladleClockArt(), -15, -32);
    if (ring) {
      for (const side of [-1, 1]) {
        ctx.strokeStyle = '#fff0b6'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(side * 13, -27); ctx.quadraticCurveTo(side * 16, -25, side * 15, -21); ctx.stroke();
      }
    }
    ctx.restore();
  }

}

let LADLE_CLOCK_ART = null;
function ladleClockArt() {
  if (LADLE_CLOCK_ART) return LADLE_CLOCK_ART;
  const P = smoothPainter(30, 32, 15, 32), {path, ell, line, grad} = P;
  const red = grad(-27, -3, '#f07b77', '#aa344e'), gold = grad(-30, -22, '#ffe4a0', '#bf873e');
  for (const side of [-1, 1]) {
    line(side * 6, -5, side * 8, -1, '#404154', 2.2);
    line(side * 7, -23, side * 8, -27, '#706974', 1);
    ell(side * 8, -27, 4.7, 3.1, gold, P.ink, 0.65, side * 0.25);
  }
  line(0, -29, 0, -26, '#706974', 1.2);
  ell(0, -29.5, 2.4, 0.7, gold, P.ink, 0.45);
  ell(0, -14, 10.8, 11.4, red);
  ell(0, -14, 8.5, 9, grad(-23, -5, '#fffdf0', '#eadfbc'), '#a88764', 0.6);
  for (let i = 0; i < 12; i++) {
    const a = i / 6 * Math.PI;
    line(Math.sin(a) * 6.7, -14 - Math.cos(a) * 7.2, Math.sin(a) * 7.1, -14 - Math.cos(a) * 7.6, '#675b5d', 0.5);
  }
  line(0, -14, 0, -20.5, '#3d3547', 0.9);
  line(0, -14, 3.8, -11.8, '#3d3547', 0.9);
  ell(0, -14, 0.9, 0.9, '#b36b57', null);
  path('M -8 -18 Q -9 -12 -6 -8', null, 'rgba(255,244,216,.55)', 0.6);
  LADLE_CLOCK_ART = P.art;
  return LADLE_CLOCK_ART;
}

// their 1x drawings, lifted to the fine screen look by look (hires.js)

