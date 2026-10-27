'use strict';
// Frostwind Peaks set pieces (2-2): the rolling snowball, the weathervane and the avalanche.

// Giant snowball. Lives in `game.platforms` so Chickaroo can ride on top of it. Bump it and it
// rolls off (away from him), growing as it goes: it flattens foes, scoops up pollen, bursts
// through crates, climbs low terraces, and shatters at a tall wall (or rolls off into a pit).
const SNOWBALL_R0 = 9, SNOWBALL_RMAX = 22, SNOWBALL_GROW = 0.05, SNOWBALL_SPEED = 2.6, SNOWBALL_HOP = -6.5;
class Snowball {
  constructor(col, row, fling) {
    this.fling = fling;   // bursting flings the rider high (otherwise he just hops clear)
    this.r = SNOWBALL_R0; this.cx = col * TILE + 8; this.cy = (row + 1) * TILE - this.r;
    this.state = 'idle'; this.dir = 1; this.wobble = 0; this.vy = 0; this.spin = 0; this.combo = 0; this.t = 0;
    this.dx = 0; this.dy = 0; this.h = 8; this.climb = 0;
    this.place(); this.prevY = this.y;
  }
  // the rideable top: a flat strip across the crown of the ball
  place() {
    if (this.state === 'gone') { this.x = -1e5; this.y = 1e5; this.w = 0; return; }
    this.w = Math.round(this.r * 1.4); this.x = this.cx - this.w / 2; this.y = this.cy - this.r;
  }
  box() { return { x: this.cx - this.r, y: this.cy - this.r, w: this.r * 2, h: this.r * 2 }; }
  update(g) {
    this.t++;
    const ox = this.x, oy = this.y;
    this.prevY = this.y;
    if (g && this.state !== 'gone') this.state === 'idle' ? this.idle(g) : this.roll(g);
    this.place();
    this.dx = this.state === 'gone' ? 0 : this.x - ox; this.dy = this.state === 'gone' ? 0 : this.y - oy;
    if (g && this.state === 'roll') this.keepRider(g);
  }
  idle(g) {
    const p = g.player;
    if (p.state !== 'play') return;
    if (this.wobble > 0) this.wobble--;
    // only landing on top sets it off; walking into it just bumps it (it's too heavy to shove)
    if (p.platform !== this) {
      const b = this.box();
      if (!overlap(b, p) || p.y + p.h <= b.y + 6) return;
      const left = p.x + p.w / 2 < this.cx;
      p.x = left ? b.x - p.w : b.x + b.w; if (left ? p.vx > 0 : p.vx < 0) p.vx = 0;
      if (!this.wobble) { this.wobble = 12; Sound.play('bump'); }
      if (!g.snowTold) { g.snowTold = true; g.say('A GIANT SNOWBALL!', 'JUMP ON TOP TO RIDE IT', '#e6f2ff'); }
      return;
    }
    // standing on top: Chickaroo balances in the middle until he pushes right to set it off
    p.x = this.cx - p.w / 2; p.vx = 0;
    if (!g.snowTold) { g.snowTold = true; g.say('A GIANT SNOWBALL!', 'PUSH RIGHT TO ROLL - JUMP TO HOP IT', '#e6f2ff'); }
    if (!Input.down('right')) return;   // it only rolls on downhill, onward
    this.dir = 1; this.state = 'roll';
    Sound.play('kick');
  }
  // while it rolls, the rider stays on its crown (jump to get off)
  keepRider(g) {
    const p = g.player;
    if (p.platform !== this || p.state !== 'play') return;
    const lo = this.x - this.dx, hi = lo + this.w - p.w;
    if (p.x < lo) { p.x = lo; if (p.vx < 0) p.vx = 0; }
    if (p.x > hi) { p.x = hi; if (p.vx > 0) p.vx = 0; }
    // hanging on for dear life: beads of sweat fly off behind him
    if (this.t % 26 === 0) g.particles.push({ kind: 'px', x: p.x + p.w / 2 - this.dir * 6, y: p.y + 3, vx: -this.dir * rand(0.6, 1.3), vy: rand(-1.6, -0.8), g: 0.15, life: 24, t: 0, color: '#9fe3ff', size: 2 });
  }
  roll(g) {
    const lv = g.level;
    // a rider's jump makes the ball hop with him (he stays on); jumping again in mid-air bails out
    const p = g.player;
    if (this.grounded && p.platform === this && p.state === 'play' && Input.hit('jump')) {
      Input.hits.delete('jump'); p.jumpBuf = 0;
      this.vy = SNOWBALL_HOP; Sound.play('jump');
    }
    // climbing a ledge: up the face it rolls, then carries on along the top
    if (this.climb > 0) {
      const d = Math.min(3, this.climb); this.climb -= d; this.cy -= d; this.vy = 0; this.grounded = true;
      this.spin += this.dir * SNOWBALL_SPEED / this.r;
      return;
    }
    // Keep the ball level while its centre rolls onto a ledge it has just climbed.
    // The round nose reaches that ledge before either ordinary floor sample does.
    const crossingStep = this.stepTop != null && this.vy >= 0 && (this.cx - this.stepFace) * this.dir < this.r * 0.5;
    let ground = false, br;
    if (crossingStep) {
      this.cy = this.stepTop - this.r; this.vy = 0; ground = true; br = Math.round(this.stepTop / TILE);
    } else {
      this.stepTop = null;
      this.vy = Math.min(this.vy + 0.3, 6); this.cy += this.vy;
      br = Math.floor((this.cy + this.r) / TILE);
      for (const c of [Math.floor((this.cx - this.r * 0.5) / TILE), Math.floor((this.cx + this.r * 0.5) / TILE)]) {
        if (this.vy >= 0 && (lv.solid(c, br) || lv.get(c, br) === T.SEMI) && this.cy + this.r - this.vy <= br * TILE + 1) {
          this.cy = br * TILE - this.r; this.vy = 0; ground = true; break;
        }
      }
    }
    if (this.cy - this.r > VIEW_H) { this.state = 'gone'; return; }
    this.grounded = ground;
    if (ground) this.r = Math.min(SNOWBALL_RMAX, this.r + SNOWBALL_GROW);
    if (ground) this.cy = br * TILE - this.r;
    // roll forward: crates burst, a low step is hopped, anything else shatters the ball
    const nx = this.cx + this.dir * SNOWBALL_SPEED, c = Math.floor((nx + this.dir * this.r) / TILE);
    const r0 = Math.floor((this.cy - this.r * 0.8) / TILE), r1 = Math.floor((this.cy + this.r - 1) / TILE);
    let wall = false;
    for (let r = r0; r <= r1; r++) {
      if (lv.get(c, r) === T.BRICK) { lv.set(c, r, T.EMPTY); g.breakBrick(c, r); this.r = Math.max(SNOWBALL_R0, this.r - 0.5); }
      else if (lv.solid(c, r)) wall = true;
    }
    // A marked end-of-ride column always ends the ride, even for a ball hopping high over the wall.
    if((lv.def && lv.def.snowballStops || []).some(([left,right])=>c>=left&&c<=right)) {
      this.burst(g);return;
    }
    if (wall) {
      // A descending ball can meet a low terrace before its centre has landed.
      // Find the actual ledge top, then check the entire raised ball for headroom.
      let surfaceRow = r1;
      if (lv.solid(c, surfaceRow)) {
        while (surfaceRow > 0 && lv.solid(c, surfaceRow - 1)) surfaceRow--;
        const surface = surfaceRow * TILE, rise = this.cy + this.r - surface;
        let clear = rise > 0 && rise <= TILE * 2 + 0.5;
        const left = Math.floor((nx - this.r + 1) / TILE), right = Math.floor((nx + this.r - 1) / TILE);
        const top = Math.floor((surface - this.r * 2) / TILE);
        for (let rr = top; clear && rr < surfaceRow; rr++) for (let cc = left; cc <= right; cc++) {
          if (lv.solid(cc, rr)) { clear = false; break; }
        }
        if (clear) { this.climb = rise; this.stepTop = surface; this.stepFace = (c + (this.dir < 0 ? 1 : 0)) * TILE; this.vy = 0; this.grounded = true; wall = false; }
      }
    }
    if (wall) { this.burst(g); return; }
    if (this.climb > 0) return;
    this.cx = nx; this.spin += this.dir * SNOWBALL_SPEED / this.r;
    if (ground && this.t % 4 === 0) g.particles.push({ kind: 'px', x: this.cx - this.dir * this.r, y: this.cy + this.r - 2, vx: -this.dir * rand(0.4, 1.4), vy: rand(-1.6, -0.4), g: 0.12, life: 26, t: 0, color: '#ffffff', size: 2 });
    if (ground && this.t % 24 === 0 && this.cx > g.camX - 20 && this.cx < g.camX + VIEW_W + 20) Sound.play('rumble');
    // flatten foes, scoop up pollen
    const b = this.box();
    for (const e of g.entities) {
      if (e.dead || e.noFreeze || !(e.shellKill || e.stompable)) continue;
      const eb = e.hitbox();
      if (!eb || !overlap(b, eb)) continue;
      e.flipKill(g, this.dir);
      g.addScore(STOMP_SCORES[Math.min(this.combo++, STOMP_SCORES.length - 1)], e.cx, e.y);
      Sound.play('kick');
    }
    for (let rr = Math.floor(b.y / TILE); rr <= Math.floor((b.y + b.h - 1) / TILE); rr++)
      for (let cc = Math.floor(b.x / TILE); cc <= Math.floor((b.x + b.w - 1) / TILE); cc++)
        if (lv.get(cc, rr) === T.COIN) { lv.set(cc, rr, T.EMPTY); g.addCoin(); g.addScore(200); g.pollenFly(cc * TILE + 8, rr * TILE + 8, 0, -1.5, 0); }
  }
  burst(g) {
    for (let i = 0; i < 26; i++) g.particles.push({ kind: 'px', x: this.cx + rand(-this.r, this.r), y: this.cy + rand(-this.r, this.r), vx: rand(-2.5, 2.5) - this.dir, vy: rand(-4, -0.5), g: 0.2, life: 50, t: 0, color: i % 3 ? '#ffffff' : '#bfe9ff', size: i % 2 ? 2 : 3 });
    g.shake = Math.max(g.shake, 4);
    Sound.play('shatter'); Sound.play('thud');
    const p = g.player;
    if (p.platform === this) { p.vy = this.fling ? -8.5 : -3.5; p.vx = this.dir * (this.fling ? 2 : 1); p.onGround = false; p.platform = null; p.jumping = true; }
    this.state = 'gone';
  }
  draw(ctx) {
    if (this.state === 'gone') return;
    // (in fine pixels: hires.js) a packed ball of snow, shaded, bits of grit tumbling with its spin
    const cx = this.cx + (this.wobble ? ((this.wobble >> 1) % 2 ? 1 : -1) : 0), cy = this.cy, r = this.r;
    fBlob(ctx, cx, cy, r + 0.8, INK); fBlob(ctx, cx, cy, r, '#a8c8e8'); fBlob(ctx, cx - r * 0.12, cy - r * 0.14, r * 0.86, '#d8eaf8'); fBlob(ctx, cx - r * 0.25, cy - r * 0.3, r * 0.6, '#ffffff');
    fEll(ctx, cx - r * 0.45, cy - r * 0.55, r * 0.2, r * 0.12, '#ffffff');
    for (let i = 0; i < 7; i++) {
      const a = this.spin + i * 0.8976, k = [0.45, 0.75, 0.3, 0.62, 0.82, 0.5, 0.7][i];
      const px = cx + Math.cos(a) * r * k, py = cy + Math.sin(a) * r * k;
      if (Math.sin(a) > -0.2 || k < 0.6) fEll(ctx, px, py, 0.9, 0.7, i === 2 ? '#7a5a3a' : '#8aa4bd');
    }
  }
}

