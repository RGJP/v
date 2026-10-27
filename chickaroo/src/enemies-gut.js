'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 3-4 GUT FEELING: the creatures inside the turtle (nobody else's enemies get reused in here)
// ═══════════════════════════════════════════════════════════════════════════
// Everything in here is something a sea turtle really carries about inside: its own spiky gullet, gut microbes, flukes,
// the fuzz of its intestine, the gas its hindgut brews, the stones it makes, and the junk it swallows by mistake.
//   ['prickle', col, row, dir]   PRICKLE: one big papilla rooted in the wall beside tile (col, row) (dir 1 points right,
//                                -1 left; omitted: away from whichever side has the wall). It shrinks back into the flesh,
//                                then thrusts across the chute: in a gullet it strikes as the peristalsis wave squeezes
//                                past it (watch the wave), elsewhere on its own beat; every third thrust it flicks a salt
//                                crystal. Nothing hurts it (a spin bounces off it)
//   ['blob', col, row]           BLOBULE: a gastric amoeba, something half digested floating inside. Inches toward you;
//                                stomp it and it splits into two quick little blobulettes that hop after you (and walk off
//                                ledges). Leave two of them to bump into each other and they merge back
//   ['fluke', col, row]          FLUKE: a flatworm hanging from the ceiling (its top at row's top). Walk under it and it
//                                drops on you and hangs on: he's weighed down (lower jumps, slower running) until he shakes
//                                it off with three jumps (or a roll or a spin). Miss, and it's stuck to the floor
//                                wriggling (stomp it), then inches after you
//   ['fuzz', x0, x1, row, n = 5] FUZZLINGS: a string of n balls of gut fuzz (microvilli) weaving a figure across columns
//                                x0-x1 about row. They don't hurt: they BOUNCE you away, hard. Land on top and they're a
//                                trampoline. A fireball singes one flat for a few seconds
//   ['fizz', col, row]           FIZZBAG: a bubble of hindgut gas, bobbing. Touch it any way at all (stomp, bump, kick, a
//                                fireball, a roll) and it's armed and shoved: a 1.5 s fuse, then it goes off. The blast
//                                takes out every foe near it (even a PLOPSTONE), breaks gristle plugs, sets off other
//                                fizzbags, and hurts Chickaroo if he's too close. A new one bubbles up where it began
//   ['plop', col, row]           PLOPSTONE: a coprolith, a lump of calcified... well. Trundles about in a stone shell you
//                                can't stomp (you bounce off it). See you on its level and it curls up and rolls at
//                                you, ricocheting off a wall; at the second wall it knocks itself silly, flipped on its
//                                back for a moment: stomp it then. Or blow it up
//   ['bag', col, row, 'up'?]     PLASTIC BAG ('up': pulses upward out of an opening): a bag the turtle swallowed for a jellyfish, still pulsing along like one,
//                                after you. It's gone brittle in there: touch it (or hit it with anything) and it shreds
//   ['squatter', col, row]       SQUATTER: a hermit crab living in a swallowed tin of beans. Stomp it and it hides in the
//                                tin: kick it, or carry it, like a shell
//   ['parasite', col, row, dir]     PARASITIC WORM: wriggles along floors and ledges, turns at edges; stomp to squash.
//   ['plug', col, r0, r1, w = 2] a wad of gristle and fish bones jammed in a passage (solid). Only a fizzbag's blast
//                                breaks it

// a crisp filled ellipse from 1px spans
function gutEllipse(ctx, cx, cy, rx, ry, col) {
  if (isFineCtx(ctx)) { fEll(ctx, cx, cy + 0.5, rx, ry + 0.5, col); return; }   // (on the fine screen: a smooth one, hires.js)
  ctx.fillStyle = col;
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) * (dy / ry))));
    if (w > 0) ctx.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2, 1);
  }
}
const towardP = (g, e) => g.player.x + g.player.w / 2 < e.cx ? -1 : 1;
const nearP = (g, e, dx, dy) => { const p = g.player; return p.state === 'play' && Math.abs(p.x + p.w / 2 - e.cx) < dx && Math.abs(p.y + p.h / 2 - (e.y + e.h / 2)) < dy; };

