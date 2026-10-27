'use strict';
// The shadow's look: dark outline and eyes become a violet glow and everything else goes
// ink-black, like a photo negative of the sprite. Cached per source image.
// EVIL UMBRAROO's shadows: pitch black with blood-red eyes and outline (meaner than Chickaroo's own).
const SHADE_INK = { shade: [[0xb4, 0x8c, 0xff], [0x12, 0x0a, 0x26]], evil: [[0xff, 0x2a, 0x3a], [0x08, 0x02, 0x0c]] };
function tintCanvas(img, kind) {   // (a fine image stays fine: hires.js)
  const src = img.canvas || img, Rr = img.r || 1, W = src.width, H = src.height;
  const [line, body] = SHADE_INK[kind], c = makeCanvas(W, H), g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const d = g.getImageData(0, 0, W, H), px = d.data;
  if (kind === 'evil') tintCanvas.last = Uint8ClampedArray.from(px);
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const lum = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11, [r, gg, b] = lum < 70 ? line : body;
    px[i] = r; px[i + 1] = gg; px[i + 2] = b;
  }
  if (kind === 'evil') scowl(px, W, H, line, body, Rr);
  g.putImageData(d, 0, 0);
  return Rr > 1 ? hiRes(c, Rr) : c;
}
// EVIL UMBRAROO's shadows get the giant's eyes: each of Chickaroo's two eyes (found by their colour in the
// sprite, before tinting would lose them) burns red with a hot core and its top inner corner cut away, an
// angry slant. `px` has already been tinted, so the eye's own pixels are re-read from a fresh copy.
function scowl(px, W, H, line, body, Rr = 1) {
  const eye = [0x2a, 0x23, 0x42], src = tintCanvas.last;   // src: the untinted pixels (see tintCanvas)
  if (!src) return;
  const isEye = (x, y) => x >= 0 && y >= 0 && x < W && y < H && src[(y * W + x) * 4 + 3] && Math.abs(src[(y * W + x) * 4] - eye[0]) + Math.abs(src[(y * W + x) * 4 + 1] - eye[1]) + Math.abs(src[(y * W + x) * 4 + 2] - eye[2]) < 24;
  const set = (x, y, c) => { const i = (y * W + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; };
  const seen = new Set(), comps = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!isEye(x, y) || seen.has(y * W + x)) continue;
    const comp = [], stack = [[x, y]]; seen.add(y * W + x);
    while (stack.length) {   // one eye at a time (its own connected blob of pixels)
      const [cx, cy] = stack.pop(); comp.push([cx, cy]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (isEye(nx, ny) && !seen.has(ny * W + nx)) { seen.add(ny * W + nx); stack.push([nx, ny]); } }
    }
    comps.push(comp);
  }
  // only small blobs are eyes (anything bigger is some other dark part of a pose); the pair's middle says which end is "in"
  const eyes = comps.filter(c => c.length <= 14 * Rr * Rr * 2);
  if (!eyes.length) return;
  const mid = eyes.reduce((a, c) => a + c.reduce((s, q) => s + q[0], 0) / c.length, 0) / eyes.length;
  for (const e of eyes) {
    const xs = e.map(q => q[0]), ys = e.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    if (x1 - x0 > 4 * Rr + 2 || y1 - y0 > 4 * Rr + 2) continue;
    const left = (x0 + x1) / 2 < mid || eyes.length === 1;
    for (const [x, y] of e) set(x, y, line);
    for (const [x, y] of e) if (y > y1 - Rr && x !== (left ? x0 : x1)) set(x, y, [0xff, 0xb0, 0x8a]);   // a hot core along the bottom
    for (const [x, y] of e) if (y - y0 < Rr && (left ? x > x1 - Rr * 1.5 + (y - y0) : x < x0 + Rr * 1.5 - (y - y0))) set(x, y, body);   // the brow pulled down over the inner corner
  }
}
// A trail snapshot drawn exactly as Chickaroo was (Game.drawPlayer itself, so a roll, a spin, a pound,
// a flap, the hammer, squash and stretch... everything he does, the shadow does): rendered into its own
// canvas with his feet at (SNAP_X, SNAP_Y), then tinted on demand. The last few are kept, since the
// echoes (and their afterimages) keep replaying the same frames.
const SNAP_W = 112, SNAP_H = 96, SNAP_X = 56, SNAP_Y = 80;
const snapCache = new Map();
function snapRender(g, s, kind) {
  let r = snapCache.get(s);
  if (!r) {
    const c = makeHiCanvas(SNAP_W, SNAP_H), ctx = c.getContext('2d');   // (fine, like him: hires.js)
    ctx.setTransform(ART_R, 0, 0, ART_R, 0, 0); ctx.translate(SNAP_X - Math.round(s.x + s.w / 2), SNAP_Y - Math.round(s.y + s.h));
    const keep = [g.player, g.t, g.shield];
    g.player = Object.assign({}, s, { invuln: 0 }); g.t = s.gt != null ? s.gt : g.t; g.shield = false;   // (a shadow doesn't blink, or wear the bubble)
    try { g.drawPlayer(ctx); } finally { [g.player, g.t, g.shield] = keep; }
    snapCache.set(s, r = { plain: c });
    if (snapCache.size > 64) snapCache.delete(snapCache.keys().next().value);
  }
  return kind === 'plain' ? r.plain : r[kind] || (r[kind] = tintCanvas(r.plain, kind));
}
// draw it with his feet at the snapshot's spot (vflip: upside down about the line y = vflip, for a reflection)
function drawSnap(ctx, g, s, kind, dx = 0, vflip = null) {
  if (kind === 'evil') {
    // Repaint the pursuing chick at native resolution, retaining the recorded movement and pose.
    const pose = shadePose(s), mode = s.crouch || s.roll ? 'crouch' : !s.onGround ? 'jump' : s.skid ? 'skid' : Math.abs(s.vx) > 0.15 ? 'run' : 'idle';
    const art = umbrarooArt(pose.width, pose.height, mode, mode === 'run' ? Math.floor(s.anim || 0) % 4 : 0);
    drawSprite(ctx, art, s.x + s.w / 2 + dx, s.y + s.h, s.facing < 0);
    return;
  }
  const img = snapRender(g, s, kind), x = Math.round(s.x + s.w / 2 + dx) - SNAP_X, y = Math.round(s.y + s.h) - SNAP_Y;
  if (vflip == null) { ctx.drawImage(img, x, y); return; }
  ctx.save(); ctx.translate(0, vflip * 2); ctx.scale(1, -1); ctx.drawImage(img, x, y); ctx.restore();
}
// Which of Chickaroo's frames a recorded trail snapshot was showing (a pared-down drawPlayer: sizes the
// boss shadows' menace; the shadows themselves use drawSnap).
function shadePose(s) {
  const set = s.power === 0 ? SPR.small : s.power === 1 ? SPR.big : s.suit && s.suit !== 'fire' ? SPR.suit[s.suit] : SPR.fire;
  let f = 'idle';
  if (s.crouch || s.roll) f = 'crouch';
  else if (!s.onGround) f = s.vy > 1 ? 'fall' : 'jump';
  else if (s.skid) f = 'skid';
  else if (Math.abs(s.vx) > 0.15) f = 'run' + (Math.floor(s.anim) % 4);
  return set[f] || set.idle;
}