// Weathervane: a brass rooster on a pole. Touch it to swing it round: from then on every gust
// blows its way (a tailwind), harder than before, and the next gust comes right away.
class Weathervane extends Enemy {
  constructor(col, row, dir, force) {
    super(col * TILE + 5, (row - 2) * TILE, 6, TILE * 3);
    this.dir = -dir; this.want = dir; this.force = force || 1.6; this.turn = 0;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false; this.noFreeze = true;
  }
  touches() { return false; }
  update(g) {
    this.t++;
    if (this.turn > 0) this.turn--;
    const p = g.player;
    if (this.dir === this.want || p.state !== 'play' || !overlap(this, p)) return;
    this.dir = this.want; this.turn = 40;
    g.windLock = this.dir; g.windMul = this.force;
    g.windT = 0; g.windDir = this.dir;   // restart the cycle: the first tailwind is on its way
    g.say('TAILWIND!', 'JUMP WITH THE GUST TO FLY FAR', '#9fe3ff');
    Sound.play('whoosh'); Sound.play('bell');
  }
  draw(ctx) {
    const x = Math.round(this.x + 3) + 0.5, y = Math.round(this.y);   // (painted fine: vaneArt below)
    fRoundRect(ctx, x - 1.4, y + 6, 2.8, this.h - 6, 1, INK); fRect(ctx, x - 0.7, y + 7, 1.4, this.h - 7, '#8a6a3a'); fRect(ctx, x - 0.7, y + 7, 0.5, this.h - 7, '#b8945a');
    // compass arms
    fRoundRect(ctx, x - 5.6, y + 10.8, 11.2, 3.2, 1.4, INK); fRoundRect(ctx, x - 4.8, y + 11.6, 9.6, 1.4, 0.7, '#c8891e'); fRect(ctx, x - 4.4, y + 11.7, 8.8, 0.4, '#ffd166');
    fBlob(ctx, x, y + 6.6, 1.6, INK); fBlob(ctx, x, y + 6.6, 0.8, '#ffd166');
    // the rooster arrow, squashed while it swings round
    const s = this.turn ? Math.cos(this.turn * 0.4) : 1, d = this.dir * (s < 0 ? -1 : 1), k = Math.max(0.08, Math.abs(s));
    ctx.save(); ctx.translate(x, y); ctx.scale(d * k, 1); ctx.drawImage(vaneArt(), -9.5, -7); ctx.restore();
    if (this.turn) for (let i = 0; i < 3; i++) fRoundRect(ctx, x + d * (12 + i * 4) - 1.5, y + 3 + i, 3, 0.8, 0.4, '#e6f2ff');
  }
}