// ── PRICKLE ─────────────────────────────────────────────────────────────────
const PRICKLE_LEN = 30, PRICKLE_BEAT = 150;
class Prickle extends Enemy {
  constructor(col, row, dir) {
    super(col * TILE, row * TILE + 4, TILE, 8);
    this.col = col; this.row = row; this.dir = dir || 0; this.ext = 0; this.thrusts = 0; this.shaking = 0; this.was = 0;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  root() { return this.dir > 0 ? this.col * TILE : (this.col + 1) * TILE; }
  hitbox() {
    const L = 4 + (PRICKLE_LEN - 4) * this.ext, r = this.root();
    return { x: this.dir > 0 ? r : r - L, y: this.row * TILE + 4, w: L, h: 8 };
  }
  update(g) {
    this.t++;
    if (!this.dir) this.dir = g.level.solid(this.col - 1, this.row) ? 1 : -1;
    // when to strike: with the gullet's squeeze if there is one, or on a beat of its own
    const gul = g.entities.find(e => e instanceof Gullet && this.col >= e.x0 && this.col <= e.x1);
    let k;
    if (gul) k = gul.squeeze(this.row * TILE + 8, g.t);
    else { const f = (this.t + this.col * 37) % PRICKLE_BEAT; k = f < 100 ? f / 100 * 0.44 : f < 140 ? 1 : 0; }
    const want = k > 0.45 ? 1 : 0;
    this.shaking = k > 0.2 && !want ? 1 : 0;   // the root quivers just before it strikes
    if (want) this.ext = Math.min(1, this.ext + 0.22); else this.ext = Math.max(0, this.ext - 0.04);
    if (want && !this.was) { this.thrusts++; if (this.onScreen(g)) Sound.play('spike'); }
    if (this.ext >= 1 && this.was < 1 && this.thrusts % 3 === 0) {   // a salt crystal flicked off the tip
      const tip = this.root() + this.dir * PRICKLE_LEN;
      g.entities.push(new SaltShot(tip, this.row * TILE + 6, this.dir * 1.7, -1.4));
      if (this.onScreen(g)) Sound.play('spit');
    }
    this.was = want ? this.ext : 0;
  }
  onScreen(g) { return this.x > g.camX - 16 && this.x < g.camX + VIEW_W + 16; }

  draw(ctx) {
    const r = this.root(), d = this.dir, cy = this.row * TILE + 8, L = Math.round(4 + (PRICKLE_LEN - 4) * this.ext);
    const jx = this.shaking ? ((this.t >> 1) & 1) * d : 0;
    // the swollen collar of wet flesh it grows out of, lit from above
    for (let dy = -9; dy <= 9; dy++) for (let dx = -5; dx <= 5; dx++) {
      const q = 1 - (dx / 5.5) ** 2 - (dy / 9.5) ** 2;
      if (q <= 0 || dx * d > 2) continue;
      const [dif, spec] = gsLight(dx / 5.5, dy / 9.5, Math.sqrt(q));
      const col = gsRamp(VILLI_PAL, clamp(0.1 + dif * 0.75 + (this.shaking ? 0.12 : 0), 0, 1), dx + 64, dy + 64);
      ctx.fillStyle = spec > 0.5 ? '#ffffff' : `rgb(${col[0]},${col[1]},${col[2]})`; ctx.fillRect(r + jx + dx, cy + dy, 1, 1);
    }
    // the spike: a cone of keratin, lit like a horn -- ivory on top, amber shading under, growth rings round it,
    // and a translucent tip the light comes through
    const KER = gsPal(['#3a2414', '#6a4a2a', '#9a7a52', '#c4a87c', '#e2cfa8', '#f6ead2', '#fffaf0']);
    for (let i = 0; i <= L; i++) {
      const u = i / L, half = Math.max(0.6, 5 * (1 - u) ** 0.85), x = r + jx + d * (i + 3) - (d < 0 ? 1 : 0), mid = cy - u * 2;
      const top = Math.round(mid - half), bot = Math.round(mid + half);
      ctx.fillStyle = INK; ctx.fillRect(x, top - 1, 1, bot - top + 3);
      for (let y = top; y <= bot; y++) {
        const ny = (y + 0.5 - mid) / (half + 0.5), [dif, spec] = gsLight(0, ny, Math.sqrt(Math.max(0, 1 - ny * ny)));
        let v = 0.1 + dif * 0.85 + (u > 0.8 ? 0.15 : 0) - (i % 5 === 2 && u < 0.8 ? 0.12 : 0);
        const col = gsRamp(KER, clamp(v, 0, 1), x, y);
        ctx.fillStyle = spec > 0.6 ? '#ffffff' : `rgb(${col[0]},${col[1]},${col[2]})`; ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

// a salt crystal: a little white cube tumbling in an arc
class SaltShot extends Enemy {
  constructor(x, y, vx, vy) {
    super(x - 3, y - 3, 6, 6);
    this.vx = vx; this.vy = vy; this.bossHazard = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  update(g) {
    this.t++;
    this.vy = Math.min(this.vy + 0.07, 3); this.x += this.vx; this.y += this.vy;
    if (g.level.solid(Math.floor(this.cx / TILE), Math.floor((this.y + 3) / TILE))) {
      g.burst(this.cx, this.y + 3, ['#ffffff', '#dff6ff', '#bfe0f0'], 6); Sound.play('crack'); this.remove = true; return;
    }
    if (this.y > VIEW_H + 16 || this.t > 300) this.remove = true;
  }

  draw(ctx) {   // a cube of salt crystal, tumbling: a bright top face, a lit side, a shadowed side, sparkling
    const x = Math.round(this.x), y = Math.round(this.y), s = (this.t >> 2) & 1;
    ctx.fillStyle = INK; ctx.fillRect(x - 1, y - 1, 8, 8);
    ctx.fillStyle = s ? '#ffffff' : '#eef8ff'; ctx.fillRect(x, y, 6, 2);
    ctx.fillStyle = '#c8e0ee'; ctx.fillRect(x, y + 2, 3, 4);
    ctx.fillStyle = '#8aa8bc'; ctx.fillRect(x + 3, y + 2, 3, 4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + (s ? 1 : 4), y, 1, 1);
    if ((this.t >> 1) % 5 === 0) { ctx.fillRect(x - 2, y + 2, 1, 1); ctx.fillRect(x + 7, y + 4, 1, 1); }
  }
}

// ── BLOBULE ─────────────────────────────────────────────────────────────────
const BLOB = { o: '#1e4a16', d: '#4a9a2a', b: '#7ed043', l: '#c8ff7a', nuc: '#2e6a1e' };
class Blobule extends Enemy {
  constructor(col, row, x, small) {
    const w = small ? 10 : 20, h = small ? 8 : 14;
    super(x != null ? x - w / 2 : col * TILE + (TILE - w) / 2, (row + 1) * TILE - h, w, h);
    this.small = !!small; this.walker = true; this.dir = -1; this.ph = (col || 0) * 1.3 + (x || 0) * 0.1;
    this.merge = small ? 70 : 0; this.squish = 0;
  }
  update(g) {
    this.t++;
    if (this.merge > 0) this.merge--;
    if (this.squish > 0) this.squish--;
    if (nearP(g, this, 140, 48) && (this.t % 40 === 0 || !this.vx)) this.dir = towardP(g, this);
    if (this.small) {   // quick little hops toward you
      if (this.onGround && this.t % 26 === 0) { this.vy = -2.2; this.vx = this.dir * 1.3; }
      if (this.onGround && this.vy === 0) this.vx *= 0.8;
      this.walk(g, false);
    } else {            // the amoeba's crawl: reach out a pseudopod, then haul itself after it
      const s = Math.sin(this.t * 0.11 + this.ph);
      this.vx = this.dir * (s > 0 ? 0.55 * s : 0.06);
      const was = this.vx;
      this.walk(g, true);
      if (was && Math.sign(this.vx) !== Math.sign(was)) this.dir = -this.dir;
    }
    // two little ones that bump into each other run back together
    if (this.small && !this.merge) for (const e of g.entities) {
      if (e === this || !(e instanceof Blobule) || !e.small || e.dead || e.merge || !overlap(this, e)) continue;
      const nb = new Blobule(0, 0, (this.cx + e.cx) / 2, false);
      nb.y = Math.max(this.y + this.h, e.y + e.h) - nb.h; nb.squish = 16; nb.dir = this.dir;
      if (!g.level.solid(Math.floor(nb.x / TILE), Math.floor((nb.y + 2) / TILE)) && !g.level.solid(Math.floor((nb.x + nb.w) / TILE), Math.floor((nb.y + 2) / TILE))) {
        this.remove = e.remove = this.dead = e.dead = true;
        g.entities.push(nb);
        Sound.play('plop');
      }
      break;
    }
  }
  stomp(g, p) {
    g.bounce(p); g.stompScore(this); Sound.play('stomp');
    if (this.small) { this.burstDeath(g); return; }
    // the big one splits in two
    this.dead = this.remove = true;
    for (const sd of [-1, 1]) {
      const b = new Blobule(0, 0, this.cx + sd * 5, true);
      b.y = this.y + this.h - b.h; b.vx = sd * 1.8; b.vy = -2.6; b.dir = sd; b.squish = 8;
      g.entities.push(b);
    }
    Sound.play('plop');
    g.burst(this.cx, this.y + this.h / 2, [BLOB.b, BLOB.l, '#ffffff'], 8);
  }
  updateDead(g) { if (!this.splat) { super.updateDead(g); return; } if (++this.deadT > 30) this.remove = true; }

  draw(ctx) {
    const b = Math.round(this.y + this.h), cx = this.cx;
    if (this.splat) {   // a puddle of gel, spreading and soaking away
      const k = Math.min(1, this.deadT / 30);
      ctx.globalAlpha = 1 - k * 0.6; gutEllipse(ctx, cx, b - 1, 7 + Math.round(k * 3), 1, '#164414'); gutEllipse(ctx, cx, b - 1, 5 + Math.round(k * 3), 1, '#66c046');
      fEll(ctx, cx - 2, b - 1.6, 1.2, 0.4, '#c8f4a4'); ctx.globalAlpha = 1; return;
    }
    drawFlipped(ctx, this, () => {
      const fr = Math.floor(((this.t * (this.small ? 0.2 : 0.11) + this.ph) / (Math.PI * 2)) * 8) & 7, spr = gsAmoeba(fr, this.small);
      const sq = this.squish > 0 ? Math.sin(this.squish * 0.6) * 0.2 : 0;
      if (sq) { ctx.save(); ctx.translate(Math.round(cx), b); ctx.scale(1 + sq, 1 - sq); ctx.translate(-Math.round(cx), -b); }
      gsDraw(ctx, spr, cx, b + 1, Math.round(spr.width * 0.45), spr.height, this.dir < 0);
      if (sq) ctx.restore();
    });
  }
}

// ── FLUKE ───────────────────────────────────────────────────────────────────
const FLUKE_YELPS = ['AHH OFF OFF!', 'WRRAH SHOO!', 'SO SQUISHY EW!'];   // what he says every time one latches on
const FLUKE_JUMP = 0.74, FLUKE_RUN = 0.6, FLUKE_SHAKES = 3;
class Fluke extends Enemy {
  constructor(col, row) {
    super(col * TILE + 3, row * TILE, 10, 20);
    this.home = this.y; this.state = 'hang'; this.timer = 0; this.shakes = 0; this.dir = -1;
  }
  hitbox() { return this.state === 'latched' ? null : this; }
  update(g) {
    this.t++; this.timer++;
    const p = g.player, lv = g.level;
    if (this.state === 'hang') {
      const under = p.state === 'play' && Math.abs(p.x + p.w / 2 - this.cx) < 16 && p.y > this.y;
      let clear = under;
      for (let r = Math.floor((this.y + this.h) / TILE); clear && r < Math.floor(p.y / TILE); r++) if (lv.solid(Math.floor(this.cx / TILE), r)) clear = false;
      if (clear) { this.state = 'quiver'; this.timer = 0; Sound.play('blip'); }
    } else if (this.state === 'quiver') {
      if (this.timer > 10) { this.state = 'drop'; this.vy = 0.5; }
    } else if (this.state === 'drop') {
      this.vy = Math.min(this.vy + 0.32, 6);
      if (sweepY(lv, this, this.vy) === 1) {   // missed: stuck in the floor, wriggling
        this.state = 'stuck'; this.timer = 0; this.h = 6; this.y += 14; this.w = 16; this.x -= 3; this.vy = 0;
        Sound.play('plop'); g.dust(this.cx, this.y + this.h, 3);
      }
      if (this.y > VIEW_H + 16) this.remove = true;
    } else if (this.state === 'stuck') {
      if (this.timer > 100) { this.state = 'inch'; this.walker = true; this.dir = towardP(g, this); }
    } else if (this.state === 'inch') {   // an inchworm: hunch up, stretch out
      const f = this.t % 30;
      this.vx = f < 15 ? this.dir * 0.9 : 0;
      if (this.t % 90 === 0) this.dir = towardP(g, this);
      const was = this.vx;
      this.walk(g, true);
      if (was && Math.sign(this.vx) !== Math.sign(was)) this.dir = -this.dir;
    } else if (this.state === 'latched') this.updateLatched(g);
  }
  latch(g) {
    const p = g.player;
    this.state = 'latched'; this.shakes = 0; this.timer = 0; this.drawOver = true; p.fluke = this;
    Sound.play('chomp');
    g.speak(CHICK_VOICE, FLUKE_YELPS, '#ffd166');   // (every time; play carries on)
  }
  updateLatched(g) {
    const p = g.player;
    if (p.state !== 'play' || p.fluke !== this) { this.letGo(g, false); return; }
    this.x = p.x + p.w / 2 - this.w / 2 - p.facing * 3; this.y = p.y - 6;
    if (Input.hit('jump')) {
      this.shakes++; Sound.play('flap');
      g.burst(this.cx, this.y + 4, ['#e8b8ff', '#ffffff'], 3);
      if (this.shakes >= FLUKE_SHAKES) this.letGo(g, true);
    }
    if (p.roll > 0 || p.spin) this.letGo(g, true);
  }
  letGo(g, flung) {
    const p = g.player;
    if (p.fluke === this) p.fluke = null;
    this.drawOver = false;
    if (flung) { this.flipKill(g, -p.facing); g.stompScore(this); Sound.play('pop'); }
    else { this.state = 'drop'; this.vy = 0; }
  }
  onTouch(g, p) {
    // it never hurts: it only sticks (a stomp still squashes it, any time)
    if (g.isStomp(p, this) && this.state !== 'drop') { this.stomp(g, p); return; }
    if (!p.fluke && !(p.invuln > 0) && this.state !== 'stuck') this.latch(g);
  }
  stomp(g, p) { this.state = 'dead'; super.stomp(g, p); }

  draw(ctx) {
    const t = this.t;
    drawFlipped(ctx, this, () => {
      if (this.state === 'stuck' || this.state === 'inch') {   // lying flat, or inching along with a hump in its middle
        const fr = this.state === 'inch' ? Math.floor((t % 30) / 30 * 8) : (t >> 3) & 1, spr = gsFluke(this.state === 'inch' ? 'hump' : 'flat', fr);
        gsDraw(ctx, spr, this.cx, this.y + this.h + 1, spr.width / 2, spr.height, this.dir < 0);
        return;
      }
      if (this.state === 'latched') {   // clamped across his back by its suckers, squirming
        const spr = gsFluke('hump', (t >> 2) & 7);
        gsDraw(ctx, spr, this.cx, this.y + 12, spr.width / 2, spr.height, this.x > this.prevX);
        this.prevX = this.x;
        return;
      }
      // hanging from the roof by its tail, swaying, its mouth end gaping down at whoever passes
      const fr = this.state === 'quiver' ? (t & 1) * 4 : this.state === 'drop' ? 2 : Math.floor(t / 10) & 7, spr = gsFluke('hang', fr);
      gsDraw(ctx, spr, this.cx + (this.state === 'quiver' ? (t & 1) * 2 - 1 : 0), this.y - 1, Math.floor(spr.width / 2), 0, false);
    });
  }
}

// ── FUZZLINGS ───────────────────────────────────────────────────────────────
// (the entity in the level data just sets out the string of them, then goes)
class FuzzString extends Enemy {
  constructor(x0, x1, row, n = 5) { super(x0 * TILE, row * TILE, 1, 1); this.a = x0 * TILE; this.b = (x1 + 1) * TILE; this.cy = row * TILE + 8; this.n = n; this.passive = true; }
  hitbox() { return null; }
  touches() { return false; }
  update(g) { for (let i = 0; i < this.n; i++) g.entities.push(new Fuzzling(this.a, this.b, this.cy, i * 0.42, i)); this.remove = true; }
  draw() {}
}
const FUZZ_KNOCK = 3.4, FUZZ_LIFT = 2.6, FUZZ_TRAMP = 1.3;
class Fuzzling extends Enemy {
  constructor(a, b, cy, ph, i) {
    super(a, cy - 6, 12, 12);
    this.a = a; this.b = b; this.cy = cy; this.ph = ph; this.i = i; this.singe = 0; this.squish = 0; this.cool = 0;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.place(0);
  }
  place(t) {   // a lazy figure-of-eight across the gap
    const s = t * 0.011 + this.ph, span = this.b - this.a - 12;
    this.x = this.a + span * (0.5 - 0.5 * Math.cos(s)); this.y = this.cy - 6 + Math.sin(s * 2) * 16;
  }
  hitbox() { return this.singe > 0 ? null : { x: this.x + 1, y: this.y + 1, w: 10, h: 10 }; }
  fireHit(g) {
    if (this.singe > 0) return;
    this.singe = 200; Sound.play('sizzle'); g.burst(this.cx, this.y + 6, ['#8a7a7a', '#c8b8b8'], 6);
  }
  update(g) {
    this.t++;
    if (this.singe > 0) this.singe--;
    if (this.squish > 0) this.squish--;
    if (this.cool > 0) this.cool--;
    if (this.singe <= 0) this.place(this.t);
    else if (this.t % 6 === 0) g.particles.push({ kind: 'px', x: this.cx + rand(-2, 2), y: this.y + 2, vx: rand(-0.2, 0.2), vy: -0.6, drag: 0.96, life: 30, t: 0, color: '#9a8a8a', size: 2 });
  }
  onTouch(g, p) {
    if (this.cool > 0) return;
    this.cool = 10; this.squish = 12;
    if (p.roll > 0) g.endRoll(p);
    p.onGround = false; p.platform = null; p.coyote = 0; p.jumping = false;
    if (g.isStomp(p, this)) {   // from above: a trampoline
      g.bounce(p, true); p.vy *= FUZZ_TRAMP; Sound.play('spring');
      return;
    }
    // anything else: BOING, away you go (no harm done)
    const dx = p.x + p.w / 2 - this.cx, dy = p.y + p.h / 2 - (this.y + 6), d = Math.hypot(dx, dy) || 1;
    p.vx = (dx / d) * FUZZ_KNOCK + Math.sign(dx || 1) * 1; p.airMax = Math.max(p.airMax || 0, Math.abs(p.vx));
    p.vy = Math.min(-FUZZ_LIFT, (dy / d) * FUZZ_KNOCK);
    Sound.play('sproing');
    g.burst(this.cx + Math.sign(dx) * 5, this.y + 6, ['#ffd0dc', '#ffffff'], 5);
  }

  draw(ctx) {
    const cx = this.cx, cy = this.y + 6;
    if (this.singe > 0) {   // singed: a shrivelled brown knot, smoking
      const spr = gsFuzz(0, true); gsDraw(ctx, spr, cx, cy + 2, spr.width / 2, spr.height / 2, false); return;
    }
    const spr = gsFuzz(Math.floor((this.t + this.i * 9) / 7) % 6);
    const sq = this.squish > 0 ? Math.sin(this.squish * 0.8) * 0.18 : 0;
    if (sq) { ctx.save(); ctx.translate(Math.round(cx), Math.round(cy)); ctx.scale(1 + sq, 1 - sq); ctx.translate(-Math.round(cx), -Math.round(cy)); }
    gsDraw(ctx, spr, cx, cy, Math.floor(spr.width / 2), Math.floor(spr.height / 2), false);
    if (sq) ctx.restore();
  }
}

// ── FIZZBAG ─────────────────────────────────────────────────────────────────
const FIZZ_FUSE = 90, FIZZ_R = 34, FIZZ_HURT = 24, FIZZ_REGROW = 240;
class Fizzbag extends Enemy {
  constructor(col, row) {
    super(col * TILE, row * TILE, 16, 16);
    this.hx = this.x; this.hy = this.y; this.fuse = 0; this.gone = 0; this.r = 7;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return this.gone ? null : this; }
  get cy() { return this.y + 8; }
  arm(g, vx, vy) {
    if (this.gone) return;
    if (!this.fuse) { this.fuse = FIZZ_FUSE; Sound.play('swFuse'); }
    this.vx = vx; this.vy = vy;
  }
  fireHit(g) { this.arm(g, 0, -0.4); }
  flipKill(g, dir) { this.arm(g, (dir || 1) * 2.2, -0.6); }   // (a kicked shell or a power-up shoves it)
  onTouch(g, p) {
    if (this.touchCool > 0) return;
    this.touchCool = 12;
    const away = this.cx < p.x + p.w / 2 ? -1 : 1;
    if (g.isStomp(p, this)) { g.bounce(p); this.arm(g, away * 0.4, 1.8); Sound.play('stomp'); }
    else if (p.y > this.y + 8 && p.vy < 0) { this.arm(g, 0, -2.4); p.vy = 1; Sound.play('bump'); }   // headbutted from below
    else { this.arm(g, away * (p.roll > 0 ? 3.2 : 2.4), -0.8); Sound.play('kick'); if (p.roll > 0) g.endRoll(p); }
  }
  update(g) {
    this.t++;
    if (this.touchCool > 0) this.touchCool--;
    if (this.gone) {   // a new one fermenting where the old one was
      if (--this.gone === 0) { this.x = this.hx; this.y = this.hy; this.vx = this.vy = 0; this.r = 0; Sound.play('pop'); }
      return;
    }
    if (this.r < 7) this.r = Math.min(7, this.r + 0.15);
    const lv = g.level;
    if (this.fuse) {
      if (--this.fuse === 0) { this.boom(g); return; }
      if (this.fuse % (this.fuse < 30 ? 6 : 15) === 0) Sound.play('tick');
      this.vx *= 0.97; this.vy = this.vy * 0.95 - 0.02;   // shoved along, slowing, and floating up
      if (sweepX(lv, this, this.vx)) this.vx = -this.vx * 0.6;
      if (sweepY(lv, this, this.vy)) this.vy = -this.vy * 0.6;
    } else {          // bobbing on the spot, drifting back home
      this.x += (this.hx - this.x) * 0.02; this.y += (this.hy + Math.sin(this.t * 0.04) * 4 - this.y) * 0.05;
    }
  }
  boom(g) {
    const cx = this.cx, cy = this.cy, p = g.player;
    this.gone = FIZZ_REGROW; this.fuse = 0; this.x = -999;
    Sound.play('fart'); Sound.play('blast');
    for (let i = 0; i < 26; i++) {
      const a = rand(0, Math.PI * 2), s = rand(0.6, 2.6);
      g.particles.push({ kind: 'px', x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.3, drag: 0.92, life: 40 + rand(0, 25), t: 0, color: ['#b8e05a', '#8ab83a', '#e8ff9a', '#6a8a2a'][i % 4], size: 3 + (i % 3) });
    }
    for (const e of g.entities) {
      if (e === this || e.dead || e.remove) continue;
      const b = e.hitbox && e.hitbox();
      if (e instanceof GristlePlug) { if (e.near(cx, cy, FIZZ_R + 8)) e.burst(g); continue; }
      if (!b) continue;
      const d = Math.hypot(b.x + b.w / 2 - cx, b.y + b.h / 2 - cy);
      if (d > FIZZ_R + Math.max(b.w, b.h) / 2) continue;
      if (e instanceof Fizzbag) { if (!e.fuse) { e.fuse = 12; } continue; }   // a chain reaction
      if (e.passive || e.bossHazard || e instanceof Prickle || e instanceof Fuzzling) continue;
      e.flipKill(g, Math.sign(b.x + b.w / 2 - cx) || 1); g.addScore(500, e.cx, e.y);
    }
    if (p.state === 'play' && Math.hypot(p.x + p.w / 2 - cx, p.y + p.h / 2 - cy) < FIZZ_HURT + p.h / 2) g.hurtPlayer();
  }

  draw(ctx) {
    if (this.gone) return;
    const cx = Math.round(this.cx), cy = Math.round(this.cy), t = this.t;
    const swell = this.fuse ? (1 - this.fuse / FIZZ_FUSE) * 4 : 0, r = Math.round(this.r + swell + Math.sin(t * 0.08) * 0.6);
    if (r < 2) { gutEllipse(ctx, cx, cy, Math.max(1, r), Math.max(1, r), '#c8e070'); return; }
    const hot = this.fuse && (this.fuse < 30 ? (t >> 1) & 1 : (t >> 3) & 1);
    // a bubble of gut gas: murky green inside, the swirl of the gas itself, a thin oily film round it shimmering with
    // colour, and the window-shaped shine on its top
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const q = 1 - (dx * dx + dy * dy) / (r * r);
      if (q < 0) continue;
      const nz = Math.sqrt(q), a = Math.atan2(dy, dx), x = cx + dx, y = cy + dy;
      if (nz < 0.42) {   // the film, seen edge-on: thin-film colours sliding round it
        const hue = (a * 2 + t * 0.05 + (1 - nz) * 4) % (Math.PI * 2);
        const film = ['#a8d060', '#d8d070', '#e0a090', '#a8a0d8', '#80c8b0', '#c8e070'][Math.floor((hue + Math.PI * 2) / (Math.PI / 3)) % 6];
        ctx.globalAlpha = hot ? 1 : 0.85; ctx.fillStyle = hot ? '#fff0c0' : film; ctx.fillRect(x, y, 1, 1);
        continue;
      }
      const swirl = Math.sin(a * 3 + Math.hypot(dx, dy) * 0.9 - t * 0.06) > 0.55;
      ctx.globalAlpha = hot ? 0.75 : 0.32 + (dy > 0 ? 0.12 : 0) + (swirl ? 0.12 : 0);
      ctx.fillStyle = hot ? '#ffd890' : swirl ? '#c8e070' : '#7a9a3a'; ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = INK;   // its outline, faint where the film is thinnest
    for (let k = 0; k < r * 7; k++) { const a = k / (r * 7) * Math.PI * 2; if (Math.sin(a + t * 0.02) < 0.6) ctx.fillRect(Math.round(cx + Math.cos(a) * (r + 0.6)), Math.round(cy + Math.sin(a) * (r + 0.6)), 1, 1); }
    ctx.fillStyle = '#ffffff';   // the shine: a curved window top left, a small one opposite
    for (let k = 0; k < 5; k++) { const a = -2.3 + k * 0.16; ctx.fillRect(Math.round(cx + Math.cos(a) * (r - 2.5)), Math.round(cy + Math.sin(a) * (r - 2.5)), 1, 1); }
    ctx.fillRect(Math.round(cx - r * 0.45), Math.round(cy - r * 0.35), 2, 1); ctx.fillRect(cx + Math.round(r * 0.45), cy + Math.round(r * 0.5), 1, 1);
    // tiny bubbles still fizzing up inside, and the whiff curling off its top
    ctx.fillStyle = '#e8ffb0';
    for (let k = 0; k < 4; k++) ctx.fillRect(Math.round(cx + Math.sin(k * 2.1 + t * 0.03) * (r - 3)), Math.round(cy + r - 2 - ((t * 0.3 + k * 5) % (r * 2 - 3))), 1, 1);
    for (const sx of [-3, 3]) for (let k = 0; k < 7; k++) {
      const py = cy - r - 3 - k - ((t >> 2) % 3); ctx.globalAlpha = 0.55 * (1 - k / 7); ctx.fillStyle = '#b8d870';
      ctx.fillRect(Math.round(cx + sx + Math.sin(k * 0.9 + t * 0.1 + sx) * 1.5), py, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

// ── PLOPSTONE ───────────────────────────────────────────────────────────────
const PLOP_ROLL = 2.6, PLOP_DAZE = 150;
class Plopstone extends Enemy {
  constructor(col, row) {
    super(col * TILE, (row + 1) * TILE - 14, 16, 14);
    this.vx = -0.35; this.walker = true; this.state = 'walk'; this.timer = 0; this.hits = 0; this.spin = 0;
    this.stompable = false; this.fireKill = false; this.shellKill = false; this.bumpKill = false;
  }
  update(g) {
    this.t++; this.timer++;
    const p = g.player;
    if (this.state === 'walk') {
      this.walk(g, true);
      // he's on its level, out in front of it: curl up and come at him
      const front = (p.x + p.w / 2 - this.cx) * Math.sign(this.vx || -1) > 0;
      if (this.timer > 60 && p.state === 'play' && front && Math.abs(p.y + p.h - (this.y + this.h)) < 12 && Math.abs(p.x - this.x) < 9 * TILE) {
        this.state = 'curl'; this.timer = 0; this.dir = towardP(g, this); this.vx = 0; Sound.play('creak');
      }
    } else if (this.state === 'curl') {
      this.vx = 0; this.walk(g, false);
      if (this.timer > 22) { this.state = 'roll'; this.timer = 0; this.hits = 0; this.vx = this.dir * PLOP_ROLL; Sound.play('roll'); }
    } else if (this.state === 'roll') {
      const was = this.vx;
      this.walk(g, false);
      this.spin += this.vx * 0.25;
      if (this.timer % 6 === 0) g.dust(this.cx, this.y + this.h, 1);
      if (Math.sign(this.vx) !== Math.sign(was)) {   // hit a wall
        this.hits++;
        Sound.play('thud'); g.dust(this.cx + Math.sign(was) * 8, this.y + this.h / 2, 4);
        if (this.hits >= 2) { this.state = 'dazed'; this.timer = 0; this.vx = 0; this.vy = -3; }
        else this.vx = -was * 0.9;
      }
    } else if (this.state === 'dazed') {
      this.vx = 0; this.walk(g, false);
      if (this.timer > PLOP_DAZE) { this.state = 'walk'; this.timer = 0; this.vx = towardP(g, this) * 0.35; }
    }
  }
  onTouch(g, p) {
    const stomp = g.isStomp(p, this);
    if (this.state === 'dazed') {
      if (stomp) { this.flipKill(g, 0); g.bounce(p); g.stompScore(this); Sound.play('break'); g.burst(this.cx, this.y + 6, ['#a8987a', '#d8c8a0', '#6a5a40'], 12); }
      else { this.vx = 0; }   // (bumping into it while it's out cold is harmless)
      return;
    }
    if (stomp) {   // no use stomping a stone
      g.bounce(p); p.vx = (p.x + p.w / 2 < this.cx ? -1 : 1) * 1.2; Sound.play('bump');
      return;
    }
    g.hurtPlayer();
  }

  draw(ctx) {
    const cx = Math.round(this.cx), b = Math.round(this.y + this.h), t = this.t;
    if (this.state === 'roll' || this.state === 'curl') {   // curled up tight: a lumpy ball of stone, turning as it rolls
      const k = ((Math.round(this.spin / (Math.PI / 4)) % 8) + 8) % 8, spr = gsStone('plopr' + k, 16, 16, k * Math.PI / 4, false);
      gsDraw(ctx, spr, cx, b, 8, 16, false);
      if (this.state === 'curl') this.drawBeetle(ctx, cx + this.dir * 6, b - 4, this.dir, t, true);
      return;
    }
    const dazed = this.state === 'dazed', f = this.vx < 0 ? -1 : this.vx > 0 ? 1 : (this.f || -1);
    this.f = f;
    const spr = gsStone('plopw', 22, 15, 0, false);
    if (dazed) {   // knocked onto its back: legs waving in the air, stars going round
      ctx.save(); ctx.translate(0, b * 2 - 13); ctx.scale(1, -1);
      gsDraw(ctx, spr, cx, b, 11, 15, f < 0); this.drawLegs(ctx, cx, b, f, t, true);
      ctx.restore();
      for (let k = 0; k < 3; k++) { const a = t * 0.15 + k * 2.1; ctx.fillStyle = '#ffe14a'; ctx.fillRect(Math.round(cx + Math.cos(a) * 9), Math.round(b - 16 + Math.sin(a) * 2), 2, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(cx + Math.cos(a) * 9), Math.round(b - 16 + Math.sin(a) * 2), 1, 1); }
      return;
    }
    this.drawLegs(ctx, cx, b, f, t, false);
    gsDraw(ctx, spr, cx, b - 2, 11, 15, f < 0);
    this.drawBeetle(ctx, cx + f * 9, b - 5, f, t, false);
  }
  // the beetle grub that lives inside it and carries it about: three pairs of jointed, spiny legs...
  drawLegs(ctx, cx, b, f, t, wave) {
    for (let k = 0; k < 3; k++) {
      const lx = cx + f * (4 - k * 4), step = wave ? Math.sin(t * 0.4 + k * 2) * 2 : Math.sin(t * 0.25 + k * 2.1) * 1.5;
      const kx = Math.round(lx + f * 1 + step), fx = Math.round(lx + f * 2 + step * 1.4);
      ctx.fillStyle = '#140c06'; ctx.fillRect(Math.min(lx, kx) - 1, b - 5, Math.abs(kx - lx) + 3, 3); ctx.fillRect(Math.min(kx, fx) - 1, b - 3, Math.abs(fx - kx) + 3, 4);
      ctx.fillStyle = '#5a3a22'; ctx.fillRect(Math.min(lx, kx), b - 4, Math.abs(kx - lx) + 1, 1);
      ctx.fillStyle = '#3a2414'; ctx.fillRect(Math.min(kx, fx), b - 2, Math.abs(fx - kx) + 1, 2);
      ctx.fillStyle = '#8a6a48'; ctx.fillRect(kx, b - 4, 1, 1); ctx.fillRect(fx + f, b - 1, 1, 1);   // a joint's shine, a spur
    }
  }
  // ...and its head peeking out from under the front: a glossy black head capsule, curved mandibles, clubbed antennae
  drawBeetle(ctx, hx, hy, f, t, tucked) {
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(f > 0 ? hx + x : hx - x - w + 1), Math.round(hy + y), w, h); };
    R(-2, -3, 6, 6, '#0c0806'); R(-1, -2, 4, 4, '#2a1a10'); R(0, -2, 2, 1, '#6a5038'); R(0, -1, 1, 1, '#a08060');
    if (tucked) return;
    const nib = (t >> 3) & 1;
    R(3, 1, 2, 1, '#0c0806'); R(4, 1 + nib, 2, 1, '#3a2414'); R(3, 2, 1, 1, '#0c0806');   // mandibles, working
    const aw = Math.round(Math.sin(t * 0.12) * 1.2);
    R(2, -4, 1, 1, '#2a1a10'); R(3, -5 + aw, 1, 1, '#2a1a10'); R(4, -6 + aw, 2, 2, '#5a4030'); R(4, -6 + aw, 1, 1, '#8a6a48');   // a clubbed antenna
    R(1, -1, 1, 1, '#ffffff');   // its eye, catching the light
  }
}

// ── PARASITIC WORM ──────────────────────────────────────────────────────────
const WORM_WIND = 10, WORM_HOLD = 34, WORM_RECOIL = 70;   // a bite: rear up and open wide, snap shut and hang on, let go and slink away
class ParasiticWorm extends Enemy {
  constructor(col, row, dir = -1, wallSide = null) {
    super(col * TILE, (row + 1) * TILE - 10, 30, 10);
    this.dir = dir < 0 ? -1 : 1;
    this.vx = this.dir * 0.55; this.walker = true;
    if(wallSide){
      const left=wallSide==='left',edge=(left?78:97)*TILE,sd=left?1:-1;
      const startX=this.x+15,points=[[startX,27]],cx=edge-sd*15;
      points.push([cx,27]);
      for(let i=1;i<=16;i++){const a=-Math.PI/2+sd*i*Math.PI/32;points.push([cx+20*Math.cos(a),47+20*Math.sin(a)]);}
      // The left worm settles on the flesh terrace; the right on the higher bone shelf.
      const turnY=left?119:87;
      points.push([edge+sd*5,turnY]);
      const bx=edge+sd*25;
      for(let i=1;i<=16;i++){const a=left?Math.PI-i*Math.PI/32:i*Math.PI/32;points.push([bx+20*Math.cos(a),turnY+20*Math.sin(a)]);}
      this.wallRoute=points;this.wallStep=1;this.wallX=startX;this.wallY=27;this.wallAngle=left?0:Math.PI;this.walker=false;
    }
    this.bite = 0; this.rear = 0;   // bite: frames into a bite (0 = none); rear: how far its head is lifted (radians)
  }
  // while it's biting or slinking off it can't hurt him again
  touches(p) { return this.bite === 0 && !this.dead && super.touches(p); }
  onTouch(g, p) {
    if (this.dead || this.bite > 0) return;
    if (g.isStomp(p, this)) { this.stomp(g, p); return; }
    this.bite = 1; this.dir = p.x + p.w / 2 < this.cx ? -1 : 1; this.vx = 0;   // it turns to him and rears up to bite
    this.target = p;
  }
  update(g) {
    this.t++;
    if(this.wallRoute){this.crawlWall(g);return;}
    if (this.bite > 0) { this.updateBite(g); return; }
    // A contraction travels from tail to mouth; its little surge drives the crawl.
    this.vx = this.dir * (0.45 + (1 + Math.sin(this.t * Math.PI * 2 / GS_WORM_FRAMES)) * 0.17);
    this.walk(g, true);
    this.dir = Math.sign(this.vx) || this.dir;
    this.rear *= 0.7;
  }
  crawlWall(g){
    if(this.bite>0){if(++this.bite===WORM_WIND){g.hurtPlayer();Sound.play('spike');}if(this.bite>WORM_RECOIL)this.bite=0;return;}
    let distance=this.wallParked?0:.26+(1+Math.sin(this.t*.08))*.05;
    while(distance>0&&this.wallStep<this.wallRoute.length){
      const [tx,ty]=this.wallRoute[this.wallStep],dx=tx-this.wallX,dy=ty-this.wallY,len=Math.hypot(dx,dy),step=Math.min(distance,len);
      if(len>.001){this.wallX+=dx/len*step;this.wallY+=dy/len*step;const angle=Math.atan2(dy,dx);this.wallAngle+=Math.atan2(Math.sin(angle-this.wallAngle),Math.cos(angle-this.wallAngle))*.35;}
      distance-=step;if(step>=len-.001)this.wallStep++;else break;
    }
    if(this.wallStep>=this.wallRoute.length){
      this.wallParked=true;this.wallAngle=Math.cos(this.wallAngle)>=0?0:Math.PI;
    }
    const c=Math.abs(Math.cos(this.wallAngle)),ss=Math.abs(Math.sin(this.wallAngle));this.w=30*c+10*ss;this.h=30*ss+10*c;
    this.x=this.wallX-this.w/2;this.y=this.wallY-this.h/2;this.vx=0;this.vy=0;
  }
  updateBite(g) {
    const p = this.target, b = ++this.bite;
    if (b <= WORM_HOLD) {
      this.vx = 0;
      // its head lifts to wherever he is and stays on him
      const tx = p.x + p.w / 2, ty = p.y + p.h * 0.55, px = this.cx - this.dir * 9, py = this.y + this.h;
      const want = clamp(Math.atan2(py - ty, Math.max(4, Math.abs(tx - px))), 0.15, 1.15);
      this.rear += (want - this.rear) * 0.3;
      if (b <= WORM_WIND) p.vx *= 0.6;
      if (b === WORM_WIND) {   // the snap: a tiny pair of fangs, a nip of a bite
        g.hurtPlayer(); Sound.play('spike');
        g.burst(this.cx + this.dir * 12, this.y - 2, ['#ffffff', '#db4a60'], 4);
      }
    } else if (b === WORM_HOLD + 1) { this.dir = -this.dir; this.rear = 0; }   // lets go, and slinks away from him
    else if (b <= WORM_RECOIL) {
      this.vx = this.dir * 0.9; this.walk(g, true); this.dir = Math.sign(this.vx) || this.dir; this.rear *= 0.6;
    } else this.bite = 0;
  }
  stomp(g, p) {
    this.dead = true; this.squashed = true; this.deadT = 0; this.vx = 0;
    this.burstDeath(g);
    g.bounce(p); g.stompScore(this); Sound.play('stomp');
    g.burst(this.cx, this.y + this.h - 2, ['#efcf9c', '#ad7264', '#db4a60'], 5);
  }
  draw(ctx) {
    const frame = this.t % GS_WORM_FRAMES;
    if(this.wallRoute&&!this.squashed){ctx.save();ctx.translate(this.wallX,this.wallY);ctx.rotate(this.wallAngle);gsDraw(ctx,gsWorm(frame),0,5,18,14,false,true);ctx.restore();return;}
    if (this.squashed) {
      ctx.save(); ctx.translate(Math.round(this.cx), Math.round(this.y + this.h));
      ctx.scale(1.12, 0.25);
      gsDraw(ctx, gsWorm(frame), 0, 0, 18, 14, this.dir < 0,true);
      ctx.restore();
    } else if (this.rear > 0.05) {
      // rearing: the body pivots on its tail, head up, little fangs working at the tip
      const d = this.dir, chew = this.bite > 0 && this.bite <= WORM_WIND ? 1 : this.bite > WORM_WIND && this.bite <= WORM_HOLD ? (this.bite >> 1) % 2 : 0;
      ctx.save(); ctx.translate(Math.round(this.cx - d * 9), Math.round(this.y + this.h));
      ctx.rotate(d > 0 ? -this.rear : this.rear);
      gsDraw(ctx, gsWorm(frame), d * 9, 0, 18, 14, d < 0,true);
      const open = this.bite <= WORM_WIND || chew === 1;
      for (const [fy, dn] of [[open ? -11 : -8, 1], [open ? -5 : -7, -1]]) fPoly(ctx, [[d * 18 - 0.6, fy + (dn < 0 ? 2 : 0)], [d * 18 + 0.6, fy + (dn < 0 ? 2 : 0)], [d * 18 + d * 0.2, fy + (dn < 0 ? 0 : 2)]], '#fff5d2');   // little fangs (fine)
      ctx.restore();
    } else {
      gsDraw(ctx, gsWorm(frame), this.cx, this.y + this.h, 18, 14, this.dir < 0,true);
    }
  }
}

// ── PLASTIC BAG ─────────────────────────────────────────────────────────────
// Old and brittle from the acid: harmless to touch, and landing on it gives a stomp bounce as it shreds.
const BAG_PULSE = 70;
class PlasticBag extends Enemy {
  constructor(col, row, mode = null) {
    super(col * TILE, row * TILE, 28, 24);
    this.flakes = null;
    this.mode = mode; this.homeY = this.y;   // mode 'up': pulses straight upward out of its opening, like a jellyfish rising, and sinks back between strokes
    this.stompable = true; this.fireKill = true; this.shellKill = true; this.bumpKill = false;
  }
  hitbox() { return { x: this.x + 2, y: this.y + 2, w: this.w - 4, h: this.h - 2 }; }
  update(g) {
    this.t++;
    const p = g.player, f = this.t % BAG_PULSE;
    if (this.mode === 'up') {
      if (f === 0 && this.y > this.homeY - 72) this.vy = -1.25;
      this.vx += clamp((p.x + p.w / 2 - this.cx) * 0.0005, -0.01, 0.01);
      this.vx *= 0.97; this.vy = this.vy * 0.975 + 0.007;
      this.x += this.vx; this.y = Math.min(this.y + this.vy, this.homeY);
      return;
    }
    // a jellyfish's stroke: puff out, then squeeze, and glide after him
    if (f === 0 && p.state === 'play' && Math.abs(p.x - this.x) < VIEW_W * 0.7) {
      const dx = p.x + p.w / 2 - this.cx, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
      this.vx = dx / d * 1.1; this.vy = dy / d * 1.1 - 0.3;
    }
    this.vx *= 0.975; this.vy = this.vy * 0.975 + 0.004;
    this.x += this.vx; this.y += this.vy;
    this.y = clamp(this.y, 2, VIEW_H - this.h - 8);
  }
  onTouch(g, p) {
    if (this.dead) return;
    if (g.isStomp(p, this)) { this.stomp(g, p); return; }
    this.shred(g, p.x + p.w / 2 < this.cx ? 1 : -1);
    g.addScore(100, this.cx, this.y);
  }
  flipKill(g, dir) { this.shred(g, dir); }
  // it falls to bits: a dozen flakes of plastic, fluttering down like leaves
  shred(g, dir) {
    if (this.dead) return;
    this.dead = true; this.deadT = 0;
    this.flakes = Array.from({ length: 12 }, (_, i) => ({
      x: this.x + 3 + (i % 4) * 6 + rand(-1, 1), y: this.y + 2 + Math.floor(i / 4) * 6, vx: dir * rand(0.3, 1.2) + rand(-0.6, 0.6), vy: rand(-1.4, -0.2),
      w: 2 + (i % 3), h: 1 + (i % 2), ph: rand(0, 6),
    }));
    Sound.play('rustle'); Sound.play('crack');
  }
  updateDead() {
    if (!this.flakes) return;   // (frozen in ice, not shredded)
    this.deadT++;
    for (const k of this.flakes) {
      k.vx *= 0.96; k.vy = Math.min(k.vy + 0.04, 0.5);
      k.x += k.vx + Math.sin(this.deadT * 0.12 + k.ph) * 0.4; k.y += k.vy;
    }
    if (this.deadT > 150) this.remove = true;
  }

  draw(ctx) {
    if (this.dead && this.flakes) {   // shredded: flakes of film tumbling down, flashing as they turn
      ctx.globalAlpha = Math.min(1, (150 - this.deadT) / 40);
      for (const k of this.flakes) {
        const tip = Math.sin(this.deadT * 0.2 + k.ph);
        const kh = Math.max(0.5, Math.abs(tip) * k.h);   // (turning in fine pixels)
        fRoundRect(ctx, k.x - 0.6, k.y + (k.h - kh) / 2 - 0.6, k.w + 1.2, kh + 1.2, 0.6, '#6e7280');
        fRoundRect(ctx, k.x, k.y + (k.h - kh) / 2, k.w, kh, 0.4, tip > 0.6 ? '#ffffff' : tip > -0.3 ? '#dcdee4' : '#a8acb6');
      }
      ctx.globalAlpha = 1;
      return;
    }
    const spr = gsBag(Math.floor((this.t % BAG_PULSE) / BAG_PULSE * 8));
    ctx.drawImage(spr, Math.round(this.x - 2), Math.round(this.y - 2));
  }
}

// ── SQUATTER ────────────────────────────────────────────────────────────────
// A Shellback in all but looks: walks, hides when stomped, then the tin can be kicked, carried and thrown
class Squatter extends Shellback {
  constructor(col, row) { super(col, row); this.vx = -0.5; }
  shatter(g) {   // a kicked tin that's rolled itself out: it bursts open, beans everywhere
    this.dead = this.remove = true;
    g.burst(this.cx, this.y + this.h / 2, ['#c8501e', '#b8c0c8', '#ffffff'], 14);
    Sound.play('break');
  }


  draw(ctx) {
    const cx = Math.round(this.cx), b = Math.round(this.y + this.h), t = this.t;
    const hiding = this.state !== 'walk', f = this.vx < 0 ? -1 : this.vx > 0 ? 1 : (this.f || -1);
    if (!hiding) this.f = f;
    drawFlipped(ctx, this, () => {
      const roll = this.state === 'slide' || this.state === 'toss';
      const shake = hiding && this.shellT > 380 ? ((t >> 1) & 1) * 2 - 1 : 0;
      this.turn = (this.turn || 0) + (roll ? Math.abs(this.vx) * 0.05 : 0);
      const tin = gsTin(roll ? this.turn % 1 : 0);
      gsDraw(ctx, tin, cx + shake - f * 2, b + 1, 10, 14, f < 0);
      if (roll) return;
      const ox = cx + shake + f * 6;   // the tin's open end
      if (hiding && this.shellT <= 300) { gsDraw(ctx, gsCrab(0, true), ox, b + 1, 0, 18, f < 0); return; }   // tucked in behind its claw
      const crab = gsCrab(hiding ? 0 : (t >> 3) & 3, false);
      gsDraw(ctx, crab, ox, b + 1, 0, 18, f < 0);
      if (hiding) return;
      ctx.strokeStyle = '#d8502a'; ctx.lineWidth = 0.45;   // its feelers, long and twitchy (fine strokes: hires.js)
      ctx.beginPath(); for (let j = 0; j <= 10; j += 0.5) ctx.lineTo(ox + f * (6 + j), b - 12.5 - j * 0.5 + Math.sin(t * 0.2 + j * 0.5) * j * 0.12); ctx.stroke();
      ctx.beginPath(); for (let j = 0; j <= 7; j += 0.5) ctx.lineTo(ox + f * (7 + j), b - 11.5 - j * 0.25 + Math.sin(t * 0.25 + j) * j * 0.1); ctx.stroke();
    });
  }
}

// ── GRISTLE PLUG ────────────────────────────────────────────────────────────
class GristlePlug extends Enemy {
  constructor(col, r0, r1, w = 2) {
    super(col * TILE, r0 * TILE, w * TILE, (r1 - r0 + 1) * TILE);
    this.col = col; this.r0 = r0; this.r1 = r1; this.n = w; this.set = false;
    this.passive = true; this.behindTiles = false;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  fill(g, t) { for (let r = this.r0; r <= this.r1; r++) for (let c = this.col; c < this.col + this.n; c++) g.level.set(c, r, t); }
  near(x, y, d) { return x > this.x - d && x < this.x + this.w + d && y > this.y - d && y < this.y + this.h + d; }
  burst(g) {
    this.fill(g, T.EMPTY); this.remove = true;
    for (let i = 0; i < 24; i++) g.particles.push({ kind: 'px', x: this.x + rand(0, this.w), y: this.y + rand(0, this.h), vx: rand(-2, 2), vy: rand(-3, 0), g: 0.18, life: 50, t: 0, color: ['#f2e8d2', '#e8a0a8', '#c4b292', '#ffffff'][i % 4], size: 2 + (i % 2) });
    Sound.play('break');
  }
  update(g) { this.t++; if (!this.set) { this.fill(g, T.BODY); this.set = true; } }
  draw(ctx) {
    // a wad of gristle jammed in the hole: lumpy, rubbery and pale, with swallowed fish bones poking out of it
    const x = this.x, y = this.y, w = this.w, h = this.h, cx = x + w / 2;
    const lumps = [[0.3, 0.3, 0.38, 0.4], [0.72, 0.28, 0.36, 0.36], [0.5, 0.62, 0.48, 0.42], [0.2, 0.78, 0.3, 0.28], [0.8, 0.8, 0.3, 0.3]];
    for (const pass of [0, 1, 2]) for (const [u, v, rw, rh] of lumps) {
      const lx = x + u * w, ly = y + v * h, rx = Math.round(rw * w), ry = Math.round(rh * h);
      if (pass === 0) gutEllipse(ctx, lx, ly, rx + 1, ry + 1, '#3a1a16');
      else if (pass === 1) gutEllipse(ctx, lx, ly, rx, ry, '#d8a0a0');
      else { gutEllipse(ctx, lx - 1, ly - 2, Math.max(1, rx - 3), Math.max(1, ry - 3), '#f0c8c0'); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(lx - rx / 2), Math.round(ly - ry / 2), 2, 1); }
    }
    for (const [bx, by, d] of [[0.15, 0.35, 1], [0.6, 0.7, -1], [0.45, 0.15, 1]]) {   // the bones
      const px = Math.round(x + bx * w), py = Math.round(y + by * h);
      ctx.fillStyle = '#3a1a16'; ctx.fillRect(px - 1, py - 1, 12, 3);
      ctx.fillStyle = '#f2e8d2'; ctx.fillRect(px, py, 10, 1); for (let k = 2; k < 10; k += 3) ctx.fillRect(px + k, py - 1 + (d > 0 ? 0 : 2), 1, 1);
    }
    ctx.fillStyle = '#a86070'; ctx.fillRect(Math.round(cx - 3), Math.round(y + h * 0.45), 6, 1);
  }
}

// their 1x drawings, lifted to the fine screen look by look (hires.js)
liftDraws(Prickle, [14, 16, 14, 10], null, e => {
  const d = e.dir, L = Math.round(4 + (PRICKLE_LEN - 4) * e.ext), jx = e.shaking ? ((e.t >> 1) & 1) * d : 0;
  return 'prickle:' + d + ':' + L + ':' + jx + ':' + (e.shaking ? 1 : 0);
});
liftDraws(SaltShot, [6, 6, 6, 6], null, e => 'salt:' + ((e.t >> 2) & 1) + ':' + ((e.t >> 1) % 5 === 0 ? 1 : 0));
liftDraws(Fizzbag, [16, 18, 16, 10], e => !e.gone, e => {
  const swell = e.fuse ? (1 - e.fuse / FIZZ_FUSE) * 4 : 0, r = Math.round(e.r + swell + Math.sin(e.t * 0.08) * 0.6);
  const hot = e.fuse && (e.fuse < 30 ? (e.t >> 1) & 1 : (e.t >> 3) & 1) ? 1 : 0;
  return 'fizz:' + r + ':' + hot + ':' + (e.t % 60);
});
liftDraws(GristlePlug, [6, 6, 6, 6], null, e => 'plug:' + e.w + 'x' + e.h);
