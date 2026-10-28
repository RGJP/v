'use strict';
// Midnight Clockworks set pieces (2-3). A clock town at five to midnight, where everything runs on springs:
//   Cuckoo     KOOKOO, the Great Clock's cuckoo, who has overslept on the one night of the year he has to
//              call midnight. He pops out of cuckoo clocks all over town to fret at Chickaroo; on a clock
//              with a `reach` his perch shoots out on a lattice arm, a bridge for as long as he's calling
//   Alarm      an alarm clock asleep on its feet. Come close and it goes off (RIIING!) and hops after you;
//              stomp it to hit SNOOZE, and then its button is a springboard until it goes off again
//   Windup     a tin mouse: winds itself up, zooms off, runs down, winds itself up again
//   Jack       a jack-in-the-box: stand on the lid and the crank plays "Pop Goes the Weasel"... POP!
//              (the launch is not a jump, so the broken clock doesn't notice)
//   ToyTrain   a wind-up train on a toy track over the void: stand on it and tap run to wind it up
//   Stopwatch  the Master Stopwatch: touch it and time stops for everyone but Chickaroo (Game.stopTime)
//   Gearfall   a cascade of falling cogs pouring through a gap; ride them down -- or stop time and walk on them
//   Tinbirds   a flock of clockwork birds flying through, a stomp-bridge for anyone quick (or with a stopwatch)
//   ClockFace  a great clock face whose hands really turn: stand on a hand and ride it round (ClockHand)
//   Mainspring where the clock breaks: SPROING!

const KOOKOO_VOICE = { speakerName: 'KOOKOO', remove: true };   // Kookoo heard from off-screen (no marker over anyone)
const KOOKOO_COL = '#ffd166';
const onScreen = (g, x, w = 0) => x + w > g.camX - 16 && x < g.camX + VIEW_W + 16;

// a brass cog (centre cx, cy; radius r to the roots of its teeth), turned by a
const BRASS_COG_CACHE = new Map();
function brassCog(ctx, cx, cy, r, a, teeth = 10, pal = ['#ffe08a', '#d8a040', '#8a5a1a']) {
  const [l, b, d] = pal;
  if (ctx.getTransform && Math.abs(ctx.getTransform().a) >= 2) {   // on the fine screen: smooth teeth, a lit rim, three spokes (baked per angle step)
    const step = ((Math.round(a * 24) % 151) + 151) % 151;
    const key = r + ':' + teeth + ':' + l + ':' + step;
    let img = BRASS_COG_CACHE.get(key);
    if (!img) {
      const pad = Math.ceil(r + 5), sz = pad * 2, hc = makeHiCanvas(sz, sz), g = hc.getContext('2d');
      const qa = step / 24;
      const tooth = (col, grow) => { for (let i = 0; i < teeth; i++) { const ang = qa + i * Math.PI * 2 / teeth, c = Math.cos(ang), sn = Math.sin(ang), w = Math.min(1.8, Math.PI * r / teeth * 0.42) + grow, ux = -sn * w, uy = c * w; fPoly(g, [[pad + c * (r - 1) + ux, pad + sn * (r - 1) + uy], [pad + c * (r + 2.6 + grow) + ux * 0.75, pad + sn * (r + 2.6 + grow) + uy * 0.75], [pad + c * (r + 2.6 + grow) - ux * 0.75, pad + sn * (r + 2.6 + grow) - uy * 0.75], [pad + c * (r - 1) - ux, pad + sn * (r - 1) - uy]], col); } };
      tooth(INK, 0.7); fBlob(g, pad, pad, r + 0.8, INK);
      tooth(d, 0); fBlob(g, pad, pad, r, d); fBlob(g, pad - 0.5, pad - 0.5, r - 0.8, b); fBlob(g, pad - r * 0.35, pad - r * 0.35, Math.max(1, r * 0.3), l);
      fBlob(g, pad, pad, r * 0.55, d); fBlob(g, pad, pad, r * 0.45, '#3a2a20');
      for (let i = 0; i < 3; i++) { const ang = qa + i * Math.PI * 2 / 3; fLine(g, pad, pad, pad + Math.cos(ang) * r * 0.5, pad + Math.sin(ang) * r * 0.5, b, 4); }
      fBlob(g, pad, pad, Math.max(1, r * 0.18), l);
      img = { hc, pad };
      BRASS_COG_CACHE.set(key, img);
    }
    ctx.drawImage(img.hc, fSnap(cx - img.pad), fSnap(cy - img.pad));
    return;
  }
  const tooth = (col, s) => {
    ctx.fillStyle = col;
    for (let i = 0; i < teeth; i++) {
      const ang = a + i * Math.PI * 2 / teeth;
      for (let k = 0; k < 3; k++) ctx.fillRect(Math.round(cx + Math.cos(ang) * (r + k) - s / 2), Math.round(cy + Math.sin(ang) * (r + k) - s / 2), s, s);
    }
  };
  tooth(INK, 5); blob(ctx, cx, cy, r + 1, INK);
  tooth(d, 3); blob(ctx, cx, cy, r, d); blob(ctx, cx - 1, cy - 1, r - 1, b); blob(ctx, cx - Math.round(r * 0.35), cy - Math.round(r * 0.35), Math.max(1, Math.round(r * 0.3)), l);
  blob(ctx, cx, cy, Math.round(r * 0.55), d); blob(ctx, cx, cy, Math.round(r * 0.45), '#3a2a20');
  ctx.fillStyle = b;
  for (let i = 0; i < 3; i++) {
    const ang = a * 1 + i * Math.PI * 2 / 3;
    for (let k = 0; k < r * 0.5; k += 1.5) ctx.fillRect(Math.round(cx + Math.cos(ang) * k - 1), Math.round(cy + Math.sin(ang) * k - 1), 2, 2);
  }
  blob(ctx, cx, cy, Math.max(1, Math.round(r * 0.18)), l);
}