// Avalanche: once Chickaroo passes column `col` the mountain lets go, and a churning wall of snow
// chases him to the right at `speed` (never far off-screen). Being caught is fatal; foes are
// swallowed. It spends itself crashing at column `until`.
class Avalanche extends Enemy {
  constructor(col, until, speed) {
    super(col * TILE, 0, 1, VIEW_H);
    this.trig = col * TILE; this.until = until * TILE; this.speed = speed || 2.1;
    this.state = 'wait'; this.front = 0; this.v = 0;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false; this.noFreeze = true;
    this.drawOver = true;
  }
  touches() { return false; }
  update(g) {
    this.t++;
    const p = g.player;
    if (this.state === 'wait') {
      if (p.x < this.trig) return;
      this.state = 'run'; this.front = Math.min(g.camX, p.x - 200) - 30; this.t = 0; g.snowTold = true;
      g.say('AVALANCHE!', 'RIDE THE SNOWBALL!', '#ffffff', 120);   // a short shout: 2 s Sound.play('roar');
      return;
    }
    if (this.state === 'crash') {
      if (this.t > 70) this.remove = true;
      return;
    }
    this.v = Math.min(this.speed, this.v + 0.04);
    this.front = Math.max(this.front + this.v, p.x - 150);
    this.x = this.front - 4;
    g.shake = Math.max(g.shake, 1.2);
    if (this.t % 20 === 0) Sound.play('rumble');
    if (this.t % 2 === 0) g.particles.push({ kind: 'px', x: this.front + rand(-4, 2), y: rand(8, VIEW_H - 8), vx: rand(1.5, 3.5), vy: rand(-1.5, 0.5), g: 0.06, life: 30, t: 0, color: '#ffffff', size: 2 });
    for (const e of g.entities) if (e !== this && !e.dead && !e.noFreeze && e.cx < this.front) { if (e instanceof Icicle) e.remove = true; else e.flipKill(g, 1); }
    if (p.state === 'play' && p.x + 3 < this.front) g.killPlayer('avalanche');
    if (this.front >= this.until) {
      this.state = 'crash'; this.t = 0;
      g.shake = 8; Sound.play('thud'); Sound.play('shatter');
      for (let i = 0; i < 50; i++) g.particles.push({ kind: 'px', x: this.front + rand(-20, 6), y: rand(0, VIEW_H), vx: rand(-1, 4), vy: rand(-5, 1), g: 0.2, life: 70, t: 0, color: i % 3 ? '#ffffff' : '#bfe9ff', size: 2 + (i % 2) });
    }
  }
  draw(ctx, g) {
    if (this.state !== 'run') {
      // the spent snow settles into a bank
      if (this.state === 'crash') { const a = 1 - this.t / 70; ctx.globalAlpha = Math.max(0, a); this.wall(ctx, g, 0); ctx.globalAlpha = 1; }
      return;
    }
    this.wall(ctx, g, 1);
  }
  wall(ctx, g, live) {
    const left = Math.floor(g.camX) - 8, t = this.t;
    const ink = [], shade = [], body = [], light = [], S = 1 / ART_R;   // (an art row at a time: hires.js)
    for (let y = 0; y < VIEW_H; y += S) {
      const off = Math.sin(y * 0.07 + t * 0.21) * 7 + Math.sin(y * 0.19 - t * 0.13) * 4 - (y < 40 ? (40 - y) * 0.4 : 0);
      const fx = this.front + off, bump = Math.sin(y * 0.6 + t * 0.3) * 1.2;
      if (fx <= left) continue;
      ink.push([left, y, fx - left + 0.7 + bump, S]); shade.push([left, y, fx - left + bump, S]);
      body.push([left, y, fx - left - 2.6 + bump, S]); light.push([left, y, fx - left - 8 + bump * 0.5, S]);
    }
    fRects(ctx, INK, ink); fRects(ctx, '#9cc4e4', shade); fRects(ctx, '#d8eaf8', body); fRects(ctx, '#ffffff', light);
    if (!live) return;
    // boulders and snow clods tumbling along the front
    for (let i = 0; i < 6; i++) {
      const y = ((i * 41 + t * (1.2 + i * 0.3)) % (VIEW_H + 20)) - 10, x = this.front - 4 + Math.sin(t * 0.1 + i) * 4;
      fBlob(ctx, x, y, 4.6 + (i % 3), INK); fBlob(ctx, x, y, 3.8 + (i % 3), i % 2 ? '#e6f2ff' : '#7f8ea3'); fBlob(ctx, x - 1, y - 1, 1.6 + (i % 3) * 0.5, i % 2 ? '#ffffff' : '#a8b4c4');
    }
  }
}

