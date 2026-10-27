'use strict';
// ── 1-1 SUNLIT MEADOW: the giant sunflowers ─────────────────────────────────
// Sunflowers follow the brightest thing in the meadow, and down here that's Chickaroo. Come near a giant one and it bows
// to him, offering its head like a hand; hop on and it carries him, by kind:
//   'lift'   straightens up again, lifting him high (up a bank too tall to jump)
//   'pass'   swings right over the top to bow the other way, handing him across (a row of them: a relay over a ravine)
//   'fling'  whips upright and lets go at the top: WHEEE, a catapult
//   'rise'   a tall red-and-gold variety that stands up straight: hop on and its stem grows straight up, new leaves
//            unfurling as it climbs, till his head's at row opts.top (up to an egg); step off and it sinks back. Idle, it
//            gazes up at the egg over it and now and then strains toward it (the only hint)
//   'lover'  fickle: while a cloud covers the sun it bows to him like any other, but the moment the sun's out it swings
//            round to bow to the real one (toward opts.dir) -- with him aboard, if he's waiting on its head
// opts.sun: while the sun's out it forgets him and gazes at the sun (a ride stops dead mid-swing till the cloud's back);
// opts.sleepy: a sunset bloom, drowsy: it bows, but with him aboard it nods off forward, sagging over the top and down
// toward the water, slowly, then faster (hop on to the next before it goes under).
// opts.relay: 1-1's sunset relay (with sleepy). Hop onto any of them and the controls let go: each nods forward and hands
// him on to the next with a little hop (BloomRide), the last ('end') setting him down on the far shore. 'start' marks
// the one that bows to him to begin it; the rest never bow, they just doze upright till he comes.
// opts.still: scenery. It stands tall and watches him, beaming when he's close, but never bows or carries him.
// The head is a platform (BloomHead, in g.platforms); the stem and leaves are drawn behind the terrain.
const BLOOM_ACC = 0.0016, BLOOM_SPIN = 0.024, BLOOM_EAGER = 0.034;   // swing: angular acceleration, top speed carrying him, top speed bowing
const BLOOM_HOLD = 12;                  // frames it holds still (a happy squash) after he hops on, before it moves
const BLOOM_FLING = [-11, 4.2];         // a fling bloom's launch (vy, vx away from the side he got on): ~7 tiles up, 13+ across
const BLOOM_HEAD_R = 15;                // the petal ring's radius: the head platform is its top
const SUN_LEAN = 14 * Math.PI / 180;    // a bloom gazing at the real sun leans just a little its way
const SLEEPY_SINK = 0.0035;             // a drowsy bloom's droop under him (radians per frame, growing)
const RELAY_NOD = 22 * Math.PI / 180, RELAY_END = 62 * Math.PI / 180;   // how far a relay bloom nods forward to hand him on, the next leaning back to meet it (the last: down to the shore)
const RELAY_CARRY = 64, RELAY_HOP = 26, RELAY_SETTLE = 14;   // frames: nodding forward with him, the hop across, settling on the next head
const BLOOM_RISE = 1.5, BLOOM_FALL = 0.7;   // a rising bloom: top speed growing up with him aboard, sinking back without (px per frame)

// The real sun. Only a stage with `sun: [x0, x1, period]` ever has a cloud over it: while the camera's over columns x0-x1
// a cloud drifts across the sun once every `period` frames, hiding it most of the time. sunCloud: the cloud's screen x
// (or null); sunCover: how covered the sun is (0-1, eased at the edges); sunOut: is it out?
function sunCloud(g) {
  const s = g.level && g.level.def.sun;
  if (!s || !g.level.def.day) return null;
  const mid = g.camX + VIEW_W / 2;
  if (mid < s[0] * TILE || mid > s[1] * TILE) return null;
  return sunScreen(sunDay(g)).x + ((g.t % s[2]) / s[2] - 0.5) * SUN_SWEEP;
}
function sunDay(g) { return clamp(g.camX / (g.level.w * TILE - VIEW_W), 0, 1); }
const SUN_SWEEP = 640, SUN_CLOUD_HALF = 190;   // how far the cloud bank drifts each period (px), and how near the sun its middle must be to hide it (~60% of the time)
function sunCover(g) { const c = sunCloud(g); return c == null ? 0 : clamp((SUN_CLOUD_HALF + 12 - Math.abs(c - sunScreen(sunDay(g)).x)) / 24, 0, 1); }
function sunOut(g) { return sunCover(g) < 0.5; }