// A moonlamp also lights any moonglass within `reach` columns of it, below it (see Game.updateGlass);
// `dur` is how long it burns once lit (a lamp holding up a glass bridge burns longer).
class Moonlamp extends Enemy {
  constructor(col, row, dur = LAMP_LIT, reach = 4, auto = false) {
    super(col * TILE + 3, row * TILE + 1, 10, 14);
    this.col = col; this.row = row; this.dur = dur; this.reach = reach; this.glassy = null;
    this.auto = auto;   // on a timer: lit for `dur` frames, dark for `dur`, over and over (can't be lit or put out by hand)
    this.lit = 0; this.cool = 0; this.coneBot = null; this.chainTop = null;
    this.passive = true;   // scenery you can touch: never hurts, never freezes
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return this.lit || this.cool || this.auto ? null : this; }   // only a dark lamp catches fire / volt / gusts
  touches(p) { return !this.lit && !this.cool && !this.auto && overlap(this, p); }
  onTouch(g) { this.ignite(g); }
  fireHit(g) { this.ignite(g); }
  ignite(g) {
    if (this.lit || this.cool) return;
    this.lit = this.dur;
    g.burst(this.cx, this.y + 8, ['#ffffff', '#fff3d8', '#ffe08a'], 10);
    Sound.play('lampOn');
  }
  burnOut() { if(this.umbraGuard>0)return; if (!this.auto) { this.lit = 0; this.cool = LAMP_SPENT; } }   // a timed lamp keeps its rhythm
  lights(c, r) { return r > this.row && Math.abs(c - this.col) <= this.reach; }
  isGlassy(g) {
    if (this.glassy == null) { const lv = g.level; this.glassy = lv.glass.some(i => this.lights(i % lv.w, Math.floor(i / lv.w))); }
    return this.glassy;
  }
  inCone(x, y) {
    const top = this.y + this.h;
    return y >= top - 4 && y <= this.coneBot && Math.abs(x - this.cx) <= 8 + (y - top) * 0.25;
  }
  covers(s) { return this.inCone(s.x + s.w / 2, s.y + s.h / 2); }
  update(g) {
    this.t++;
    if(this.umbraGuard>0)this.umbraGuard--;
    if (this.glassy == null) this.isGlassy(g);
    if (this.coneBot == null) {
      const lv = g.level, c = Math.floor(this.cx / TILE), r0 = Math.floor(this.y / TILE);
      this.coneBot = VIEW_H; this.chainTop = -LIFT_MAX;   // (open sky: the chain runs on up past the top, for when the view lifts)
      for (let r = r0 + 1; r < ROWS; r++) if (lv.solid(c, r) || lv.get(c, r) === T.SEMI) { this.coneBot = r * TILE; break; }   // (a ledge stops the light too)
      for (let r = r0 - 1; r >= 0; r--) if (lv.solid(c, r)) { this.chainTop = (r + 1) * TILE; break; }
    }
    if (this.auto) {
      if (this.t % (this.dur * 2) === 1) this.ignite(g);
      if (this.lit > 0) this.lit--;
      return;
    }
    if (this.lit > 0) { if (--this.lit === 0) this.cool = LAMP_COOL; }
    else if (this.cool > 0) this.cool--;
  }
  // punch this lamp's light out of the darkness overlay (see Game.drawDarkness)
  glow(hole, row, cone) {
    const cy = this.y + this.h / 2;
    if (!this.lit) { hole(this.cx, cy, this.cool ? 10 : this.glassy ? 26 : 18, 0.6); return; }
    hole(this.cx, cy, this.glassy ? 52 : 40);
    const top = this.y + this.h;
    if (cone) cone(this.cx, top, this.coneBot, 8, 0.25, 0.8);
    else for (let y = top; y < this.coneBot; y++) row(this.cx, y, 8 + (y - top) * 0.25, 0.8);
    hole(this.cx, this.coneBot - 4, 30, 0.8);
  }
  // (painted fine: moonlampArt and drawSpireChain, eclipse-fine.js): the beam a smooth cone of moonlight, brightest
  // near the lamp, pooling on whatever it lands on
  draw(ctx, g) {
    const x = Math.round(this.x), y = Math.round(this.y), cx = x + 5, lit = this.lit > 0;
    const fade = lit ? Math.min(1, this.lit / 30) : 0;
    if (lit && this.coneBot != null) {
      const top = y + this.h, bot = this.coneBot, w1 = 8 + (bot - top) * 0.25, sh = 1 + Math.sin(this.t * 0.2) * 0.15;
      const beam = (hw, slope, a0, a1) => {
        const gr = ctx.createLinearGradient(0, top, 0, bot);
        gr.addColorStop(0, `rgba(255,243,216,${a0 * fade * sh})`); gr.addColorStop(1, `rgba(255,243,216,${a1 * fade * sh})`);
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(cx - hw, top); ctx.lineTo(cx + hw, top); ctx.lineTo(cx + hw + (bot - top) * slope, bot); ctx.lineTo(cx - hw - (bot - top) * slope, bot); ctx.fill();
      };
      beam(8, 0.25, 0.16, 0.08); beam(4, 0.125, 0.1, 0.05);
      ctx.save(); ctx.translate(cx, bot - 0.5); ctx.scale(1, 0.22); fGlow(ctx, 0, 0, w1 + 4, '#fff3d8', 0.55 * fade); ctx.restore();   // the pool where it lands
      fGlow(ctx, cx, y + 8, 16, '#fff3d8', 0.4 * fade);
    } else if (!this.cool) fGlow(ctx, cx, y + 8, 11, '#8f86d0', 0.22 + Math.sin(this.t * 0.06) * 0.1);
    drawSpireChain(ctx, cx, this.chainTop || 0, y + 1);   // up to the roof (or off the top of the screen)
    // a timed lamp sputters near the end of its dark spell (the last quarter, at most a second), as a warning it's about to come on
    const warn = this.auto && !lit && this.t % (this.dur * 2) > this.dur * 2 - Math.min(60, this.dur >> 2) && this.t % 8 < 3;
    ctx.drawImage(moonlampArt(lit ? (this.t % 16 < 8 ? 'lit' : 'lit2') : warn ? 'warn' : this.cool ? 'cool' : 'dark'), x - 2, y - 2);
  }
}