// the weathervane's 1x drawing, lifted to the fine screen (hires.js)

// the weathervane's brass rooster on its arrow, 20 x 16, the pivot at (9.5, 7), pointing +x (painted fine: mArt)
let VANE_ART = null;
function vaneArt() {
  if (VANE_ART) return VANE_ART;
  const A = mArt(20, 16), X = x => 9.5 + x, Y = y => 7 + y, B = ['#7a4a10', '#a8701e', '#e0a838', '#ffd166', '#fff0b0'];
  A.line(X(-8.5), Y(3.4), X(8), Y(3.4), B[2], null, 1.4);                                              // the shaft
  A.poly([[X(6), Y(0.4)], [X(10.6), Y(4.1)], [X(6), Y(7.8)], [X(7.2), Y(4.1)]], B[3]);                 // the arrowhead
  A.poly([[X(-9), Y(-2.6)], [X(-5.6), Y(2.4)], [X(-4), Y(5)], [X(-9), Y(5.4)], [X(-7.4), Y(3.4)]], B[2]);   // the tail fin
  A.soft(X(0.2), Y(0.2), 3.4, 2.4, B);                                                                  // the rooster: body...
  A.soft(X(-3.2), Y(-1.8), 1.6, 2.6, B, null, -0.5);                                                   // ...tail...
  A.soft(X(2.6), Y(-2.4), 1.6, 1.6, B);                                                                 // ...head
  A.poly([[X(4), Y(-2.8)], [X(5.6), Y(-2.2)], [X(4), Y(-1.6)]], B[1]);                                 // beak
  A.line(X(-0.6), Y(2.2), X(-0.6), Y(3.4), B[1], null, 0.5); A.line(X(1.2), Y(2.2), X(1.4), Y(3.4), B[1], null, 0.5);   // legs
  A.outline();
  for (const [cx, cy] of [[1.8, -4.4], [2.8, -4.8], [3.6, -4.2]]) A.ell(X(cx), Y(cy), 0.7, 0.8, '#ff4d6d');   // the red comb
  A.ell(X(2.9), Y(-2.6), 0.35, 0.35, INK);
  A.line(X(-7.4), Y(3.1), X(6.6), Y(3.1), B[4], null, 0.34);
  return (VANE_ART = A.canvas());
}