class BloomHead {
  constructor(b) { this.bloom = b; this.w = BLOOM_HEAD_R * 2 + 6; this.h = 8; this.x = 0; this.y = 0; this.prevY = 0; this.dx = 0; this.dy = 0; this.lift = 0.8; this.stepUp = true; }
  update(g) { this.bloom.step(g); }   // (platforms move before the player does: so he rides it without slipping)
  draw(ctx, th, g) { this.bloom.drawHead(ctx, g); }
}

class Bloom extends Enemy {
  constructor(col, len, kind = 'lift', opts = {}) {
    super(col * TILE, 0, 16, 16);
    this.kind = kind; this.opts = opts; this.len = len * TILE;
    this.side = opts.side || 0;            // bows only toward this side (-1 / 1), or either
    this.bow = (opts.bow || 62) * Math.PI / 180;
    this.reach = (opts.reach || len + (kind === 'pass' || kind === 'lover' ? 10 : 4)) * TILE;
    this.a = (opts.start || 0) * Math.PI / 180; this.w0 = 0;   // lean (radians, + = right) and its swing speed
    this.head = new BloomHead(this);
    this.behindTiles = true; this.friendly = true; this.passive = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.ride = null; this.hold = 0; this.rest = 0; this.droop = 0; this.joy = 0; this.spoke = false; this.flung = false; this.gaze = 0;
    this.look = 0;
  }
  get cx() { return this.head ? this.head.x + this.head.w / 2 : this.x + 8; }   // (who's talking: the marker goes over the head)
  get talkY() { return this.head.y - 4 - (this.under || 0); }   // (with him standing on its head, the marker goes over him, never on him)
  hitbox() { return null; }
  touches() { return false; }
  say(g, text) {
    if (!this.opts.worldQuips) { g.speak(this, text, '#ffd23f'); return; }
    const line = String(oneOf(text)).toUpperCase();
    this.quip = { text: line, start: this.t, life: clamp(90 + line.length * 3, 120, 210) };
    Sound.play('blip');
  }
  place(g) {
    if (this.bx != null) return;
    const c = Math.floor(this.x / TILE), row = this.opts.row != null ? this.opts.row : g.level.surfaceRow(c);
    this.bx = this.x + 8; this.by = row * TILE + (row >= ROWS ? 16 : 0);   // (no ground: the stem rises out of the depths)
    this.y = this.by - 16;
    if (this.kind === 'rise') { this.len0 = this.len; this.lenTop = this.by - BLOOM_HEAD_R - this.opts.top * TILE; this.vr = 0; this.spin = 0; }
    this.setHead(true);
  }
  setHead(snap) {
    const h = this.head, ox = h.x, oy = h.y;
    h.x = this.bx + Math.sin(this.a) * this.len - BLOOM_HEAD_R - 3;
    h.y = this.by - Math.cos(this.a) * this.len - BLOOM_HEAD_R + this.dip;
    if (snap) { h.dx = h.dy = 0; h.prevY = h.y; return; }
    h.dx = h.x - ox; h.dy = h.y - oy; h.prevY = oy;
  }
  get dip() { return this.hold > 0 ? Math.round(Math.sin((BLOOM_HOLD - this.hold) / BLOOM_HOLD * Math.PI)) : 0; }   // (a 1px squash: heads meet ledges 3px proud of them, so they always win over the ground)
  // swing toward angle `to`, top speed `max`: eases in and out
  swing(to, max) {
    const want = clamp((to - this.a) * 0.09, -max, max);
    this.w0 += clamp(want - this.w0, -BLOOM_ACC * 1.6, BLOOM_ACC * 1.6);
    this.a += this.w0;
  }
  update(g) {
    this.place(g);
    if (this.opts.still) { this.step(g); return; }   // (no head platform: nothing to stand on)
    if (!this.added) { this.added = true; if (!g.platforms.includes(this.head)) g.platforms.push(this.head); }
  }
  // eased straight to angle `to` over T frames (a relay bloom, moved by BloomRide)
  drive(to, T) { this.drv = { from: this.a, to, T, t: 0 }; }
  step(g) {
    this.t++;
    const p = g.player, riding = p.state === 'play' && p.platform === this.head;
    this.under = p.platform === this.head ? p.h + 6 : 0;
    if (this.opts.sayAt && !this.saidAt && p.state === 'play' && (p.x + p.w / 2) / TILE >= this.opts.sayAt[0]) { this.saidAt = true; this.say(g, this.opts.sayAt[1]); }   // a line once he reaches a column
    if (this.opts.relay && riding && !g.bloomRide) g.bloomRide = new BloomRide(g, this);
    if (this.drv) {
      const v = this.drv, u = Math.min(1, ++v.t / v.T);
      this.a = v.from + (v.to - v.from) * u * u * (3 - 2 * u); this.w0 = 0;
      if (this.hold > 0) this.hold--;
      this.look += (clamp((p.x + p.w / 2 - this.bx) / 80, -1, 1) - this.look) * 0.1;
      this.setHead(false);
      return;
    }
    const out = (this.opts.sun || this.kind === 'lover') && sunOut(g);
    this.gaze += ((out ? 1 : 0) - this.gaze) * 0.08;
    const pcx = p.x + p.w / 2, d = pcx - this.bx;
    this.look += (clamp(d / 80, -1, 1) - this.look) * 0.1;
    if (riding && !this.ride) {   // he's hopped on
      this.ride = { side: Math.sign(this.a) || Math.sign(d) || 1 };
      this.hold = BLOOM_HOLD; this.joy = 1; this.flung = false; this.droop = 0;
      if (this.opts.ride && !this.rodeOnce) { this.rodeOnce = true; this.say(g, this.opts.ride); }
      Sound.play('spring');
      for (let i = 0; i < 6; i++) g.particles.push({ kind: 'px', x: this.head.x + this.head.w / 2 + rand(-12, 12), y: this.head.y + 2, vx: rand(-1, 1), vy: rand(-1.4, -0.4), g: 0.05, drag: 0.95, life: 30, t: 0, color: i % 2 ? '#ffd23f' : '#ffb800', size: 1 });
    } else if (!riding && this.ride) { this.ride = null; this.rest = 40; }
    if (this.hold > 0) this.hold--;
    this.joy = Math.max(0, this.joy - 0.01);
    if (this.opts.still && p.state === 'play' && Math.abs(d) < 3 * TILE) this.joy = Math.min(1, this.joy + 0.05);   // (beaming at him)
    let to = 0, max = BLOOM_EAGER;
    if (this.kind === 'lover' && out) {   // the sun's out: nothing else matters (he's just along for the ride)
      to = (this.opts.dir || 1) * this.bow; max = this.hold > 0 ? 0 : BLOOM_SPIN;
      if (!this.sunStruck && this.gaze > 0.5 && this.opts.sunLine && this.ride) { this.sunStruck = true; g.speak(this, this.opts.sunLine, '#ffd23f'); }
    } else if (this.kind === 'lover' && this.ride) {   // waiting for the sun with him aboard
      to = this.a; this.w0 *= 0.8; max = 0;
    } else if (out) {
      to = (this.opts.dir || 1) * SUN_LEAN; max = this.ride ? 0 : BLOOM_EAGER;   // gazing at the sun: stops dead under him
      if (this.ride) this.w0 *= 0.7;
      if (!this.sunStruck && this.gaze > 0.5 && this.opts.sunLine && Math.abs(d) < this.reach) { this.sunStruck = true; g.speak(this, this.opts.sunLine, '#ffd23f'); if (this.opts.sunReply) g.speak(CHICK_VOICE, this.opts.sunReply); }
    } else if (this.ride) {
      const s = this.ride.side;
      max = BLOOM_SPIN;
      if (this.hold > 0) { to = this.a; this.w0 = 0; }
      else if (this.opts.sleepy) {   // nodding off forward: it sags on over the top and down toward the pond, slowly, then faster
        this.droop += SLEEPY_SINK * (1 + this.droop * 4);
        to = -s * Math.min(Math.PI * 0.62, this.droop * 2.2 - this.bow); max = 0.004 + this.droop * 0.03;
      }
      else if (this.kind === 'lift') to = 0;
      else if (this.kind === 'pass') to = -s * this.bow;
      else if (this.kind === 'fling') {
        to = -s * this.bow; max = BLOOM_SPIN * 2.4;
        if (!this.flung && Math.sign(this.a) !== s) this.fling(g, p, s);
      }
    } else if (this.rest > 0) { this.rest--; to = this.a; this.w0 *= 0.85; }
    else if (!this.opts.still && this.kind !== 'rise' && this.opts.relay !== true && this.opts.relay !== 'end' && p.state === 'play' && Math.abs(d) > 10 && Math.abs(d) < this.reach && (!this.side || Math.sign(d) === this.side)) {
      to = Math.sign(d) * this.bow;   // bowing to him
      if (!this.spoke && Math.abs(this.a) > this.bow * 0.5) { this.spoke = true; if (this.opts.say) g.speak(this, this.opts.say, '#ffd23f'); }
    }
    if (this.hold > 0 && this.ride) { this.w0 = 0; } else this.swing(to, max);
    if (this.kind === 'rise') this.grow(g, riding);
    this.setHead(false);
  }
  // the egg right over a rising bloom (while it's still there): what it gazes up at
  egg(g) {
    const L = g.level.def.letters || [];
    for (let i = 0; i < L.length; i++) if (!g.lettersGot.has(i) && Math.abs(L[i][0] * TILE + 8 - this.bx) < TILE) return { x: L[i][0] * TILE + 8, y: L[i][1] * TILE + 8 };
    return null;
  }
  // a rising bloom: with him aboard its stem grows straight up (easing in, slowing to a stop at the top); without him it
  // settles back down after a moment, stretching up toward the egg now and then
  grow(g, riding) {
    if (riding && this.hold === 0 && this.len < this.lenTop) {
      if (!this.rising) { this.rising = true; Sound.play('sprout'); }
      this.vr = Math.min(BLOOM_RISE, this.vr + 0.04, (this.lenTop - this.len) * 0.05 + 0.2);
      this.len = Math.min(this.lenTop, this.len + this.vr);
      this.spin += this.vr * 0.02;
      if (this.t % 5 === 0) g.particles.push({ kind: 'px', x: this.bx + rand(-14, 14), y: this.head.y + 26, vx: rand(-0.4, 0.4), vy: rand(0.2, 0.7), g: 0.01, drag: 0.97, life: 50, t: 0, color: this.t % 10 ? '#ffd23f' : '#fff3b0', size: 1 });   // pollen sifting down
      if (this.len >= this.lenTop) {   // all the way up: a soft puff of petals
        this.vr = 0; this.joy = 1; Sound.play('leaf');
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.particles.push({ kind: 'px', x: this.bx + Math.cos(a) * 14, y: this.head.y + 15 + Math.sin(a) * 13, vx: Math.cos(a) * 0.9, vy: Math.sin(a) * 0.9 - 0.3, g: 0.03, drag: 0.95, life: 40, t: 0, color: i % 2 ? '#ffd23f' : '#ff8a3a', size: 2 }); }
      }
      return;
    }
    this.vr = 0;
    if (riding) { this.rising = false; return; }   // (at the top, or still squashing: it holds him there)
    this.rising = false;
    if (this.rest > 0) return;
    const u = (this.t % 260) / 260, strain = this.egg(g) && u < 0.25 ? Math.sin(u / 0.25 * Math.PI) * 6 : 0;   // reaching for the egg
    this.len += clamp(this.len0 + strain - this.len, -BLOOM_FALL, BLOOM_FALL);
  }
  fling(g, p, s) {
    this.flung = true;
    p.platform = null; p.onGround = false; p.jumping = false; p.springAir = true; p.sheepBounce = true; p.flaps = 0; p.holdGrace = 0;   // (a fixed arc, like a sheep's)
    p.y = this.head.y - p.h - 1; p.vy = BLOOM_FLING[0]; p.vx = -s * BLOOM_FLING[1]; p.airMax = Math.max(p.airMax || 0, BLOOM_FLING[1]);
    this.say(g, this.opts.flingLine || ['WHEEE!', 'UP YOU GO!', 'FLY, LITTLE SUN!']);
    Sound.play('spring');
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.particles.push({ kind: 'px', x: this.head.x + this.head.w / 2 + Math.cos(a) * 12, y: this.head.y + 8 + Math.sin(a) * 12, vx: Math.cos(a) * 1.4, vy: Math.sin(a) * 1.4 - 0.6, g: 0.04, drag: 0.94, life: 36, t: 0, color: i % 2 ? '#ffd23f' : '#fff3b0', size: 2 }); }
  }
  // the stem: a curve from the base (straight up out of the ground) to the back of the head, with two big leaves
  // (painted fine: the flower kit in meadow-fine.js)
  draw(ctx, g) {
    if (this.bx == null) return;
    const bx = this.bx, by = this.by, hx = this.head.x + BLOOM_HEAD_R + 3, hy = this.head.y + BLOOM_HEAD_R + 6;
    const pts = fineStem(ctx, bx, by, bx, by - this.len * 0.55, hx, hy, 2.3), n = pts.length - 1;
    // leaves, swaying a little, flapping happily while he rides
    const flap = this.ride ? Math.sin(this.t * 0.3) * 2 : Math.sin(this.t * 0.04 + bx) * 0.8;
    // (a rising bloom's leaves sit at fixed heights up the stem, each unfurling as the stem grows past it)
    const leaves = this.kind === 'rise' ? [] : [[0.3, -1, 1], [0.52, 1, 1], [0.74, -1, 1]];
    if (this.kind === 'rise') for (let dd = 22, s = -1; dd < this.len - 20; dd += 26, s = -s) { const f = clamp((this.len - 22 - dd) / 20, 0, 1); leaves.push([dd / this.len, s, f * f * (3 - 2 * f)]); }
    for (const [k, s, f] of leaves) {
      if (f < 0.1) continue;
      const i = Math.round(k * n), [x, y] = pts[i], [x2, y2] = pts[Math.min(n, i + 6)];
      const tx = x2 - x, ty = y2 - y, tl = Math.hypot(tx, ty) || 1, nx = -ty / tl * s, ny = tx / tl * s;   // out to one side of the stem
      const leaf = [];
      for (let j = 1; j <= 11; j++) leaf.push([x + (nx * j * 1.6 + tx / tl * j * 0.9) * f, y + (ny * j * 1.6 + ty / tl * j * 0.9 - j * 0.35 + (j > 5 ? flap * (j - 5) / 6 : 0)) * f, Math.max(0.8, (j < 4 ? j : j < 8 ? 4 : 11 - j + 1) * f * 0.95)]);
      for (const [lx, ly, r] of leaf) fBlob(ctx, lx, ly, r + 0.7, INK);
      for (const [lx, ly, r] of leaf) fBlob(ctx, lx, ly, r, '#4fb85c');
      for (const [lx, ly, r] of leaf) if (r > 1.2) fBlob(ctx, lx - 0.4, ly - 0.6, r * 0.55, '#78d878');
      for (let j = 0; j < leaf.length - 1; j++) fLine(ctx, leaf[j][0], leaf[j][1] + 0.3, leaf[j + 1][0], leaf[j + 1][1] + 0.3, '#2e8a3a');
    }
    if (this.opts.still) this.drawHead(ctx, g);   // (its head isn't a platform, so it's drawn with the stem)
  }
  // the head: a ring of petals round a big seed face that watches him (or the sun), beaming when he's aboard
  drawHead(ctx, g) {
    if (this.bx == null) return;
    const R = BLOOM_HEAD_R, hx = Math.round(this.head.x + R + 3), hy = Math.round(this.head.y + R), t = this.t;
    const sleepy = this.opts.sleepy, gz = this.gaze > 0.5, aboard = !!this.ride, riser = this.kind === 'rise';
    const wob = aboard ? Math.sin(t * 0.25) * 0.08 : 0;
    drawCentred(ctx, flowerRing(R - 4, 16, 4.6, 3.1, riser ? PETALS_FIRE : PETALS_GOLD, Math.sin(t * 0.02) * 0.05 + wob + (riser ? this.spin : 0)), hx, hy);
    // the face, turned a little toward whatever it's looking at
    const egg = riser && !aboard ? this.egg(g) : null;   // (a rising bloom gazes up at the egg over it)
    if (egg && g.player.platform !== this.head) {   // a faint little arrow drifting over its head: hop on? (gone once he's aboard)
      const ax = hx, ay = Math.round(this.head.y) - 9 - Math.round(Math.abs(Math.sin(t * 0.05)) * 2);
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff6d0';
      ctx.fillRect(ax - 2, ay, 5, 1); ctx.fillRect(ax - 1, ay + 1, 3, 1); ctx.fillRect(ax, ay + 2, 1, 1); ctx.fillRect(ax, ay - 3, 1, 3);
      ctx.globalAlpha = 1;
    }
    const lk = gz ? (this.opts.dir || 1) : egg ? 0 : this.look, fx = hx + lk * 2, fy = hy + (gz || egg ? -1 : 0);
    drawCentred(ctx, flowerFace(8.4), fx, fy);
    const ex = fx + lk * 2, cheeks = w => { fEll(ctx, ex - 6.3, fy + 1.3, 1.4, w, '#ff8aa8'); fEll(ctx, ex + 6.3, fy + 1.3, 1.4, w, '#ff8aa8'); };
    if (gz) {   // heart eyes for the sun
      for (const ox of [-3.2, 3.2]) { const x = ex + ox, y = fy - 3; fBlob(ctx, x - 0.9, y, 1.15, '#ff5d8f'); fBlob(ctx, x + 0.9, y, 1.15, '#ff5d8f'); for (let k = 0; k < 6; k++) fRect(ctx, x - 2 + k / 3, y + 0.3 + k / 3, 4 - k * 2 / 3, 1 / 3, '#ff5d8f'); fRect(ctx, x - 1.3, y - 0.7, 1 / 3, 1 / 3, '#ffd0e0'); }
      fEll(ctx, ex, fy + 3.8, 1.4, 1, INK);
    } else if (sleepy) {   // drowsy: heavy lids, a slow yawn now and then (wide while it carries him)
      const yawn = aboard || g.player.platform === this.head || t % 300 > 240;
      for (const ox of [-3.2, 3.2]) { fEll(ctx, ex + ox, fy - 1.6, 1.8, 0.9, '#f4f0e8'); fRect(ctx, ex + ox - 2, fy - 2.4, 4, 1, '#5a3410'); fRect(ctx, ex + ox - 2, fy - 1.7, 4, 1 / 3, INK); }
      if (yawn) { fEll(ctx, ex, fy + 4, 1.6, 2, INK); fEll(ctx, ex, fy + 4.8, 1, 0.9, '#d8405a'); } else fRect(ctx, ex - 1.3, fy + 3.3, 2.7, 2 / 3, INK);
      if (t % 70 === 0) g.particles.push({ kind: 'text', text: 'z', x: hx + 10, y: hy - 14, vx: 0.2, vy: -0.4, life: 50, t: 0, color: '#ffffff' });
    } else if (riser && this.rising) {   // straining upward: eyes squeezed tight, cheeks puffed, lips pressed
      fLine(ctx, ex - 5, fy - 4, ex - 2.5, fy - 2.7, INK, 2); fLine(ctx, ex - 2.5, fy - 2.7, ex - 5, fy - 1.4, INK, 2);
      fLine(ctx, ex + 5, fy - 4, ex + 2.5, fy - 2.7, INK, 2); fLine(ctx, ex + 2.5, fy - 2.7, ex + 5, fy - 1.4, INK, 2);
      fRect(ctx, ex - 1.3, fy + 3, 2.7, 2 / 3, INK);
      cheeks(1.1);
    } else if (aboard || this.joy > 0.6) {   // overjoyed: squeezed-shut eyes, rosy cheeks, a big grin
      for (const ox of [-3.2, 3.2]) fArc(ctx, ex + ox, fy - 2.2, 1, 1.75, Math.PI * 1.1, Math.PI * 1.9, INK);
      fArc(ctx, ex, fy + 1.6, 0, 3.4, 0.1, Math.PI - 0.1, INK, 0.85); fArc(ctx, ex, fy + 2.2, 0, 2.5, 0.25, Math.PI - 0.25, '#d8405a', 0.75);
      fRect(ctx, ex - 2.7, fy + 1.7, 5.4, 1 / 3, '#fff3e8');
      cheeks(0.8);
    } else {   // big shiny eyes following him, a smile (an eager little 'o' while it bows)
      const p = g.player, tx = egg ? egg.x : p.x + p.w / 2, ty = egg ? egg.y : p.y + p.h / 2;
      for (const ox of [-3.2, 3.2]) {
        const eX = ex + ox, eY = fy - 2.6, dx = tx - eX, dy = ty - eY, dd = Math.max(12, Math.hypot(dx, dy));
        fEll(ctx, eX, eY, 1.75, 2.3, '#ffffff');
        const px = eX + dx / dd * 0.7, py = eY + dy / dd * 1.1;
        fEll(ctx, px, py, 1, 1.35, INK); fRect(ctx, px - 0.6, py - 0.9, 2 / 3, 2 / 3, '#ffffff');
      }
      if (Math.abs(this.a) > 0.3) { fEll(ctx, ex, fy + 3.4, 1.6, 1.8, INK); fEll(ctx, ex, fy + 3.9, 0.8, 0.8, '#d8405a'); }
      else fArc(ctx, ex, fy + 1.2, 1.6, 2.3, Math.PI * 0.2, Math.PI * 0.8, INK);
    }
    if (this.quip) {
      const age = this.t - this.quip.start;
      if (age < this.quip.life) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, age / 6, (this.quip.life - age) / 18);
        const text = this.quip.text.slice(0, Math.floor(age * DIALOG_CPS));
        drawText(ctx, text, fx + 14, fy + 13, '#fff3b0', { small: true, shadow: INK });
        ctx.restore();
      }
    }
  }
}