// ---------- Cuckoo (KOOKOO) -------------------------------------------------------------------
// A cuckoo clock on a carved post, standing on the ground of `row`. Options (all optional):
//   say: [line, line, ...]  said one after another when Chickaroo comes near (a line can be a list: one at random)
//   hold: true              those lines are real dialogue (play waits for them)
//   near: tiles             how close Chickaroo has to come for them (default 7)
//   reach, dir, period, phase, out   a bridge clock: every `period` frames the bird shoots out `reach` tiles
//                           toward `dir` and calls for `out` frames (default 100); its arm is a bridge while it's out
//   quip: [lines]           something he says the first time he pops out with Chickaroo nearby
const CUCKOO_OPEN = 8, CUCKOO_OUT = 12, CUCKOO_HOLD = 100, CUCKOO_BACK = 44, CUCKOO_TALK_EXT = 13;
class Cuckoo extends Enemy {
  constructor(col, row, o = {}) {
    super(col * TILE, (row + 1) * TILE - 48, 32, 48);
    this.o = o; this.dir = o.dir || 1; this.reach = (o.reach || 0) * TILE; this.period = o.period || 240;
    this.k = Math.round((o.phase || 0) * this.period);
    this.script = null; this.ext = 0; this.door = 0; this.beak = 0; this.calls = 0; this.quipped = false;
    this.friendly = this.passive = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  get doorX() { return this.x + 16; }
  get doorY() { return this.y + 11; }
  get birdX() { return this.doorX + this.dir * this.ext; }
  hitbox() { return null; }
  // the house, and the arm and bird out to wherever they've reached (a long bridge goes far past the house)
  viewSpan() { const bx = this.birdX; return [Math.min(this.x - 4, bx - 20), Math.max(this.x + this.w + 4, bx + 20)]; }
  touches() { return false; }
  update(g) {
    this.t++;
    if (this.beak > 0) this.beak--;
    const p = g.player, near = Math.abs(p.x + p.w / 2 - this.doorX) < (this.o.near || 7) * TILE;
    if (this.reach && !this.perch) {   // the arm and the bird: a bridge while it's out (a platform, like the chef's pan)
      const pc = this.perch = { x: 0, y: 0, w: 18, h: 6, dx: 0, dy: 0, prevY: 0, ghost: true, bx: this.birdX, draw() {} };
      pc.update = g => {
        const oy = pc.y, bx = this.birdX, p = g.player;
        pc.x = this.dir > 0 ? this.doorX : bx - 9; pc.w = Math.max(2, Math.abs(bx - this.doorX) + 9); pc.y = this.doorY - 4;
        pc.ghost = this.ext < 12;
        // standing on the bird itself carries him in and out with it; standing on the arm doesn't
        pc.dx = !pc.ghost && p.platform === pc && Math.abs(p.x + p.w / 2 - bx) < 10 ? bx - pc.bx : 0;
        pc.bx = bx; pc.dy = pc.y - oy; pc.prevY = oy;
      };
      pc.update(g); pc.dx = 0; pc.prevY = pc.y;
      g.platforms.push(pc);
    }
    // talking: his lines, one after another, once Chickaroo comes near (once per visit: not again after a respawn)
    if (this.o.say && !this.script && near && p.state === 'play') {
      const seen = g.seenCine || (g.seenCine = new Set()), key = 'kookoo' + this.x;
      this.script = seen.has(key) ? [] : this.o.say.slice();
      seen.add(key);
    }
    if (this.script && this.script.length && !g.saying(this)) {
      g.speak(this, this.script.shift(), KOOKOO_COL, !!this.o.hold);
      this.beak = 30; if (onScreen(g, this.x, this.w)) Sound.play('cuckoo');
    }
    const talking = g.saying(this) || (this.script && this.script.length);
    if (this.reach) this.cycle(g, near);
    else {   // a talking clock: pops out to say his piece, then goes back in
      const want = talking ? CUCKOO_TALK_EXT : 0;
      this.door = clamp(this.door + (talking ? 0.2 : -0.12), 0, 1);
      if (this.door >= 1 || !talking) this.ext += (want - this.ext) * 0.3;
      if (talking && g.dialog && g.dialog.speaker === this && (this.t >> 3) % 2) this.beak = 4;
    }
  }
  // a bridge clock: doors open, the bird shoots out on its lattice arm, calls, and slowly comes home
  cycle(g, near) {
    const k = this.k = (this.k + 1) % this.period, seen = onScreen(g, this.x - 80, this.w + 160);
    const a = CUCKOO_OPEN, b = a + CUCKOO_OUT, c = b + (this.o.out || CUCKOO_HOLD), d = c + CUCKOO_BACK;
    if (k < a) { this.door = k / a; this.ext = 0; }
    else if (k < b) { const u = (k - a) / CUCKOO_OUT; this.door = 1; this.ext = this.reach * (1 - (1 - u) * (1 - u)); if (k === a && seen) Sound.play('sproing'); }
    else if (k < c) {
      this.door = 1; this.ext = this.reach + Math.sin((k - b) * 0.5) * Math.max(0, 3 - (k - b) * 0.2);   // a springy wobble as it stops
      if ((k === b + 4 || k === b + 40) && seen) {
        Sound.play('cuckoo'); this.beak = 22;
        if (k === b + 4 && near && this.o.quip && !this.quipped) {
          const once = g.seenCine || (g.seenCine = new Set()), key = 'kookoo' + this.x;
          this.quipped = true;
          if (!once.has(key)) { once.add(key); g.speak(this, this.o.quip, KOOKOO_COL); }
        }
      }
    } else if (k < d) { const u = (k - c) / CUCKOO_BACK; this.ext = this.reach * (1 - u * u); this.door = 1; }
    else { this.ext = 0; this.door = Math.max(0, this.door - 0.15); }
  }
  draw(ctx, g) {
    ctx.drawImage(cuckooHouseArt(), Math.round(this.x) - 4, Math.round(this.y) - 7);
    const x = this.doorX, y = this.doorY, width = Math.max(0.6, 4 * (1 - this.door));
    for (const side of [-1, 1]) {
      const dx = side < 0 ? x - 4.1 : x + 4.1 - width;
      fRoundRect(ctx, dx, y - 4.2, width, 8, 0.5, '#a37e4c');
      fLine(ctx, dx + 0.4, y - 3.6, dx + 0.4, y + 3.2, '#d8b47b', 1);
      if (width > 1) fBlob(ctx, side < 0 ? dx + width - 0.6 : dx + 0.6, y + 0.8, 0.3, '#f5d58c');
    }
    if (this.ext > 2) this.drawBird(ctx);
  }
  drawBird(ctx) {
    const d = this.dir, bx = fSnap(this.birdX), by = fSnap(this.doorY), sx = fSnap(this.doorX);
    const n = Math.max(2, Math.round(Math.abs(bx - sx) / 7));
    for (let i = 0; i < n; i++) {
      const a = sx + (bx - sx) * i / n, b = sx + (bx - sx) * (i + 1) / n;
      for (const side of [-1, 1]) {
        fLine(ctx, a, by + side * 2.5, b, by - side * 2.5, '#433132', 4);
        fLine(ctx, a, by + side * 2.5, b, by - side * 2.5, side < 0 ? '#e4c483' : '#a77f45', 2);
      }
      fBlob(ctx, a, by, 0.65, '#fff0bc');
    }
    const open = this.beak > 0 && (this.beak >> 2) % 2 === 0;
    ctx.save();ctx.translate(bx, by + (open ? -1 : 0));ctx.scale(d, 1);ctx.drawImage(cuckooBirdArt(open), -20, -20);ctx.restore();
  }
}

// ---------- Alarm clock -----------------------------------------------------------------------
const ALARM_WAKE = 5 * TILE, ALARM_SNOOZE = 420, ALARM_BIG = -10.6, ALARM_SMALL = -7.2;
class Alarm extends Enemy {
  constructor(col, row) {
    super(col * TILE - 2, (row + 1) * TILE - 24, 20, 24);
    this.state = 'sleep'; this.timer = 0; this.facing = -1; this.wakeT = 0; this.squash = 0; this.n = 0;
  }
  hitbox() { return { x: this.x + 1, y: this.y + 4, w: this.w - 2, h: this.h - 4 }; }
  ring(g) {
    if (this.state === 'ring') return;
    this.state = 'ring'; this.timer = 0; this.wakeT = 0;
    if (onScreen(g, this.x)) Sound.play('ring');
    // the racket wakes its neighbours, one after another
    for (const e of g.entities) if (e instanceof Alarm && e !== this && e.state === 'sleep' && !e.wakeT && Math.abs(e.x - this.x) < 7 * TILE) e.wakeT = 14 + Math.round(Math.abs(e.x - this.x) / 4);
  }
  update(g) {
    this.t++;
    if (this.squash > 0) this.squash--;
    const p = g.player, dx = p.x + p.w / 2 - this.cx;
    if (this.state === 'sleep') {
      this.vx *= 0.8;
      if (this.wakeT && --this.wakeT === 0) this.ring(g);
      else if (p.state === 'play' && Math.abs(dx) < ALARM_WAKE && Math.abs(p.y + p.h - this.y - this.h) < 3 * TILE) this.ring(g);
      if (this.t % 50 === 0 && onScreen(g, this.x)) g.particles.push({ kind: 'text', x: this.cx + 8, y: this.y - 2, vx: 0.2, vy: -0.4, life: 40, t: 0, text: 'Z', color: '#c9b8ff' });
    } else if (this.state === 'ring') {
      this.timer++;
      if (this.timer % 30 === 0 && onScreen(g, this.x)) Sound.play('ring');
      if (this.onGround) {
        this.vx *= 0.85;
        if (this.timer % 30 === 12) { this.facing = dx < 0 ? -1 : 1; this.vy = -3.4; this.vx = Math.abs(dx) < 9 * TILE ? this.facing * 1.15 : 0; this.onGround = false; }   // (rings on the spot once you're well away)
      }
    } else if (this.state === 'snooze') {
      this.vx *= 0.8;
      if (++this.timer >= ALARM_SNOOZE) this.ring(g);
      if (this.timer % 60 === 30 && this.timer < ALARM_SNOOZE - 90 && onScreen(g, this.x)) g.particles.push({ kind: 'text', x: this.cx + 8, y: this.y - 2, vx: 0.2, vy: -0.4, life: 40, t: 0, text: 'Z', color: '#c9b8ff' });
    }
    // gravity and walls (it hops off ledges if it has to: it's an alarm clock, not a genius)
    this.vy = Math.min(this.vy + 0.3, 5);
    if (sweepX(g.level, this, this.vx)) this.vx = -this.vx * 0.5;
    const r = sweepY(g.level, this, this.vy);
    if (r === 1) { if (!this.onGround && this.state === 'ring' && onScreen(g, this.x)) g.dust(this.cx, this.y + this.h, 2); this.vy = 0; this.onGround = true; }
    else { this.onGround = false; if (r === -1) this.vy = 0; }
    if (this.y > VIEW_H + 32 || this.x + this.w < g.camX - 200) this.remove = true;
  }
  onTouch(g, p) {
    if (g.isStomp(p, this)) {
      if (this.state === 'snooze') this.springOff(g, p);
      else {
        this.state = 'snooze'; this.timer = 0; this.squash = 10;
        g.bounce(p); Sound.play('snooze');
        if (!this.n++) g.addScore(200, this.cx, this.y);
      }
    } else if (this.state === 'ring') g.hurtPlayer();
  }
  // bouncing on the snooze button: a springboard (hold jump for the big one)
  springOff(g, p) {
    const big = Input.down('jump') || Input.down('up') || g.t - p.pressT <= STOMP_EARLY;
    p.vy = big ? ALARM_BIG : ALARM_SMALL; p.jumping = false; p.springAir = big; p.holdGrace = 0;
    p.onGround = false; p.platform = null; p.jumpBuf = 0; p.flaps = 0; p.combo = 0; p.blast = 0;
    p.airMax = Math.max(p.airMax, RUN_MAX); p.sx = 0.75; p.sy = 1.3;
    this.squash = 10; this.timer = Math.min(this.timer, ALARM_SNOOZE - 120);   // a bounce doesn't wake it, and it buys a little time
    Sound.play('spring');
  }
  draw(ctx) {
    const ring = !this.dead && this.state === 'ring', phase = (this.t >> 1) % 2;
    const jitter = ring ? (phase ? 0.6 : -0.6) : 0, squash = this.squash > 0 ? 1 - this.squash * 0.015 : 1;
    drawSprite(ctx, alarmClockArt(ring ? 'ring' : this.state === 'snooze' ? 'snooze' : 'sleep', ring ? phase : 0), this.cx + jitter, this.y + this.h, false, 1, squash, this.flipped);
    if (ring) for (const side of [-1, 1]) fArc(ctx, this.cx + side * 10, this.y + 2, 3.4, 3.8, side > 0 ? -0.9 : 2.2, side > 0 ? 0.9 : 4, '#eeddb7');
  }
}

// ---------- Windup mouse ----------------------------------------------------------------------
class Windup extends Enemy {
  constructor(col, row) {
    super(col * TILE + 1, (row + 1) * TILE - 11, 14, 11);
    this.state = 'wind'; this.timer = (col * 13) % 30; this.facing = -1; this.keyA = 0; this.walker = true;
  }
  update(g) {
    this.t++;
    const p = g.player;
    if (this.state === 'wind') {
      this.vx *= 0.8; this.keyA += 0.4;
      if (++this.timer === 2) this.facing = p.x + p.w / 2 < this.cx ? -1 : 1;
      if (this.timer % 8 === 0 && onScreen(g, this.x)) g.spark(this.cx - this.facing * 6, this.y + this.h - 1, '#d8d4ec', 12, -this.facing * 0.6, -0.3);
      if (this.timer >= 46) { this.state = 'zip'; this.timer = 0; this.vx = this.facing * 2.4; if (onScreen(g, this.x)) Sound.play('zip'); }
    } else if (this.state === 'zip') {
      this.keyA += 0.25;
      if (++this.timer > 50) this.vx *= 0.95;
      if (this.vx) this.facing = this.vx < 0 ? -1 : 1;
      if (this.timer > 50 && Math.abs(this.vx) < 0.15) { this.state = 'stop'; this.timer = 0; this.vx = 0; }
    } else if (++this.timer > 36) { this.state = 'wind'; this.timer = 0; }
    this.walk(g, false);
  }
  stomp(g, p) {
    this.flipKill(g, 0); g.bounce(p); g.stompScore(this); Sound.play('stomp');
    // the key pops off and goes spinning away
    for (let i = 0; i < 4; i++) g.particles.push({ kind: 'px', x: this.cx, y: this.y, vx: rand(-1.2, 1.2), vy: rand(-3, -1.5), g: 0.15, life: 40, t: 0, color: i % 2 ? '#ffd166' : '#c8891e', size: 2 });
  }
  draw(ctx) {
    const f = this.facing, zoom = this.state === 'zip' && Math.abs(this.vx) > 1;
    const by = this.y + this.h, cx = this.cx;
    drawSprite(ctx, windupMouseArt((this.t >> (zoom ? 1 : 3)) % 2), cx, by, f < 0, 1, 1, this.flipped);
    if (!this.flipped) {
      const x = cx - f * 2.6, y = by - 12.4, width = 0.4 + Math.abs(Math.cos(this.keyA)) * 2.4;
      fLine(ctx, x, y, x, y - 2.1, '#8e6a38', 3);
      for (const side of [-1, 1]) {fEll(ctx, x + side * width * 0.65, y - 2.8, width * 0.65, 1.1, '#d5b06b');fEll(ctx, x + side * width * 0.65, y - 2.8, Math.max(0.15, width * 0.3), 0.5, '#3d3848');}
    }
    if (zoom) {ctx.globalAlpha = 0.45; for (let i = 0; i < 3; i++) fLine(ctx, cx - f * (12 + i * 2), by - 7 + i * 1.4, cx - f * (15 + i * 2), by - 7 + i * 1.4, '#e7ecd7', 1);ctx.globalAlpha = 1;}
  }
}

// ---------- Jack-in-the-box -------------------------------------------------------------------
// "All a-round the mul-ber-ry bush..." -- then POP, all by itself. Each note turns the crank.
const JACK_TUNE = [523, 698, 698, 784, 784, 880, 1047, 880, 698];
const JACK_STEP = 7, JACK_POP = -13.2, JACK_UP = 80;
class Jack extends Enemy {
  constructor(col, row) {
    super(col * TILE, (row + 1) * TILE - 16, 16, 16);
    this.rest = this.y; this.rider = null; this.n = 0; this.k = 0; this.crank = 0; this.up = 0;
    this.friendly = this.passive = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  touches(p) {
    if (this.rider || this.up > JACK_UP - 30 || !overlap(this, p)) return false;
    if (p.vy > 0 && p.prevY + p.h <= this.rest + 8) return true;                       // landing on the lid
    const pc = p.x + p.w / 2;                                                            // or walking onto it
    return p.onGround && Math.abs(p.y + p.h - this.rest) < 2 && pc > this.x + 2 && pc < this.x + this.w - 2;
  }
  onTouch(g, p) {
    g.endRoll(p);
    this.rider = p; this.n = 0; this.k = 0;
    p.spin = false; p.vx = 0; p.vy = 0; p.combo = 0; p.platform = null; p.jumpBuf = 0;
  }
  update(g) {
    this.t++;
    if (this.up > 0) this.up--;
    const p = this.rider;
    if (!p) return;
    if (p.state !== 'play') { this.rider = null; return; }
    p.x = clamp(p.x, this.x - p.w + 6, this.x + this.w - 6);
    p.y = this.rest - p.h + (this.k < 3 ? 1 : 0); p.vx = 0; p.vy = 0;
    p.onGround = false; p.coyote = 0; p.jumpBuf = 0; p.flaps = 1;   // (no flapping off the lid)
    if (++this.k >= JACK_STEP) {
      this.k = 0; this.crank++;
      if (onScreen(g, this.x)) Sound.note(JACK_TUNE[this.n]);
      g.particles.push({ kind: 'text', x: this.cx + 10, y: this.y - 4, vx: 0.3, vy: -0.6, life: 26, t: 0, text: this.n % 2 ? '^' : '*', color: '#ffd166' });
      if (++this.n >= JACK_TUNE.length) this.pop(g, p);
    }
  }
  pop(g, p) {
    this.rider = null; this.up = JACK_UP;
    p.vy = JACK_POP; p.vx = 0; p.jumping = false; p.springAir = true; p.airMax = RUN_MAX; p.flaps = 0; p.holdGrace = 0;
    p.y = this.rest - 18 - p.h; p.sx = 0.7; p.sy = 1.35;
    Sound.play('pop'); Sound.play('spring');
    g.burst(this.cx, this.y - 6, ['#ff5d8f', '#ffd166', '#7af0ff', '#ffffff'], 14);
  }
  draw(ctx) {
    const x = fSnap(this.x), y = fSnap(this.y);
    const ext = this.up > 0 ? Math.min(1, (JACK_UP - this.up) / 5, this.up / 18) * 26 + Math.sin(this.t * 0.6) * (this.up > 40 ? 2 : 0) : 0;
    if (ext > 2) {
      let prev = [x + 8, y];
      for (let i = 1; i <= 24; i++) {
        const pt = [x + 8 + Math.sin(i * Math.PI / 2) * 3.4, y - i * ext / 24];
        fLine(ctx, ...prev, ...pt, '#535667', 3);fLine(ctx, prev[0] - 0.2, prev[1] - 0.2, pt[0] - 0.2, pt[1] - 0.2, '#d5ddd9', 1);prev = pt;
      }
      ctx.drawImage(jackHeadArt(), x - 4, y - ext - 20);
    }
    ctx.drawImage(jackBoxArt(), x - 4, y - 3);
    if (this.up > 0) fRoundRect(ctx, x - 4, y - 5, 2.5, 9, 0.7, '#bd5b79');
    else {fRoundRect(ctx, x - 1, y, 18, 2.6, 0.7, '#714254');fRect(ctx, x, y + 0.4, 16, 0.6, '#efb5be');}
    const a = this.crank * Math.PI / 2 + (this.rider ? this.k / JACK_STEP * Math.PI / 2 : 0), kx = x + 18 + Math.cos(a) * 2.8, ky = y + 9 + Math.sin(a) * 2.8;
    fLine(ctx, x + 16, y + 9, kx, ky, '#b9c5ca', 2);fEll(ctx, kx, ky, 1.2, 1, '#dcbd74');
  }
}

// ---------- Toy train -------------------------------------------------------------------------
// A tin locomotive on a toy track (the rails run along the top of row+1, from column `col` to `endCol`:
// over a gap the track is far too thin to stand on). Standing on it, every tap of run gives its key a turn
// (and nothing else: no fireball, no zap); it runs while wound, slowing to a stop as it runs down. `calls`: [[column, line], ...] that Kookoo
// shouts as the front of the train passes each column with Chickaroo aboard (once per visit).
const TRAIN_W = 66, TRAIN_H = 30, TRAIN_SPEED = 1.25, TRAIN_WIND = 35, TRAIN_MAX = 11;   // each turn of the key adds TRAIN_WIND frames of running, up to TRAIN_MAX of them
class ToyTrain {
  constructor(col, endCol, row = 11, calls = []) {
    this.rail = (row + 1) * TILE; this.c0 = col; this.c1 = endCol;
    this.x = col * TILE; this.xEnd = (endCol + 1) * TILE - TRAIN_W - 8;
    this.top = this.rail - TRAIN_H;   // (where the art hangs; the cab roof is up here)
    // he can stand on the cab roof and on the chimney, and drop into the dip between them onto the boiler's top (the main platform)
    this.y = this.top + 10; this.w = TRAIN_W; this.h = 8; this.dx = 0; this.dy = 0; this.prevY = this.y;
    this.extra = [{ off: 0, w: 27, up: 0 }, { off: 50, w: 7, up: -1 }].map(o => ({ ...o, x: this.x + o.off, y: this.top + o.up, h: 6, dx: 0, dy: 0, prevY: this.top + o.up, update() {}, draw() {} }));
    this.speed = 0; this.wound = 0; this.on = false; this.t = 0; this.keyA = 0; this.wheel = 0; this.kick = 0;
    this.calls = calls.slice(); this.speakerName = 'TOY TRAIN';
  }
  get cx() { return this.x + this.w / 2; }
  update(g) {
    const p = g.player, on = p.state === 'play' && (p.platform === this || this.extra.includes(p.platform));
    this.t++;
    if (this.kick > 0) this.kick--;
    if (on && !this.on) {   // first time aboard (once per visit): a two-second tip
      const seen = g.seenCine || (g.seenCine = new Set());
      if (!seen.has('traintip')) { seen.add('traintip'); g.say('', 'TAP RUN TO WIND', '#ffd166', 120); }
    }
    if (on && Input.hit('run') && !g.held) {   // a turn of the key
      Input.hits.delete('run');                 // (it's a wind, not a fireball)
      this.wound = Math.min(TRAIN_WIND * TRAIN_MAX, this.wound + TRAIN_WIND); this.kick = 14;
      Sound.play('windup');
      if (!this.started) { this.started = true; Sound.play('toot'); }
    }
    this.idle = on && this.speed === 0 && !this.arrived ? (this.idle || 0) + 1 : 0;   // stood on, stopped: the key starts to jiggle
    // hopping off a moving train keeps its speed (so he lands back on it, not behind it)
    if (!on && this.on && p.state === 'play' && p.vy < 0) { p.vx += this.speed; p.airMax = Math.max(p.airMax, Math.abs(p.vx)); }
    this.on = on;
    if (this.wound > 0 && this.x < this.xEnd) { this.wound--; this.speed = Math.min(TRAIN_SPEED, this.speed + 0.06); }
    else this.speed = Math.max(0, this.speed - 0.025);
    const ox = this.x;
    this.x = Math.min(this.xEnd, this.x + this.speed);
    if (this.x >= this.xEnd && !this.arrived) {
      this.arrived = true; this.speed = 0; this.wound = 0; Sound.play('toot');
    }
    this.dx = this.x - ox; this.dy = 0; this.prevY = this.y;
    for (const e of this.extra) { e.x = this.x + e.off; e.dx = this.dx; e.dy = 0; }
    this.keyA += this.speed * 0.08 + (this.kick ? 0.4 : 0); this.wheel += this.speed / 6;
    while (this.calls.length && this.x + this.w >= this.calls[0][0] * TILE) {
      const [col, text] = this.calls.shift(), seen = g.seenCine || (g.seenCine = new Set());
      if (seen.has('train' + col)) continue;   // once per visit, not on every respawn
      if (on || (p.platform === null && Math.abs(p.x - this.x) < 120)) { seen.add('train' + col); g.speak(KOOKOO_VOICE, text, KOOKOO_COL); Sound.play('cuckoo'); }
    }
    const seen = onScreen(g, this.x, this.w);
    if (seen && this.speed > 0.2 && this.t % Math.round(26 / this.speed) === 0) {
      Sound.play('chuff');
      g.particles.push({ kind: 'steam', x: this.x + this.w - 2, y: this.top - 10, vx: -0.4 - this.speed * 0.3, vy: -0.7, g: 0, drag: 0.985, life: 46, t: 0, r: 2.5 });
    }
  }
  draw(ctx) {   // the track in fine pixels, the train's 1x drawing lifted to the fine screen look by look (hires.js)
    // the track: rails on sleepers, on spindly trestles over the gaps
    const ry = this.rail, x0 = this.c0 * TILE, x1 = (this.c1 + 1) * TILE;
    for (let x = x0 + 6; x < x1; x += 28) {
      fRect(ctx, x, ry + 3, 3, VIEW_H - ry, INK); fRect(ctx, x + 2 / 3, ry + 3, 5 / 3, VIEW_H - ry, '#7a5a3a'); fRect(ctx, x + 2 / 3, ry + 3, 2 / 3, VIEW_H - ry, '#9a7a52');
      for (let yy = ry + 14; yy < VIEW_H; yy += 22) { fRoundRect(ctx, x - 10, yy, 23, 2, 0.8, INK); fRect(ctx, x - 9.4, yy + 1 / 3, 21.8, 1, '#7a5a3a'); }
    }
    for (let x = x0; x < x1; x += 6) { fRoundRect(ctx, x, ry, 5, 4, 1, INK); fRoundRect(ctx, x + 2 / 3, ry + 2 / 3, 11 / 3, 8 / 3, 0.6, '#9a6a3a'); fRect(ctx, x + 2 / 3, ry + 2 / 3, 11 / 3, 1 / 3, '#c4945a'); }
    fRect(ctx, x0, ry - 2, x1 - x0, 3, INK); fRect(ctx, x0, ry - 5 / 3, x1 - x0, 2 / 3, '#d8d4ec'); fRect(ctx, x0, ry - 1, x1 - x0, 2 / 3, '#8a86a0');
    this.drawBody(ctx);
  }
  drawBody(ctx) {
    const x = this.x, y = this.top;
    ctx.drawImage(clockTrainArt(), fSnap(x - 12), fSnap(y - 10));
    for (const wx of [8,22,42,54]) brassCog(ctx, x + wx, y + 25, 3.8, this.wheel + wx, 8, ['#f0d7a2','#8c9aa5','#3d4d61']);
    const a = this.wheel + 42, ox = Math.cos(a) * 2.5, oy = Math.sin(a) * 2.5;
    fLine(ctx, x + 42 + ox, y + 25 + oy, x + 54 + ox, y + 25 + oy, '#d5ddd9', 2);
    const u = this.wound / (TRAIN_WIND * TRAIN_MAX), ga = Math.PI * (0.75 + u * 1.5);
    fLine(ctx, x + 12, y + 19, x + 12 + Math.cos(ga) * 2.2, y + 19 + Math.sin(ga) * 2.2, '#ad4958', 1);
    const width = 0.4 + Math.abs(Math.cos(this.keyA)) * 3;
    fLine(ctx, x - 5, y + 9, x, y + 9, '#a57b44', 3);fEll(ctx, x - 6, y + 9, 1.1, width, '#e3c27d');fEll(ctx, x - 6, y + 9, 0.4, width * 0.58, '#3d3743');
  }
}

// ---------- Master Stopwatch ------------------------------------------------------------------
// A pocket watch stood on its rim. Touch it: time stops (Game.stopTime) for `dur` frames. It only goes again
// once Chickaroo has stepped away from it (so standing in it as time restarts doesn't stop it all over again).
class Stopwatch extends Enemy {
  constructor(col, row, dur = 330) {
    super(col * TILE + 8 - 13, (row + 1) * TILE - 36, 26, 36);
    this.dur = dur; this.press = 0; this.cool = 0; this.inside = false;
    this.friendly = this.passive = this.noFreeze = this.timeless = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return { x: this.x + 1, y: this.y + 4, w: this.w - 2, h: this.h - 6 }; }
  onTouch(g) {
    const fresh = !this.inside;
    this.inside = true;
    if (!fresh || g.timeStop > 0 || this.cool > 0) return;
    this.press = 10; this.cool = 60;
    g.stopTime(this.dur, this.cx, this.y + 22);
  }
  update(g) {
    this.t++;
    if (this.press > 0) this.press--;
    if (this.inside && !this.touches(g.player)) this.inside = false;
    if (this.cool > 0 && !(g.timeStop > 0)) this.cool--;
  }
  draw(ctx, g) {
    const x = this.cx, y = this.y + this.h / 2, stopped = g && g.timeStop > 0;
    if (!stopped && this.cool <= 0) fGlow(ctx, x, y, 18, '#e6cc8b', 0.13);
    ctx.drawImage(clockStopwatchArt(), fSnap(x - 13), fSnap(y - 15));
    if (stopped) { const u = g.timeStop / (g.timeStopMax || 1); fArc(ctx, x, y + 3, 5.6, 6.6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.001, u), '#6cc4dc'); }
    else if (this.cool > 0) {ctx.globalAlpha = 0.18;fBlob(ctx, x, y + 3, 8, '#555065');ctx.globalAlpha = 1;}
    else if ((this.t >> 4) % 3 === 0) {fLine(ctx, x - 5, y, x - 5, y + 2.5, '#fff8dc', 1);fLine(ctx, x - 6.2, y + 1.2, x - 3.8, y + 1.2, '#fff8dc', 1);}
  }
}

// ---------- Gearfall --------------------------------------------------------------------------
// Cogs pour out of the dark above column `col`, one every `period` frames, and fall away into the
// gap below at `speed`. Each cog's top is a platform (catch one and ride it down -- briefly).
class FallingCog {
  constructor(cx, y, vy, r, spin) {
    this.r = r; this.cx0 = cx; this.w = Math.round(r * 1.5); this.x = cx - this.w / 2; this.h = 6;
    this.y = y; this.vy = vy; this.prevY = y; this.dx = 0; this.dy = 0; this.a = rand(0, 6); this.spin = spin;
  }
  update() {
    this.prevY = this.y; this.y += this.vy; this.dy = this.vy; this.a += this.spin;
    if (this.y > VIEW_H + 40) this.remove = true;
  }
  draw(ctx, g) {
    if (g && (this.cx0 < g.camX - 30 || this.cx0 > g.camX + VIEW_W + 30)) return;
    brassCog(ctx, this.cx0, Math.round(this.y) + this.r + 2, this.r, this.a, 9);
  }
}
class Gearfall extends Enemy {
  constructor(col, period = 40, phase = 0, speed = 2.2, r = 10) {
    super(col * TILE, 0, 16, 1);
    this.period = period; this.k = Math.round(phase * period); this.speed = speed; this.r = r; this.primed = false;
    this.friendly = this.passive = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  drop(g, y) { g.platforms.push(new FallingCog(this.x + 8, y, this.speed, this.r, (this.x % 32 ? 1 : -1) * 0.05)); }
  update(g) {
    this.t++;
    if (!this.primed) {   // the cascade is already pouring when it scrolls into view
      this.primed = true;
      for (let y = -30 + (this.k % this.period) * this.speed; y < VIEW_H + 20; y += this.period * this.speed) this.drop(g, y);
    }
    if (++this.k % this.period === 0) this.drop(g, -30);
    if (this.x < g.camX - 240) this.remove = true;
  }
  draw() {}   // (the cogs pour from somewhere up above the screen)
}

// ---------- Tin birds -------------------------------------------------------------------------
// A flock of clockwork birds flying left through columns x1 -> x0 (one every `every` frames), bobbing
// up and down around `row`, until Chickaroo passes column `until`. Harmless; stomp one for a bounce. A chain of them is a bridge.
class Tinbird extends Enemy {
  constructor(x, row, speed, ph) {
    super(x, row * TILE + 3, 16, 10);
    this.y0 = this.y; this.vx = -speed; this.ph = ph; this.keyA = 0;
    this.fireKill = this.shellKill = this.bumpKill = true;
  }
  update(g) {
    this.t++; this.keyA += 0.2;
    this.x += this.vx; this.y = this.y0 + Math.round(Math.sin(this.t * 0.05 + this.ph) * 9);
    if (this.x + this.w < g.camX - 60) this.remove = true;
  }
  onTouch(g, p) { if (g.isStomp(p, this)) this.stomp(g, p); }   // a tin toy: bumping into it doesn't hurt
  stomp(g, p) {
    this.flipKill(g, 0); g.bounce(p); g.stompScore(this); Sound.play('stomp');
    for (let i = 0; i < 3; i++) g.spark(this.cx, this.y + 4, i % 2 ? '#ffd166' : '#d8d4ec', 20, rand(-1, 1), rand(-1.5, -0.5));
  }
  draw(ctx) {
    drawSprite(ctx, clockTinbirdArt((this.t >> 3) % 2), this.cx, this.y + this.h + 3, false, 1, 1, this.flipped);
    const x = this.cx + 2, y = this.y - 0.6, w = 0.3 + Math.abs(Math.cos(this.keyA)) * 1.6;
    fLine(ctx, x, y + 1.3, x, y - 1.4, '#a88249', 2);fEll(ctx, x, y - 1.8, w, 0.7, '#ddc17e');
  }
}
class Tinbirds extends Enemy {
  constructor(x0, x1, row = 6, every = 46, speed = 1.1, until = null) {
    super(x0 * TILE, 0, 16, 1);
    this.x0 = x0 * TILE; this.x1 = (x1 + 1) * TILE; this.row = row; this.every = every; this.speed = speed; this.primed = false; this.n = 0;
    this.until = until == null ? Infinity : until * TILE;   // the flock stops coming once Chickaroo gets past this column
    this.friendly = this.passive = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  launch(g, x) { g.entities.push(new Tinbird(x, this.row, this.speed, (this.n++ * 1.7) % 6)); }
  update(g) {
    this.t++;
    if (!this.primed) { this.primed = true; for (let x = this.x1; x > this.x0 - 32; x -= this.every * this.speed) this.launch(g, x); }
    if (g.player.x > this.until) { this.remove = true; return; }
    if (this.t % this.every === 0) this.launch(g, this.x1);
    if (this.x1 < g.camX - 100) this.remove = true;
  }
  draw() {}
}

// ---------- Clock faces and their hands -------------------------------------------------------
// A great clock face (centre: middle of tile (col, row), radius `r` tiles) drawn behind the tiles, with
// hands that turn: hands = [[length (tiles), period (frames per turn), start (hours, 0-12), dir], ...]
// (dir -1 runs the hand backwards). A hand is a platform you can stand on and ride round, as long as
// it's no steeper than CLOCK_STEEP; the brass cap at the hub is always safe to stand on.
const CLOCK_STEEP = 0.34;   // the |sin| of the hand's angle from 12 o'clock below which it's too steep to stand on (steep ones are slides)
class ClockHand {
  constructor(px, py, len, period, start, dir, thick) {
    this.px = px; this.py = py; this.len = len; this.period = period; this.dir = dir || 1; this.thick = thick;
    this.a0 = start / 12 * Math.PI * 2; this.t = 0; this.a = this.a0;
    this.w = 14; this.h = 6; this.x = px; this.y = -999; this.prevY = -999; this.dx = 0; this.dy = 0; this.ghost = true; this.rode = false;
  }
  // the top of the hand at x (px) when it points at angle a (0 = 12 o'clock, clockwise), or null
  topAt(a, x) {
    const sa = Math.sin(a);
    if (Math.abs(sa) < CLOCK_STEEP) return null;
    const s = (x - this.px) / sa;
    if (s < 7 || s > this.len) return null;
    return this.py - s * Math.cos(a) - this.thick;
  }
  update(g) {
    const p = g.player, pa = this.a, cx = p.x + p.w / 2, foot = p.y + p.h;
    this.t++; this.a = this.a0 + this.dir * this.t / this.period * Math.PI * 2;
    let riding = p.state === 'play' && p.platform === this;
    // walking down a slope he can lose touch for a frame: keep him on it
    if (!riding && this.rode && p.state === 'play' && p.vy >= 0 && !p.platform) {
      const y = this.topAt(pa, cx);
      if (y != null && foot <= y + 1 && y - foot < 6) { riding = true; p.platform = this; }
    }
    this.rode = riding;
    if (riding) {
      const s = (cx - this.px) / Math.sin(pa), nx = this.px + s * Math.sin(this.a);
      const ny = this.topAt(this.a, nx);
      if (ny == null) { this.ghost = true; this.y = -999; this.dx = this.dy = 0; return; }
      // a steep hand is slippery: he slides down it
      const slope = -Math.cos(this.a) / Math.sin(this.a), slide = Math.abs(slope) > 0.75 ? Math.sign(slope) * Math.min(2.4, (Math.abs(slope) - 0.75) * 1.2) : 0;
      this.ghost = false;
      this.dx = nx - cx + slide; this.dy = (this.topAt(this.a, nx + slide) ?? ny) - foot;
      this.x = cx + this.dx - this.w / 2; this.y = foot + this.dy; this.prevY = this.y;
    } else {
      const y = this.topAt(this.a, cx), y0 = this.topAt(pa, cx);
      this.ghost = y == null; this.dx = this.dy = 0;
      this.x = cx - this.w / 2; this.y = y == null ? -999 : y; this.prevY = y0 == null ? this.y : y0;
    }
  }
  draw(ctx) {
    const sa = Math.sin(this.a), ca = -Math.cos(this.a), L = this.len, th = this.thick;   // (in fine pixels: hires.js)
    // a wrought-iron hand: a tapering bar with a pierced loop, ending in a spade (long hand) or an arrow
    const pts = [];
    for (let s = -8; s <= L; s += 0.5) { const u = s / L, w = s < 0 ? th : th * (1 - u * 0.45); pts.push([this.px + sa * s, this.py + ca * s, w]); }
    for (const [x, y, w] of pts) fBlob(ctx, x, y, w + 0.8, INK);
    for (const [x, y, w] of pts) fBlob(ctx, x, y, w, '#2a1d40');
    for (const [x, y, w] of pts) fRect(ctx, x - 0.2, y - w + 0.3, 1 / 3, 1 / 3, '#c8891e');   // a thin brass edge along the top
    const tx = this.px + sa * L, ty = this.py + ca * L;
    fBlob(ctx, tx, ty, th + 3, INK); fBlob(ctx, tx, ty, th + 2.2, '#2a1d40'); fBlob(ctx, tx - 1, ty - 1, 1, '#ffd166');
    const mx = this.px + sa * L * 0.55, my = this.py + ca * L * 0.55;
    fBlob(ctx, mx, my, th + 2, INK); fBlob(ctx, mx, my, th + 1.2, '#2a1d40'); fBlob(ctx, mx, my, Math.max(1, th - 1), '#efe2b4');
  }
}
class ClockFace extends Enemy {
  constructor(col, row, r, hands = [[5, 720, 9, 1]]) {
    const R = r * TILE;
    super(col * TILE + 8 - R, row * TILE + 8 - R, R * 2, R * 2);
    this.px = col * TILE + 8; this.py = row * TILE + 8; this.R = R; this.handDefs = hands; this.made = false;
    this.behindTiles = true; this.friendly = this.passive = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    if (this.made) return;
    this.made = true;
    this.handDefs.forEach(([len, period, start, dir], i) => g.platforms.push(new ClockHand(this.px, this.py, len * TILE, period, start, dir, i ? 2 : 3)));
    const px = this.px, py = this.py, hub = { x: px - 7, y: py - 6, w: 14, h: 6, dx: 0, dy: 0, prevY: py - 6, update() {} };
    hub.draw = ctx => { blob(ctx, px, py, 7, INK); blob(ctx, px, py, 6, '#c8891e'); blob(ctx, px - 1, py - 1, 4, '#ffd166'); blob(ctx, px - 2, py - 2, 1, '#fff3b0'); };
    g.platforms.push(hub);
  }
  draw(ctx) {
    const cx = this.px, cy = this.py, R = this.R;
    blob(ctx, cx, cy, R + 4, INK); blob(ctx, cx, cy, R + 3, '#7a5a22'); blob(ctx, cx - 1, cy - 1, R + 2, '#c8891e');
    blob(ctx, cx, cy, R - 1, INK); blob(ctx, cx, cy, R - 2, '#d8c89a'); blob(ctx, cx - 3, cy - 3, R - 6, '#efe2b4');
    ctx.globalAlpha = 0.35; blob(ctx, cx - R * 0.3, cy - R * 0.3, Math.round(R * 0.35), '#fbf3d6'); ctx.globalAlpha = 1;
    // minute ticks round the rim, and the hour numerals
    for (let i = 0; i < 60; i++) {   // (in fine pixels: hires.js)
      const a = i / 60 * Math.PI * 2, big = i % 5 === 0, r0 = R - (big ? 9 : 6);
      fLine(ctx, cx + Math.sin(a) * r0, cy - Math.cos(a) * r0, cx + Math.sin(a) * (R - 3.4), cy - Math.cos(a) * (R - 3.4), big ? '#3a2a50' : '#8a7a6a', big ? 5 : 2);
    }
    const NUM = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, rr = R - 18;
      drawText(ctx, NUM[i], cx + Math.sin(a) * rr, cy - Math.cos(a) * rr - 3, '#3a2a50', { small: true, align: 'center' });
    }
    // a faint chapter ring
    fArc(ctx, cx, cy, R - 26.4, R - 25.6, 0, Math.PI * 2 - 0.001, '#b8a880');
  }
}

// ---------- Mainspring ------------------------------------------------------------------------
// Where the clockwork breaks: passing column `col` (the fourth checkpoint flag), five golden gears burst
// out of the grandfather clock's hub (the dot that holds its hands) and tumble off, while the hands of the
// clocks spin wildly for a moment before stopping dead.
class Mainspring extends Enemy {
  constructor(col) {
    super(col * TILE, 0, 16, 1);
    this.trig = col * TILE; this.state = 'wait'; this.gears = [];
    this.friendly = this.passive = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    const p = g.player;
    if (this.state === 'wait') {
      if (p.state !== 'play' || p.x + p.w / 2 < this.trig) return;
      this.state = 'fly'; this.t = 0;
      // out of the middle of the great clock behind the skyline (it hangs fixed on the screen, hub at 318, 60)
      const hx = g.camX + 318, hy = 60 - (g.lift || 0);
      this.gears = [-2.6, -1.3, 0, 1.3, 2.6].map((vx, i) => ({ x: hx, y: hy, vx: vx + rand(-0.3, 0.3), vy: rand(-8.5, -6), r: [9, 6, 11, 7, 8][i], teeth: [10, 8, 12, 8, 9][i], a: rand(0, 6), w: (i % 2 ? -1 : 1) * rand(0.15, 0.3) }));
      Sound.play('sproing'); Sound.play('break'); g.shake = 4;
      g.burst(hx, hy, ['#ffd166', '#c8891e', '#ffffff'], 24);
    }
    if (this.state !== 'fly') return;
    this.t++;
    if (this.t < 70) g.handT += 60 - this.t * 0.8;   // the town clock's hands whirl round, then stop dead
    for (const o of this.gears) {
      o.vy += 0.22; o.x += o.vx; o.y += o.vy; o.a += o.w;
      if (o.y > 12 * TILE - 6 && o.vy > 0 && !o.done) { o.vy = -o.vy * 0.5; o.vx *= 0.8; if (++o.hops > 2) o.done = true; Sound.play('sproing'); }
      else o.hops = o.hops || 0;
    }
    if (this.t > 400 || this.gears.every(o => o.x < g.camX - 40 || o.x > g.camX + VIEW_W + 40 || o.y > VIEW_H + 40)) this.state = 'gone';
  }
  draw(ctx) {
    if (this.state !== 'fly') return;
    for (const o of this.gears) {
      drawCog(ctx, o.x, o.y, o.r + 1, o.teeth, o.a, INK, INK);
      drawCog(ctx, o.x, o.y, o.r, o.teeth, o.a, '#e0a830', '#7a5a22');
      ctx.globalAlpha = 0.6; blob(ctx, o.x - o.r * 0.3, o.y - o.r * 0.3, Math.max(1, Math.round(o.r * 0.25)), '#fff3b0'); ctx.globalAlpha = 1;
    }
  }
}

// All clockwork characters above paint directly on the fine screen.