// A burnt shadow's spirit glints: a puff of tiny twinkling lights that drift up and wink out, drawn
// over the dark (with a brief glow of their own) so they read wherever the shadow was caught.
class SpiritGlints extends Enemy {
  constructor(s, cols) {
    super(s.x, s.y, s.w, s.h);
    this.passive = true; this.drawOver = true; this.timeless = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.bits = [];
    for (let i = 0; i < 34; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(0.3, 1.6);
      this.bits.push({ x: s.x + rand(0, s.w), y: s.y + rand(2, s.h), vx: Math.cos(a) * sp * 0.8, vy: Math.sin(a) * sp * 0.6 - 0.9, life: 40 + rand(0, 40), ph: rand(0, 6), c: cols[i % cols.length], big: i % 5 === 0 });
    }
  }
  hitbox() { return null; }
  touches() { return false; }
  update() {
    this.t++;
    for (const b of this.bits) { b.x += b.vx; b.y += b.vy; b.vx *= 0.95; b.vy = b.vy * 0.95 - 0.02; }
    if (this.t > 90) this.remove = true;
  }
  glow(hole) { if (this.t < 30) hole(this.x + this.w / 2, this.y + this.h / 2 - this.t * 0.4, 30 - this.t * 0.6, 0.8); }
  draw(ctx) {
    for (const b of this.bits) {
      const left = b.life - this.t;
      if (left <= 0) continue;
      if (left < 15 && (this.t + Math.floor(b.ph * 3)) % 3 === 0) continue;   // winking out
      const tw = Math.sin(this.t * 0.4 + b.ph) > 0.3;
      umbraSpark(ctx,b.x,b.y,b.big?2:tw?1.2:0.6,b.c,Math.min(1,left/20));
      if(b.big&&tw)fGlow(ctx,b.x,b.y,4,b.c,Math.min(0.3,left/70));
    }
    ctx.globalAlpha = 1;
  }
}
class Echo extends Enemy {
  constructor(col, until, delay = 140) {
    super(col * TILE, 11 * TILE, 12, 16);
    this.wakeX = col * TILE; this.until = until == null ? null : until * TILE;
    this.delay = this.want = delay; this.state = 'sleep'; this.timer = 0; this.snap = null;
    this.drawOver = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  get behindPlayer() { return true; }   // Chickaroo's own shadow stands behind him (see GameRender.drawWorld)
  hitbox() { return null; }
  touches() { return false; }   // (Chickaroo's own shadow is harmless: see UmbraShade for the ones that aren't)
  setState(s) { this.state = s; this.timer = 0; }
  live() { return this.state === 'rise' || this.state === 'hunt'; }
  riseT() { return 50; }
  wake(g, from) {
    if (!g.trail) { g.trail = []; g.trailBase = 0; g.recordTrail(); }
    this.from = from == null ? g.trailFrame() : from;
    this.setState('rise');
    this.follow(g);
  }
  // the trail frame being replayed: `delay` frames behind the newest one, never before the wake
  pathFrame(g) { return Math.max(this.from, g.trailFrame() - Math.round(this.delay)); }
  follow(g) {
    const s = this.snap = g.trailAt(this.pathFrame(g));
    this.x = s.x; this.y = s.y; this.w = s.w; this.h = s.h;
  }
  update(g) {
    this.t++;
    const p = g.player;
    if (this.state === 'sleep') {
      if (p.state === 'play' && p.x > this.wakeX) {
        if (g.entities.some(e => e instanceof Echo && e !== this && e.live())) { this.remove = true; return; }   // one loose shadow at a time
        this.wake(g);
        Sound.play('shadeHiss');
      }
      return;
    }
    if (this.state === 'die') { this.timer++; return; }
    this.follow(g);
    this.timer++;
    if (this.state === 'rise' && this.timer >= this.riseT()) this.setState('hunt');
    if (this.state === 'hunt') {
      this.checkLamps(g);
      if (!this.remove && this.until != null && this.x > this.until) {
        this.glints(g); this.remove = true;   // past the end of its stretch: it comes apart into glints
        if (Math.abs(this.cx - p.x) < VIEW_W) Sound.play('shadeHiss');
      }
    }
    if (this.delay !== this.want) this.delay += clamp(this.want - this.delay, -0.5, 0.5);   // (eases back to its wanted delay)
  }
  checkLamps(g) {
    for (const l of g.entities) if (l instanceof Moonlamp && l.lit > 0 && l.covers(this.snap)) { this.burn(g, l); return; }
  }
  // caught in the light: the shadow bursts into a cloud of spirit glints that drift up and wink out
  burn(g, lamp) {
    lamp.burnOut();
    this.glints(g);
    g.shake = Math.max(g.shake, 4);
    Sound.play('shadeBurn');
    this.remove = true;
  }
  sparks() { return ['#ffffff', '#e2d4ff', '#b48cff', '#fff3d8']; }
  glints(g) { g.entities.push(new SpiritGlints(this.snap || this, this.sparks())); }
  ink() { return 'shade'; }
  drawAura() {}
  // shadows materialise the way they burst, in reverse: a swirl of spirit glints drawing in from all
  // around and settling into its shape as it fades in
  drawGather(ctx, g, s, img, cx, bottom, k) {
    if (!this.seeds) this.seeds = Array.from({ length: 34 }, (_, i) => ({ tx: rand(-s.w / 2, s.w / 2), ty: rand(2, s.h), a: rand(0, Math.PI * 2), d: rand(18, 46), spin: rand(-1.5, 1.5), big: i % 5 === 0 }));
    const cols = this.sparks(), e = 1 - (1 - k) * (1 - k);   // ease in: fast at first, settling at the end
    this.seeds.forEach((b, i) => {
      if (k > 0.85 + (i % 6) * 0.025) return;                    // the last of them sink into the body
      const a = b.a + b.spin * (1 - e), r = b.d * (1 - e);
      const x = cx + b.tx + Math.cos(a) * r, y = bottom - b.ty + Math.sin(a) * r * 0.7;
      umbraSpark(ctx,x,y,b.big?1.8:0.75,cols[i%4],Math.min(1,k*4));
    });
    const f = Math.max(0, (k - 0.35) / 0.65);                    // the body fades in once the glints are close
    if (f > 0) { ctx.globalAlpha = f * f; this.drawAura(ctx, s, cx, bottom, img); drawSnap(ctx, g, s, this.ink()); }
    ctx.globalAlpha = 1;
  }
  draw(ctx, g) {
    if (this.state === 'sleep' || !this.snap) return;
    const s = this.snap, img = shadePose(s), cx = s.x + s.w / 2, bottom = s.y + s.h, st = this.state;
    if (st === 'rise') { this.drawGather(ctx, g, s, img, cx, bottom, Math.min(1, this.timer / this.riseT())); return; }
    if (s.onGround) { ctx.globalAlpha = 0.6; fEll(ctx,cx,bottom-0.5,8,1.3,'#120a26'); ctx.globalAlpha = 1; }
    const jx = st === 'die' ? (this.t % 3) - 1 : 0;
    ctx.save();
    if (st === 'die') ctx.globalAlpha = (this.t >> 1) % 2 ? 0.9 : 0.5;
    this.drawAura(ctx, s, cx + jx, bottom, img);
    drawSnap(ctx, g, s, this.ink(), jx);
    ctx.restore();
  }
}

// ── EVIL UMBRAROO: Chickaroo's own shadow grown huge, towering over the open crown of the spire ─────
// The fight is a chase. Its shadows (UmbraShade) replay Chickaroo's exact path a fixed, short moment
// behind him: keep moving and they never catch you; stop (or turn back into them without jumping) and
// they walk right into you. The only thing that hurts one is lamplight: light a moonlamp and lead
// your shadows through its cone. A lamp burns one shadow and is spent, so with a whole line of them
// on your heels you need a route through several. Four phases of three shadows each (12 HP); from the
// second phase UMBRAROO sets the floor alight now and then, so you have to take to the ledges too. A
// ledge stops a lamp's light, so each lamp lights one tier: lead them up the tower to the high ones.
// At unpredictable intervals the shadows fade away and the giant simply looms, before the chase returns.
// flames: frames between floor fires (0: none); the first one comes as the phase opens
const UMBRA_PHASES = [
  { delays: [40], respawn: 80, lamp: 180, flames: 0 },
  { delays: [34, 68], respawn: 100, lamp: 160, flames: 420 },
  { delays: [28, 56, 84], respawn: 110, lamp: 140, flames: 330 },
  { delays: [], respawn: 0, lamp: 300, flames: 0, refuge: true },
];
const UMBRA_KILLS = 3;                        // shadows to burn in each phase
const UMBRA_SCALE = 7;                        // giant dimensions relative to the recorded chick pose
const UMBRA_WARN = 75, UMBRA_BURN = 90;       // floor flames: frames of warning, then of fire
const UMBRA_RISE = 40;                        // a new shadow gathers this long before it can hurt
const UMBRA_REFUGE_WARN = 180, UMBRA_REFUGE_PULSE = 24, UMBRA_REFUGE_REST = 120;
const UMBRA_FADE = 30;                        // shadows quietly fade out for an ominous lull
const UMBRA_DEATH = 240;

// The defeated giant erupts across his whole silhouette, then floats away as magical dust.
// Draw over the eclipse darkness; no collision, per-pixel rebaking or unbounded particles.
class UmbraDisintegration extends Enemy {
  constructor(x,bottom,w,h) {
    super(x-w/2,bottom-h,w,h);
    this.originX=x;this.bottom=bottom;this.drawOver=true;this.passive=this.noFreeze=true;
    this.stompable=this.fireKill=this.shellKill=this.bumpKill=false;
    const rng=mulberry32(240453),r=(a,b)=>a+(b-a)*rng();
    this.nodes=[[-.2,-.83],[.2,-.75],[-.25,-.55],[.24,-.4],[-.14,-.22],[.1,-.6],[.19,-.2],[0,-.4]]
      .map(([a,b],i)=>({x:x+a*w,y:bottom+b*h,born:10+i*12,nova:false}));
    this.nodes.push({x,y:bottom-h*.48,born:112,nova:true});
    this.bits=[];
    for(const [index,n]of this.nodes.entries())for(let i=0;i<(n.nova?116:24);i++) {
      const a=r(0,Math.PI*2),speed=n.nova?r(45,115):r(14,47);
      this.bits.push({x:n.x+r(-6,6),y:n.y+r(-9,9),dx:Math.cos(a)*speed,dy:Math.sin(a)*speed*.8,
        born:n.born+r(0,7),life:r(n.nova?76:65,n.nova?124:110),phase:r(0,6),size:r(.7,1.65),big:i%8===0,
        color:['#f6edff','#d7b3f0','#aa7dca','#77508e'][(i+index)%4]});
    }
  }
  hitbox(){return null;}
  touches(){return false;}
  update(g) {
    this.t++;
    if(this.t>=10&&this.t<=94&&(this.t-10)%12===0)Sound.play('umbraFracture');
    if(this.t===112){Sound.play('umbraShatter');if(!g.reduceMotion)g.shake=Math.max(g.shake,5);}
    if(this.t===180)Sound.play('umbraDust');
    if(this.t>=UMBRA_DEATH)this.remove=true;
  }
  glow(hole){if(this.t<190)hole(this.originX,this.bottom-this.h*.5,110,(1-this.t/220)*.65);}
  draw(ctx) {
    const t=this.t,cloud=umbraDustCloudArt();ctx.save();
    for(const n of this.nodes) {
      const age=t-n.born,life=n.nova?70:45;if(age<0||age>=life)continue;
      const u=age/life,r=(n.nova?28:8)+Math.sqrt(u)*(n.nova?100:26);
      ctx.globalAlpha=Math.sin(Math.PI*u)*(1-u*.5)*(n.nova?1:.85);
      ctx.drawImage(cloud,n.x-r,n.y-r,r*2,r*2);
      ctx.globalAlpha=(1-u)*(n.nova?.65:.45);ctx.strokeStyle='#e7c6ff';ctx.lineWidth=n.nova?1.2:.6;
      ctx.beginPath();ctx.ellipse(n.x,n.y,r*.7,r*.57,0,0,Math.PI*2);ctx.stroke();
      if(age<12)umbraSpark(ctx,n.x,n.y,(n.nova?11:4.5)*(1-age/12),'#fff3ff',1-age/12);
    }
    const bins=Array.from({length:8},()=>[]);
    for(const b of this.bits) {
      const age=t-b.born;if(age<0||age>=b.life)continue;
      const u=age/b.life,travel=1-Math.exp(-age*.035);
      const x=b.x+b.dx*travel+Math.sin(age*.045+b.phase)*u*7;
      const y=b.y+b.dy*travel-age*.19+Math.cos(age*.04+b.phase)*u*4;
      const alpha=Math.min(1,age/5)*Math.pow(1-u,1.3)*(.78+.22*Math.sin(age*.09+b.phase));
      bins[Math.min(7,Math.floor(alpha*8))].push({b,x,y,u});
    }
    for(let i=1;i<bins.length;i++) {
      ctx.globalAlpha=i/8;const B=fineBatch();
      for(const {b,x,y,u}of bins[i]) {
        if(b.big)umbraSpark(ctx,x,y,b.size*(2.4-u),b.color);
        else B(x,y,b.size*(1-u*.45),b.size*(1-u*.45),b.color);
      }
      B.flush(ctx);
    }
    ctx.restore();
  }
}

// One of UMBRAROO's shadows: a plain Echo, but on a short fixed delay, harmful, and red-eyed.
class UmbraShade extends Echo {
  constructor(boss, delay) {
    super(0, null, delay);
    this.boss = boss; this.bossHazard = true;   // (stomps, spins, rolls and fire don't touch it)
  }
  get behindPlayer() { return false; }
  riseT() { return UMBRA_RISE; }
  update(g) {
    if (this.state === 'fade') { this.t++; if (++this.timer >= UMBRA_FADE) this.remove = true; return; }
    super.update(g);
  }
  touches(p) { return this.state === 'hunt' && overlap({ x: this.x + 2, y: this.y + 3, w: this.w - 4, h: this.h - 5 }, p); }
  onTouch(g) { g.hurtPlayer(); }
  burn(g, lamp) {
    super.burn(g, lamp);
    this.bossHazard = false;
    this.boss.hit(g, this);
  }
  sparks() { return ['#25152f', '#61416f', '#a27bb0', '#d8b8df']; }
  ink() { return 'evil'; }
  // Soft crimson haze and individual curved wisps; the horns belong to the new body art.
  drawAura(ctx, s, cx, bottom, img) {
    const mid = bottom - img.height * 0.5;
    fGlow(ctx, cx, mid, img.width * 0.85, '#9f2447', 0.22 + Math.sin(this.t * 0.2) * 0.05);
    for (let i = 0; i < 4; i++) {
      const u = ((this.t + i * 13) % 48) / 48, x = cx + Math.sin(i * 2.1 + u * 4) * (5 + u * 5);
      umbraSpark(ctx, x, mid - u * img.height * 0.7, 0.5 + (1-u)*0.5, '#e96780', (1-u)*0.65);
    }
  }
  draw(ctx, g) {
    if (this.state === 'fade') {
      if (this.snap) {
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - this.timer / UMBRA_FADE);
        drawSnap(ctx, g, this.snap, this.ink()); ctx.restore();
      }
      return;
    }
    // Shadow fragments and dark glints drift from the giant into the forming echo.
    if (this.state === 'rise' && this.snap) {
      const [hx,hy]=this.boss.heart(g),tx=this.snap.x+this.snap.w/2,ty=this.snap.y+this.snap.h/2;
      umbraSoulGather(ctx,hx,hy,tx,ty,this.timer/UMBRA_RISE,this.t);
    }
    super.draw(ctx, g);
  }
}