// 1-1's sunset relay: he's hopped onto a relay bloom, and from here the drowsy blooms do it all (the controls are
// locked: Game.update hands him to step() while it's going). Each nods forward with him, then he hops across to the
// next head; the last nods deep and sets him down on the far shore. He's moved exactly (no physics), so nothing slips.
class BloomRide {
  constructor(g, b) { this.cur = b; this.phase = 'carry'; this.t = 0; this.carry(g, b); }
  // the bloom he's on swings him forward over the top, while the next one leans back to meet it
  carry(g, b) {
    this.cur = b; this.phase = 'carry'; this.t = 0;
    const end = b.opts.relay === 'end', T = end ? RELAY_CARRY * 1.4 : RELAY_CARRY;
    b.drive(end ? RELAY_END : RELAY_NOD, T);
    const n = end ? null : this.next(g);
    if (n) n.drive(-RELAY_NOD, T);
  }
  // the next bloom along (they're spawned well ahead of him), or null
  next(g) {
    let best = null;
    for (const e of g.entities) if (e instanceof Bloom && e.opts.relay && e.x > this.cur.x && e.bx != null && (!best || e.x < best.x)) best = e;
    return best;
  }
  hop(g, p) {
    const to = this.cur.opts.relay === 'end' ? null : this.next(g);
    const h = this.cur.head, x0 = h.x + h.w / 2, y0 = h.y;
    let x1, y1;
    if (to) { x1 = to.head.x + to.head.w / 2; y1 = to.head.y; }
    else { x1 = x0 + 16; y1 = g.level.surfaceRow(Math.floor(x1 / TILE)) * TILE; }   // down onto the shore
    // a gentle arc; one that passes under an egg rises just enough to carry him through it
    let peak = Math.min(y0, y1) - 18;
    for (const [c, r] of g.level.def.letters || []) { const ex = c * TILE + 8; if (ex > x0 && ex < x1) peak = Math.min(peak, r * TILE + 8 + p.h / 2 + 2); }
    this.arc = { x0, y0, x1, y1, peak, to, n: to ? RELAY_HOP : RELAY_HOP + 8 };   // (the drop to the shore takes its time: no faster than a fall)
    this.phase = 'hop'; this.t = 0; Sound.play('hop');
  }
  // place him (feet at x, y): returns nothing, just pins him there
  pin(p, x, y, ground) { p.x = x - p.w / 2; p.y = y - p.h; p.onGround = ground; p.vx = 0; p.facing = 1; p.crouch = false; p.flaps = 0; }
  step(g, p) {
    this.t++;
    if (this.phase === 'carry' || this.phase === 'settle') {
      const h = this.cur.head;
      this.pin(p, p.x + p.w / 2 + (h.x + h.w / 2 - p.x - p.w / 2) * 0.3, h.y, true); p.platform = h; p.vy = 0;
      if (this.phase === 'settle' && this.t >= RELAY_SETTLE) this.carry(g, this.cur);
      else if (this.phase === 'carry' && this.t >= this.cur.drv.T) this.hop(g, p);
      return true;
    }
    // the hop: straight across the arc (eased), up through `peak`
    const a = this.arc, u = Math.min(1, this.t / a.n), x = a.x0 + (a.x1 - a.x0) * u;
    const top = a.peak, k = Math.sqrt(Math.max(0, a.y0 - top)), l = Math.sqrt(Math.max(0, a.y1 - top)), m = k / (k + l || 1);   // (a parabola through both ends and the peak)
    const y = u < m ? top + (a.y0 - top) * ((m - u) / m) ** 2 : top + (a.y1 - top) * ((u - m) / (1 - m || 1)) ** 2;
    const prevY = p.y;
    if (a.to) { const h = a.to.head; a.x1 = h.x + h.w / 2; a.y1 = h.y; }   // (the next head sways a little: land right on it)
    this.pin(p, x, y, false); p.platform = null; p.vy = p.y - prevY;
    if (u >= 1) {
      if (a.to) { this.cur.drive(0, 110); a.to.hold = BLOOM_HOLD; Sound.play('spring'); this.cur = a.to; this.phase = 'settle'; this.t = 0; p.platform = a.to.head; p.onGround = true; p.vy = 0; }
      else { this.cur.drive(0, 140); p.onGround = true; p.vy = 0; g.dust(p.x + p.w / 2, p.y + p.h, 4); g.bloomRide = null; }   // set down on the shore: his again
    }
    return true;
  }
}