// One shared attack clock ignites the floor and a few randomly chosen ledges together. Every
// burning surface gets the same visible warning; unselected ledges remain escape routes.
class UmbraFlames extends Enemy {
  constructor(boss, b) {
    super((b.wall + 1) * TILE, 12 * TILE - 10, (b.right - b.wall - 1) * TILE, 10);
    this.boss = boss; this.drawOver = true; this.bossHazard = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  pickPlatforms(g, count) {
    if (!this.ledges) {
      this.ledges = [];
      const b = g.level.def.boss;
      for (let r = 1; r < 12; r++) for (let c = b.wall + 1; c < b.right; c++) {
        if (g.level.get(c, r) !== T.SEMI) continue;
        const start = c;
        while (c + 1 < b.right && g.level.get(c + 1, r) === T.SEMI) c++;
        this.ledges.push({ x: start * TILE, y: r * TILE, w: (c - start + 1) * TILE });
      }
    }
    // Reserve the current foothold AND the closest neighbouring ledge, at any height.
    // Also leave a low way up from the floor. Choose once when the warning starts so
    // a safe hop never changes into a burning destination during its warning.
    const p = g.player, px = p.x + p.w / 2, foot = p.y + p.h;
    const low = Math.max(...this.ledges.map(s => s.y));
    const gap = s => Math.max(s.x - px, px - s.x - s.w, 0);
    const distance = s => Math.hypot(gap(s), s.y - foot);
    const current = this.ledges.find(s => p.x + p.w > s.x && p.x < s.x + s.w && Math.abs(s.y - foot) <= 8);
    const neighbour = this.ledges.filter(s => s !== current && foot - s.y <= TILE * 4)
      .sort((a, b) => distance(a) - distance(b))[0];
    const lowEscape = this.ledges.filter(s => s.y === low).sort((a, b) => gap(a) - gap(b))[0];
    const safe = new Set([current, neighbour, lowEscape]);
    const pool = this.ledges.filter(s => !safe.has(s));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const selected = [];
    for (const s of pool) {
      const tier = this.ledges.filter(p => p.y === s.y).length;
      if (tier > 1 && selected.filter(p => p.y === s.y).length >= tier - 1) continue;
      selected.push(s); if (selected.length >= count) break;
    }
    return selected;
  }
  surfaces() { return [{ x: this.x, y: 12 * TILE, w: this.w }, ...(this.boss.flare?.platforms || [])]; }
  burning() { const f = this.boss.flare; return !!f && f.t >= UMBRA_WARN; }
  touches(p) {
    return this.burning() && this.surfaces().some(s => p.y < s.y && overlap({ x: s.x, y: s.y - 8, w: s.w, h: 10 }, p));
  }
  onTouch(g) { g.hurtPlayer(); }
  update() { this.t++; }
  draw(ctx, g) {
    if(this.boss.refugeT!=null&&this.boss.state==='fight'){this.boss.drawRefuge(ctx,g);return;}
    const f = this.boss.flare;
    if (!f) return;
    ctx.save();
    const warning = f.t < UMBRA_WARN, k = warning ? f.t / UMBRA_WARN : 1;
    const left = UMBRA_WARN + UMBRA_BURN - f.t;
    const grow = warning ? 0 : Math.max(0, Math.min(1, (f.t - UMBRA_WARN) / 8, left / 12));
    // Thin fissures crawl through the stone before ignition; their glow intensifies during the warning.
    ctx.globalAlpha = warning ? 0.3 + k*0.6 : 0.9;
    for (const surface of this.surfaces()) {
      const L = Math.max(surface.x, Math.floor(g.camX) - 8), R = Math.min(surface.x + surface.w, g.camX + VIEW_W + 8), floor = surface.y;
      if (R <= L) continue;
      for(let x=Math.floor(L/32)*32;x<R;x+=32) {
        ctx.save();ctx.beginPath();ctx.rect(L,floor-40,R-L,44);ctx.clip();
        fGlow(ctx,x+16,floor,22,'#d92d51',(warning?0.12+k*0.23:0.35)* (warning?1:grow));
        if(!warning)ctx.drawImage(umbraFlameArt(Math.floor(f.t/3)%12,Math.abs(x/32)%2),x,floor-34*grow,32,34*grow);
        const yy=floor-0.7;
        for(const [dx,dy,ex,ey] of [[0,0,9,-1],[9,-1,17,0],[17,0,25,-1.3],[25,-1.3,32,0],[9,-1,12,-4],[25,-1.3,23,-3]])
          fLine(ctx,x+dx,yy+dy,x+ex,yy+ey,'#f78091',1);
        for(let i=0;i<3;i++) {
          const u=((f.t*0.75+i*13+x*0.17)%37)/37;
          if(warning&&i/3>k)continue;
          umbraSpark(ctx,x+6+i*10+Math.sin(u*4+i),floor-2-u*(warning?18*k:32),0.5+(1-u)*0.55,'#ffb7a4',(1-u)*(warning?k:grow));
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }
}

// The giant is a new drawing at its full in-world dimensions, independent of the player sprite.
function giantSprite(img, pose = 'idle', damage = 0) {
  return umbrarooArt(img.width * UMBRA_SCALE, img.height * UMBRA_SCALE, pose, 0, true, damage);
}

class Umbraroo extends Enemy {
  constructor(col) {
    super(col * TILE, 0, 16 * UMBRA_SCALE, 26 * UMBRA_SCALE);
    this.noFreeze = true;   // Boss encounters cannot be replaced by a carried ice block.
    this.maxHp = this.hp = UMBRA_PHASES.length * UMBRA_KILLS; this.shown = 0; this.flash = 0;
    this.hideHealthBar = true;
    this.title = 'EVIL UMBRAROO'; this.titleCol = '#ff6a7a'; this.barCol = '#ff2a3a'; this.barBg = '#2a0610'; this.barHit = '#fff3d8';
    this.state = 'sleep'; this.timer = 0; this.phase = 0; this.kills = 0;
    this.refugeT=null;
    this.loomIn = Math.round(rand(180, 360)); this.loomCount = 0;
    this.shades = []; this.queue = []; this.flare = null; this.flareT = 0; this.recoil = 0; this.sink = 1; this.cracks = [];
    this.behindTiles = true;   // a giant in the background (its glow shows it through the dark)
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  // where the giant stands: the middle of the hall, sliding a little with the camera so it reads as far off
  bodyX(g) { const b = g.level.def.boss, mid = (b.wall + b.right + 1) / 2 * TILE; return mid + (g.camX + VIEW_W / 2 - mid) * 0.35; }
  bodyBottom() { return 12 * TILE + 18 + Math.round(this.sink * 220); }
  pose(g) {
    const set = SPR.big, f = this.flare;
    if (this.state === 'die' || this.recoil > 0) return set.skid || set.idle;
    if (this.state === 'roar' || (f && f.t >= UMBRA_WARN)) return set.jump || set.idle;
    if (f) return set.crouch || set.idle;
    return set.idle;
  }
  heart(g) { const img = this.pose(g); return [this.bodyX(g), this.bodyBottom() - img.height * UMBRA_SCALE * 0.30]; }
  wake(g) {
    const b = g.level.def.boss;
    this.state = 'seal'; this.timer = 0;
    g.arenaCam = b.wall * TILE; g.arenaMax = (b.right + 1) * TILE - VIEW_W;
    // Seal immediately, including row zero and the space above the tile grid. Otherwise the high
    // ledges let a jump/flap escape over the entrance while the arena camera stays locked behind.
    for (let r = 0; r <= 11; r++) g.level.set(b.wall, r, T.SOLID);
    g.level.skyGates.set(b.wall, 11);
    g.level.skyGates.set(b.right, 11);
    // the hall is for the duel alone: anything that wandered in after Chickaroo puffs away (and nothing
    // gets caught in the wall as it seals)
    for (const e of g.entities) {
      if (e === this || e.passive || e.dead || !e.hitbox || !e.hitbox()) continue;
      if (e.x + e.w > b.wall * TILE - 4 && e.x < (b.right + 1) * TILE) { e.remove = true; g.burst(e.cx, e.y + e.h / 2, ['#120a26', '#6a5aa8', '#b48cff'], 8); }
    }
    for (const e of g.entities) if (e instanceof Echo) { e.glints(g); e.remove = true; }   // (his own loose shadow has gone to join it)
    if (!g.trail) { g.trail = []; g.trailBase = 0; }
    g.recordTrail();
    g.entities.push(this.floor = new UmbraFlames(this, b));
    // the duel's own track takes over as the hall seals (the chiptune boss song is the fallback)
    if (g.level.def.bossMusic) g.startBossMusic();
    else if (!MUSIC_FILES[g.levelMusic]) { g.levelMusic = 'umbra'; Music.play('umbra'); }
    Sound.play('rumble');
  }
  lamps(g) { const b = g.level.def.boss; return g.entities.filter(e => e instanceof Moonlamp && e.col > b.wall && e.col < b.right); }
  spawnShade(g, delay) {
    const e = new UmbraShade(this, delay);
    e.wake(g, 0);   // (from the start of the trail: it forms right where he was `delay` frames ago)
    g.entities.push(e); this.shades.push(e);
    Sound.play('shadeHiss');
  }
  startPhase(g) {
    const ph = UMBRA_PHASES[this.phase];
    this.state = 'fight'; this.timer = 0; this.kills = 0; this.flareT = ph.flames - 1;
    this.queue=[];this.refugeT=ph.refuge?0:null;
    for(const l of this.lamps(g)){l.umbraGuard=0;l.dur=ph.lamp;}
    ph.delays.forEach((d, i) => this.queue.push({ delay: d, t: 1 + i * 20 }));
    if(ph.refuge){
      for(const l of this.lamps(g)){l.cool=0;l.lit=UMBRA_REFUGE_WARN+UMBRA_REFUGE_PULSE+60;l.umbraGuard=l.lit;}
      g.tipLine('ECLIPSE','SHELTER IN THE LIGHT','#d8c8ff',null,true,true);
    }
  }
  beginLoom() {
    this.state = 'loom'; this.timer = 0; this.loomCount++;
    this.loomFor = Math.round(rand(240, 420));
    // Save every unburnt shadow for later; vanishing does not damage the boss or reset the phase.
    for (const e of this.shades) {
      if (e.remove) continue;
      this.queue.push({ delay: e.delay, t: 0 });
      e.bossHazard = false; e.setState('fade');
    }
    this.shades = []; this.flare = null; this.flareT = 0; this.flash = this.recoil = 0;
  }
  // a shadow burnt away: the light runs back up the shade to crack the giant
  hit(g, shade) {
    if (this.state !== 'fight') return;
    this.hp = Math.max(0, this.hp - 1); this.flash = 30; this.recoil = 36;
    this.shades = this.shades.filter(e => e !== shade);
    g.addScore(1000, shade.cx, shade.y - 6);
    const [hx, hy] = this.heart(g);
    this.cracks = Array.from({ length: 7 }, (_, i) => ({ a: i * 0.9 + rand(-0.3, 0.3), r: rand(24, 50) }));
    if (this.hp <= 0) { this.die(g); return; }
    Sound.play('roar'); g.shake = Math.max(g.shake, 5);
    if (++this.kills < UMBRA_KILLS) { if(!UMBRA_PHASES[this.phase].refuge)this.queue.push({ delay: shade.delay, t: UMBRA_PHASES[this.phase].respawn }); return; }
    // phase over: it howls, its shadows burst, the lamps go dark and come back ready, and more shadows come
    this.phase++; this.state = 'roar'; this.timer = 0; this.queue = []; this.flare = null;
    for (const e of this.shades) { e.glints(g); e.remove = true; }
    this.shades = [];
    for (const l of this.lamps(g)) { l.lit = 0; l.cool = 0; }
  }
  die(g) {
    if(this.state==='die'||this.remove)return;
    const img=this.pose(g);
    this.deathX=this.bodyX(g);this.deathBottom=this.bodyBottom();
    this.deathArt=giantSprite(img,'idle',this.maxHp);
    this.defeatBurst=false;this.deathPaid=false;
    this.state = 'die'; this.timer = 0; this.queue = []; this.flare = null;this.refugeT=null;
    for(const l of this.lamps(g))l.umbraGuard=0;
    for (const e of this.shades) { e.glints(g);e.remove=true;e.bossHazard=false; }
    this.floor.bossHazard = false; this.floor.remove = true;
    g.clearBossHazards();
    g.entities.push(new UmbraDisintegration(this.deathX,this.deathBottom,this.deathArt.width,this.deathArt.height));
    Music.stop();Sound.play('umbraUnravel');g.shake=g.reduceMotion?0:5;
  }
  update(g) {
    this.t++;
    if (this.flash > 0) this.flash--;
    if (this.recoil > 0) this.recoil--;
    const p = g.player, b = g.level.def.boss;
    if (this.state === 'sleep') {
      if (p.state === 'play' && p.x > b.trigger * TILE) this.wake(g);
      return;
    }
    this.timer++;
    this.shown += (Math.min(this.hp / this.maxHp, this.state === 'seal' ? this.timer / 80 : 1) - this.shown) * 0.1;
    const img = this.pose(g);
    this.w = img.width * UMBRA_SCALE; this.h = img.height * UMBRA_SCALE;
    this.x = this.bodyX(g) - this.w / 2; this.y = this.bodyBottom() - this.h;
    if (this.state === 'seal') {
      // The entrance is already sealed; masonry thuds while the giant climbs out of the dark.
      this.sink = Math.max(0, 1 - this.timer / 80);
      const row = this.timer >> 1;
      if (!(this.timer & 1) && row <= 11 && row % 3 === 0) Sound.play('bump');
      if (this.timer === 80) {
        Sound.play('roar'); g.shake = 5; this.startPhase(g);
        // The quiet hall explains only its opening chase and the final eclipse shelter.
        g.tipLine('', 'RUN!', '#ffd166', null, true, true);
      }
      return;
    }
    if (this.state === 'roar') {
      if (this.timer % 20 === 1) g.shake = Math.max(g.shake, 3);
      if (this.timer === 1) Sound.play('roar');
      if (this.timer >= 100) this.startPhase(g);
      return;
    }
    if (this.state === 'loom') {
      if (this.timer >= this.loomFor) {
        this.state = 'fight'; this.timer = 0;
        this.loomIn = Math.round(rand(360, 600));
        this.queue.forEach((q, i) => { q.t = 45 + i * 24; });
      }
      return;
    }
    if (this.state === 'die') {
      this.x=this.deathX-this.w/2;this.y=this.deathBottom-this.h;
      if (this.timer >= UMBRA_DEATH && !this.deathPaid) {
        this.deathPaid=true;
        for (const e of this.shades) e.remove = true;
        g.bossDefeated(this);
        this.remove = true;
      }
      return;
    }
    // the fight
    const ph = UMBRA_PHASES[this.phase];
    if(ph.refuge){this.updateRefuge(g);return;}
    if (this.loomCount < 3 && --this.loomIn <= 0) { this.beginLoom(); return; }
    for (const q of this.queue) if (--q.t <= 0) this.spawnShade(g, q.delay);
    this.queue = this.queue.filter(q => q.t > 0);
    for (const l of this.lamps(g)) l.dur = ph.lamp;
    if (ph.flames) {
      if (!this.flare && ++this.flareT >= ph.flames) {
        this.flare = { t: 0, platforms: this.floor.pickPlatforms(g, this.phase >= 2 ? 3 : 2) };
        this.flareT = 0; Sound.play('rumble');
      }
      if (this.flare) {
        const f = this.flare;
        if (++f.t === UMBRA_WARN) { Sound.play('burn'); g.shake = Math.max(g.shake, 4); }
        if (f.t >= UMBRA_WARN + UMBRA_BURN) this.flare = null;
      }
    }
  }
  // The final eclipse replaces fire and pursuit swarms with a clearly announced light refuge.
  updateRefuge(g) {
    const cycle=UMBRA_REFUGE_WARN+UMBRA_REFUGE_PULSE+UMBRA_REFUGE_REST;
    const t=this.refugeT++,lamps=this.lamps(g);
    this.flare=null;
    if(t<UMBRA_REFUGE_WARN+UMBRA_REFUGE_PULSE)for(const l of lamps){
      l.cool=0;l.lit=Math.max(l.lit,60);l.umbraGuard=60;
    }
    if(t===0){this.refugeStruck=false;Sound.play('rumble');}
    if([90,120,150].includes(t))Sound.play('clockWarn');
    if(t===UMBRA_REFUGE_WARN){
      Sound.play('shadeBurn');g.shake=Math.max(g.shake,2);
      // One familiar echo forms after the pulse; the newly learned shelter also banishes it.
      if(!this.shades.some(s=>!s.remove))this.spawnShade(g,60);
    }
    if(t>=UMBRA_REFUGE_WARN&&t<UMBRA_REFUGE_WARN+UMBRA_REFUGE_PULSE&&!this.refugeStruck
      &&g.player.state==='play'&&!lamps.some(l=>l.lit>0&&l.covers(g.player))){this.refugeStruck=true;g.hurtPlayer();}
    if(this.refugeT>=cycle)this.refugeT=0;
  }
  drawRefuge(ctx,g) {
    const t=this.refugeT,warning=t<=UMBRA_REFUGE_WARN,active=t>UMBRA_REFUGE_WARN&&t<=UMBRA_REFUGE_WARN+UMBRA_REFUGE_PULSE;
    if(!warning&&!active)return;
    const lamps=this.lamps(g).filter(l=>l.lit>0),charge=Math.min(1,t/UMBRA_REFUGE_WARN);
    // Pools show the exact width and tier that protect the player's centre, matching Moonlamp.covers.
    for(const l of lamps){
      const y=l.coneBot;if(y==null)continue;
      const w=Math.max(1,8+(y-g.player.h/2-(l.y+l.h))*0.25);
      fGlow(ctx,l.cx,y-3,w+8,'#d7c5ed',0.2+charge*.15);
      fEll(ctx,l.cx,y-1,w,1.5,'#cabce3');
      for(const side of [-1,1])umbraSpark(ctx,l.cx+side*w,y-3,1.2+charge*.8,'#e9dcf4',.7);
    }
    ctx.save();ctx.beginPath();ctx.rect(g.camX,-80,VIEW_W,VIEW_H+80);
    for(const l of lamps){
      if(l.coneBot==null)continue;
      const top=l.y+l.h-4,bot=l.coneBot,w=8+(bot-(l.y+l.h))*.25;
      ctx.moveTo(l.cx-7,top);ctx.lineTo(l.cx+7,top);ctx.lineTo(l.cx+w,bot);ctx.lineTo(l.cx-w,bot);ctx.closePath();
    }
    ctx.clip('evenodd');
    ctx.globalAlpha=active?.25:.05+charge*.08;ctx.fillStyle='#08050f';ctx.fillRect(g.camX,-80,VIEW_W,VIEW_H+80);ctx.globalAlpha=1;
    for(let i=0;i<34;i++){
      const x=g.camX+((i*67.3+this.t*.15)%VIEW_W),y=8+((i*39.7+this.t*.4)%(VIEW_H-12));
      umbraDarkGlint(ctx,x,y,(active?2.4:.8+charge*.8)+(i%3)*.3,active?.75:.2+charge*.35);
    }
    ctx.restore();
    if(lamps.some(l=>l.covers(g.player))){
      const px=g.player.x+g.player.w/2,py=g.player.y-5;
      fGlow(ctx,px,py,6,'#d8c9f3',.35);fEll(ctx,px,py,2.5,2.5,'#e0d3f4');fEll(ctx,px+1.2,py-.7,2.2,2.2,'#191329');
    }
    // The overhead eclipse fills steadily; it never masks Chickaroo or the shelter pools.
    const x=g.camX+VIEW_W/2,y=24;
    fGlow(ctx,x,y,19,'#b38ac0',.2+charge*.15);fEll(ctx,x,y,9,9,'#baa5c7');
    fEll(ctx,x-17+charge*17,y,9.5,10,'#100b1c');
    for(let i=0;i<Math.floor(charge*12);i++){
      const a=i*Math.PI/6;umbraDarkGlint(ctx,x+Math.cos(a)*14,y+Math.sin(a)*14,1.1,.8);
    }
  }
  // the light it shows by: a dim red pool round the giant, so it looms out of the dark
  glow(hole) {
    if (this.state === 'sleep') return;
    const cx = this.x + this.w / 2, a = this.state === 'die' ? 0.7 : 0.45;
    hole(cx, this.y + this.h * 0.3, 60, a); hole(cx, this.y + this.h * 0.65, 70, a);
    if (this.state !== 'die') for (const [x, y] of this.eyeGlow || []) hole(x, y, 20, .95);
  }
  draw(ctx, g) {
    if (this.state === 'sleep') return;
    if(this.state==='die') {
      const u=clamp((this.timer-35)/108,0,1),alpha=.72*(1-u)*(1-u);
      if(alpha>0){ctx.save();ctx.globalAlpha=alpha;const expand=1+u*.12;
        drawSprite(ctx,this.deathArt,this.deathX,this.deathBottom,false,expand,1+u*.04);ctx.restore();}
      return;
    }
    const p = g.player, img = this.pose(g), cx = this.bodyX(g), bottom = this.bodyBottom(), sc = UMBRA_SCALE;
    const breathe = 1 + Math.sin(this.t * 0.05) * 0.015, jx = this.recoil > 0 ? ((this.t >> 1) % 2 ? 2 : -2) : this.state === 'roar' ? (this.t % 3) - 1 : 0;
    const flip = p.x + p.w / 2 < cx, hy = bottom - img.height * sc * 0.30;
    // a crimson haze behind it, brighter while it howls or sets the floor alight
    const hot = this.state === 'roar' || this.flare ? 0.2 : 0;
    fGlow(ctx,cx,hy,120,'#4a0a1c',0.12+hot+Math.sin(this.t*0.08)*0.03);
    fGlow(ctx,cx,hy,80,'#a3122e',0.1+hot);
    ctx.globalAlpha = this.state === 'die' ? ((this.t >> 1) % 2 ? 0.7 : 0.35) : 0.72;
    const mode = img === SPR.big.crouch ? 'crouch' : img === SPR.big.jump ? 'jump' : img === SPR.big.skid ? 'skid' : 'idle';
    const giant = giantSprite(img, mode, this.maxHp-this.hp);
    drawSprite(ctx, giant, cx + jx, bottom, flip, 1, breathe);
    // The painted eyes keep their sharp shape; a live halo swells around them during attacks.
    this.eyeGlow = [];
    for (const [ex, ey] of giant.eyes || []) {
      const x = cx + jx + (flip ? -1 : 1) * (ex - giant.width / 2), y = bottom - (giant.height - ey) * breathe;
      this.eyeGlow.push([x, y]);
      const glow = ctx.createRadialGradient(x, y, 1, x, y, 20 + hot * 30);
      glow.addColorStop(0, 'rgba(255,42,58,0.45)'); glow.addColorStop(1, 'rgba(255,42,58,0)');
      ctx.globalAlpha = 0.55 + hot + Math.sin(this.t * 0.12) * 0.1; ctx.fillStyle = glow; ctx.fillRect(x - 40, y - 40, 80, 80);
    }
    ctx.globalAlpha = 1;
    // Damage releases a spreading bloom of shadow shards and violet glints.
    if (this.flash > 0 || this.state === 'die') {
      const progress=this.state==='die'?(this.timer%30)/30:1-this.flash/30;
      umbraDamageMagic(ctx,cx+jx,hy,this.cracks,progress,this.t);
    }
  }
}

// ── The mirror gallery: a floor of polished obsidian, with Chickaroo's reflection in it ───────────
// ['reflection', x0, x1, [fadeFrom, fadeTo], loose, until]: the floor over columns x0-x1 is a mirror and
// Chickaroo's reflection copies him exactly, move for move. Between columns fadeFrom and fadeTo it
// slowly darkens into his violet shadow; once he stands on the floor past column `loose`, the shadow
// rises up out of the floor at his feet (draining out of the glass as it does), keeps copying him
// for a moment, then falls back to follow a couple of seconds behind: an Echo that fades past `until`.
const MIRROR_FLOOR = 12 * TILE, MIRROR_RISE = 50;   // (the same as an echo's rise)
// all of Chickaroo's state for one frame (plus the game clock, for the blink / spin timing), so a shadow can be drawn 1:1
function trailSnap(p, t) {
  return Object.assign({}, p, { gt: t });
}
class Reflection extends Enemy {
  constructor(x0, x1, fade, loose, until) {
    super(x0 * TILE, MIRROR_FLOOR, (x1 - x0 + 1) * TILE, 32);
    this.x1 = (x1 + 1) * TILE; this.fade = fade || [x0, x1]; this.loose = loose; this.until = until;
    this.passive = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.state = 'mirror'; this.timer = 0; this.me = null;
  }
  get cx() { return this.me ? this.me.x + this.me.w / 2 : this.x; }
  hitbox() { return null; }
  touches() { return false; }
  // how far it has turned into the shadow: 0 (a plain reflection) to 1 (all violet shade)
  shade(col) { const [a, b] = this.fade; return clamp((col - a) / Math.max(1, b - a), 0, 1); }
  update(g) {
    this.t++;
    const p = g.player, pc = (p.x + p.w / 2) / TILE;
    if (this.state === 'gone') return;
    if (this.t === 1 && pc > this.loose + 3) { this.state = 'gone'; return; }   // back from a checkpoint past it
    this.me = trailSnap(p, g.t);
    if (this.state === 'sink') { if (++this.timer >= MIRROR_RISE) this.state = 'gone'; return; }
    if (pc >= this.loose && p.state === 'play' && (p.onGround && !p.platform || pc > this.loose + 3)) {
      // it comes loose right under his feet: the shadow rises out of the floor as the reflection sinks away
      this.state = 'sink'; this.timer = 0;
      // it starts right at his feet, still matching him move for move, and only then lets itself fall
      // behind, a little more every frame, until it trails him by its usual couple of seconds
      const e = new Echo(0, this.until);
      e.wake(g); e.delay = 0;
      g.entities.push(e);
      Sound.play('shadeHiss');
    }
  }
  draw(ctx, g) {
    const x0 = Math.max(this.x, g.camX - 16), x1 = Math.min(this.x1, g.camX + VIEW_W + 16), F = MIRROR_FLOOR;
    if (x1 <= x0) return;
    // the polished floor: black glass, a bright lip, faint bands of sheen and gold inlay seams
    ctx.fillStyle = '#0b0718'; ctx.fillRect(x0, F, x1 - x0, 32);
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#2a2058'; ctx.fillRect(x0, F + 1, x1 - x0, 3);
    ctx.globalAlpha = 0.25; ctx.fillRect(x0, F + 4, x1 - x0, 4);
    ctx.globalAlpha = 0.45;   // (the inlay in fine pixels: hires.js)
    for (let x = Math.ceil(x0 / 32) * 32; x < x1; x += 32) { fRect(ctx, x + 0.33, F + 2, 0.67, 30, '#c9a85a'); fPoly(ctx, [[x + 0.67, F + 14.4], [x + 2.4, F + 16], [x + 0.67, F + 17.6], [x - 1.07, F + 16]], '#c9a85a'); }
    fRect(ctx, x0, F + 29.33, x1 - x0, 0.67, '#c9a85a');
    ctx.globalAlpha = 0.9; fRect(ctx, x0, F, x1 - x0, 0.67, '#e8e0ff');
    ctx.globalAlpha = 1;
    const s = this.me;
    if (s && this.state !== 'gone') {
      const gap = F - (s.y + s.h), cx = s.x + s.w / 2, k = this.state === 'sink' ? 1 : this.shade(cx / TILE);
      // as the shadow rises out of the floor, the reflection drains out of the glass from the floor line down
      const left = this.state === 'sink' ? 1 - this.timer / MIRROR_RISE : 1;
      ctx.save();
      ctx.beginPath(); ctx.rect(this.x, F + 1, this.x1 - this.x, Math.max(0, (gap + SNAP_Y) * left)); ctx.clip();
      // his exact picture this frame, upside down about the floor line
      if (k < 1) { ctx.globalAlpha = 0.6 * (1 - k); drawSnap(ctx, g, s, 'plain', 0, F); }
      if (k > 0) { ctx.globalAlpha = 0.9 * k; drawSnap(ctx, g, s, 'shade', 0, F); }
      ctx.globalAlpha = 0.1;
      for (let x = Math.floor(x0 / 24) * 24; x < x1; x += 24) fRoundRect(ctx, x + (this.t / 8) % 24, F + 4, 6, 0.67, 0.33, '#ffffff');
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
}

// ── Shadow locks: a plate only a shadow is heavy enough to hold down, and the gate it opens ───────
// ['plate', x, row = 11, key]: Chickaroo is too light to press it, but his shadow -- replaying his
// steps -- presses it exactly as long as he stood on it. A bar fills while he stands on it and drains
// while the shadow does. ['gate', x, top, bottom, key, linger = 45]: a portcullis in column x over rows
// top-bottom (put something solid above it), open while any plate of `key` is held and `linger`
// frames after.
const PLATE_H = 7, PLATE_UP = 4;   // a shadow plate's button: height above the floor, and how far it goes in
class ShadePlate extends Enemy {
  constructor(col, row, key) {
    super(col * TILE, (row + 1) * TILE - 4, TILE, 4);
    this.key = key; this.passive = true; this.drawOver = true;   // the button and its progress bar glow through the dark
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.pressed = false; this.rec = 0; this.recShow = 0; this.on = false; this.played = 0; this.told = false;
    this.sink = 0;   // how far the button has gone in (0 = up, PLATE_UP = all the way)
  }
  hitbox() { return null; }
  touches() { return false; }
  feet(s) { return { x: s.x + 2, y: s.y + s.h - 3, w: s.w - 4, h: 5 }; }
  update(g) {
    this.t++;
    const p = g.player, zone = { x: this.x - 1, y: this.y - 2, w: this.w + 2, h: 8 };
    const on = p.state === 'play' && p.onGround && overlap(this.feet(p), zone);
    if (on && !this.on) {
      this.rec = 0;
      if (!this.told) { this.told = true; Sound.play('creak'); }
    }
    if (on) { this.rec++; this.recShow = 60; if (this.rec % 30 === 1) Sound.play('rec'); }
    else if (this.recShow > 0) this.recShow--;
    this.on = on;
    const was = this.pressed;
    this.pressed = g.entities.some(e => e instanceof Echo && (e.state === 'hunt' || e.state === 'rise') && e.snap && e.snap.onGround && overlap(this.feet(e.snap), zone));
    if (this.pressed) this.played++;
    if (this.pressed && !was) {
      this.played = 0;
      Sound.play('bump');
      g.burst(this.x + 8, this.y, ['#6a5aa8', '#b48cff', '#e2d4ff'], 6);
    }
    // anyone standing on it pushes the button in (only the shadow's weight lights it up and works the gate)
    const down = on || this.pressed;
    this.sink += ((down ? PLATE_UP : 0) - this.sink) * (down ? 0.5 : 0.25);
  }
  glow(hole) { hole(this.x + 8, this.y + 1, this.pressed ? 24 : 16 + Math.sin(this.t * 0.08) * 2, this.pressed ? 0.85 : 0.6); }
  draw(ctx, g) {   // (in fine pixels: drawFloorButton, eclipse-fine.js)
    const x = Math.round(this.x), y = Math.round(this.y), floor = y + 4;
    // the button cap: stands PLATE_H px proud of the floor, and goes in PLATE_UP px when stood on
    const top = floor - PLATE_H + this.sink, lit = this.pressed, pulse = (Math.sin(this.t * 0.08) + 1) / 2;
    if (!lit && !this.on) fGlow(ctx, x + 8, top, 12, '#b48cff', 0.22 + pulse * 0.16);   // a soft beckoning halo
    if (lit) fGlow(ctx, x + 8, top, 14, '#b48cff', 0.5);
    drawFloorButton(ctx, x, floor, top, lit ? (this.t % 20 < 10 ? '#b48cff' : '#9a7ae8') : '#4a3e94',   // throbs while the shadow holds it
      lit ? '#ffffff' : pulse > 0.5 ? '#e2d4ff' : '#b48cff', lit ? '#e2d4ff' : '#6a5ac8', '#2a2058', lit ? '#ffffff' : '#7a6ad8');
    // The bar grows while Chickaroo stands here, then runs down while his shadow holds the button.
    const bar = n => { const w = Math.min(14, n / 12); fRoundRect(ctx, x + 1, y - 22, 14, 3, 1.2, INK); if (w > 0.3) fRoundRect(ctx, x + 5 / 3, y - 21.33, w * 38 / 42, 5 / 3, 0.8, this.pressed ? '#e2d4ff' : '#ff3b4f'); };
    if (this.recShow > 0 && !this.pressed) {
      ctx.globalAlpha = Math.min(1, this.recShow / 20);
      bar(this.rec);
      ctx.globalAlpha = 1;
    } else if (this.pressed) {
      bar(Math.max(0, this.rec - this.played));
    }
  }
}
class ShadeGate extends Enemy {
  constructor(col, top, bot, key, linger = 45) {
    super(col * TILE, top * TILE, TILE, (bot - top + 1) * TILE);
    this.col = col; this.top = top; this.bot = bot; this.key = key; this.linger = linger;
    this.passive = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.open = 0; this.hold = 0; this.shut = false; this.behindTiles = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  setTiles(g, t) { for (let r = this.top; r <= this.bot; r++) g.level.set(this.col, r, t); this.shut = t === T.BODY; }
  update(g) {
    this.t++;
    if (this.t === 1) this.setTiles(g, T.BODY);
    const pressed = g.entities.some(e => e instanceof ShadePlate && e.key === this.key && e.pressed);
    if (pressed) this.hold = this.linger; else if (this.hold > 0) this.hold--;
    const want = this.hold > 0 ? 1 : 0, was = this.open;
    this.open = want ? Math.min(1, this.open + 1 / 14) : Math.max(0, this.open - 1 / 18);
    if (want && was === 0) Sound.play('gate');
    if (!want && was === 1) Sound.play('gate');
    if (this.open > 0.6 && this.shut) this.setTiles(g, T.EMPTY);
    else if (this.open <= 0.6 && !this.shut) {
      const p = g.player;
      if (p.state === 'play' && overlap(p, this)) this.open = 0.61;   // never drops on anyone underneath
      else this.setTiles(g, T.BODY);
    }
  }
  glow(hole) { hole(this.x + 8, this.y + this.h / 2 - this.open * this.h, 14, 0.5); }
  draw(ctx) {   // iron bars, riveted crossbars, spikes along the bottom, the shadow-eye seal (painted fine: shadeGateArt)
    const x = Math.round(this.x), y0 = this.y, h = this.h, y = y0 - this.open * (h - 6);
    ctx.save(); ctx.beginPath(); ctx.rect(x - 2, y0, 20, h); ctx.clip();
    ctx.drawImage(shadeGateArt(h, this.open > 0), x - 2, fSnap(y));
    ctx.restore();
  }
}
// ['keeper', x0, x1]: while Chickaroo is between these columns his shadow is never gone for long:
// if no shadow is loose (it was banished, or he came back from a checkpoint) a fresh one rises
// out of his footsteps after a couple of seconds -- the shadow locks always need one.
class ShadeKeeper extends Enemy {
  constructor(x0, x1) {
    super(x0 * TILE, 0, (x1 - x0 + 1) * TILE, VIEW_H);
    this.x1 = x1; this.passive = true; this.timer = 0; this.drawn = false;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  draw() {}
  update(g) {
    const p = g.player, c = (p.x + p.w / 2) / TILE;
    if (p.state !== 'play' || c < this.x / TILE || c > this.x1 || g.entities.some(e => (e instanceof Echo && e.live()) || (e instanceof Reflection && e.state !== 'gone'))) { this.timer = 0; return; }
    if (++this.timer < 120 || !p.onGround || Math.abs(p.vx) < 0.8) return;   // (it rises behind him once he's on the move)
    this.timer = 0;
    const e = new Echo(0, this.x1);
    e.wake(g);
    g.entities.push(e);
    Sound.play('shadeHiss');
  }
}


