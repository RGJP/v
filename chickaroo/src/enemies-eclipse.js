'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 2-4 ECLIPSE SPIRE: the spire's own night creatures (no one else's enemies get reused up here)
// ═══════════════════════════════════════════════════════════════════════════
//   ['wick', x, row]     Wickwisp: a grumpy little living candle with an orange flame; waddles along (and off ledges). Its
//                        flame scorches like hot coals (an OW! hop, never a hit); stomping does nothing, roll into it to snuff it
//   ['inkling', x, row]  Inkling: a blob of ink that creeps in squashy lunges toward you; turns at ledges; stompable
//   ['thorn', x, row]    Thornback: a rolling ball of black brambles; no stomping (roll into its face, or burn it)
//   ['moth', x, row]     Gloomoth: a big dusty moth drawn to Chickaroo's glow; flutters after him; stompable
//   ['gargoyle', x, row] Gargling: a little gargoyle crouched in `row` on a stone corbel (the tile under it, which stays as
//                        a ledge). Come near and its eyes glow red: it spits three balls of energy at you, then crumbles
//                        away. It can't be hurt and doesn't hurt to touch: only its shots do (dodge them)
//   ['drip', x, row]     Gloomdrop: a drop of ink clinging to the ceiling (hang it just under the roof); pass beneath
//                        and it quivers, drops, and splats into an Inkling
const inkBox = (ctx, x, y, w, h, c) => fRect(ctx, x, y, w, h, c);   // (fine: hires.js)
// outlined parts from a list of rects [x, y, w, h, colour]: every rect is first drawn a little bigger in ink (a two-art-pixel
// outline, softly rounded), then all of them in their colours on top
function inked(ctx, rects) {
  for (const r of rects) if (r[4] !== null) fRoundRect(ctx, r[0] - 2 / 3, r[1] - 2 / 3, r[2] + 4 / 3, r[3] + 4 / 3, 0.8, INK);
  for (const r of rects) if (r[4]) fRoundRect(ctx, r[0], r[1], r[2], r[3], 0.3, r[4]);
}
// a killed foe tumbles off upside down: draw it flipped about its own middle
function drawFlipped(ctx, e, fn) {
  if (!e.flipped) { fn(); return; }
  ctx.save(); ctx.translate(0, Math.round(e.y + e.h / 2) * 2); ctx.scale(1, -1); fn(); ctx.restore();
}


// ── Wickwisp ────────────────────────────────────────────────────────────────
class Wickwisp extends Enemy {
  constructor(col, row) {
    super(col * TILE + 2, (row + 1) * TILE - 16, 12, 16);
    this.vx = -0.45; this.walker = true; this.ph = col * 1.7;
    this.stompable = false; this.fireKill = true; this.rollKill = true; this.rollSnuff = true;   // a roll, a ground pound or any power-up puts it out
  }
  update(g) { this.t++; if (this.burnCool > 0) this.burnCool--; this.walk(g, false); }
  touches(p) { return !(this.burnCool > 0) && super.touches(p); }
  // its flame scorches like hot coals: touch it -- from the side or landing on top -- and Chickaroo hops off
  // with smoking feet (OW!), but it never costs him a hit (and a plain stomp doesn't put it out: a ground
  // pound does). Hold jump as he lands on it for a big hotfoot leap
  onTouch(g, p) {
    const stomp = g.isStomp(p, this), x = p.x + p.w / 2;
    if (stomp && p.pounding) { this.snuff(g); g.bounce(p); return; }   // squashed flat, flame and all
    this.burnCool = 24;
    if (p.roll > 0) g.endRoll(p);
    const leap = stomp && (Input.down('jump') || p.jumpBuf > 0);
    p.onGround = false; p.platform = null; p.coyote = 0; p.jumpBuf = 0; p.holdGrace = 0;
    p.hotFoot = 24; p.sx = 0.8; p.sy = 1.25;
    if (leap) { p.vy = -(JUMP_BASE + Math.abs(p.vx) * JUMP_BONUS) * COAL_LEAP; p.jumping = true; Sound.play('jumpBig'); }
    else { p.vy = -COAL_HOP; p.jumping = false; }
    if (!stomp) { p.vx = (x < this.cx ? -1 : 1) * 1.8; p.airMax = Math.max(p.airMax || 0, 1.8); }   // knocked back off the flame
    Sound.play('ow');
    g.burst(x, p.y + p.h, ['#ff9a3c', '#ffcf6a', '#ffe0a0'], 6);
    for (let i = 0; i < 5; i++) g.particles.push({ kind: 'px', x: x + rand(-5, 5), y: p.y + p.h - 1, vx: rand(-0.5, 0.5), vy: rand(-1.4, -0.4), g: -0.01, drag: 0.95, life: 26 + rand(0, 12), t: 0, color: i % 2 ? '#8a7a8a' : '#c8b8b8', size: 2 });
  }
  snuff(g) { g.stompScore(this); this.douse(g); }
  // power-up hits (fireball, chili beam, gust, volt, hammer, a cat's swipe...) put it out the same way; they score it themselves
  flipKill(g) { this.douse(g); }
  douse(g) {
    Sound.play('stomp');
    this.dead = true; this.snuffed = true; this.deadT = 0; this.vx = 0;
    this.burstDeath(g);
    for (let i = 0; i < 6; i++) g.particles.push({ kind: 'px', x: this.cx + rand(-2, 2), y: this.y + 2, vx: rand(-0.3, 0.3), vy: rand(-0.9, -0.4), drag: 0.95, life: 40, t: 0, color: i % 2 ? '#c8c0b8' : '#8a8478', size: 2 });
  }
  updateDead(g) { if (!this.snuffed) { super.updateDead(g); return; } if (++this.deadT > 40) this.remove = true; }
  glow(hole) { if (!this.dead) hole(this.cx, this.y - 3, 14 + Math.sin(this.t * 0.3 + this.ph) * 1.5, 0.62); }   // its own candlelight, flickering
  draw(ctx) {
    const f = this.vx < 0 ? -1 : 1, phase = this.snuffed ? 6 : Math.floor(this.t / 4) % 6;
    if (!this.snuffed) fGlow(ctx, this.cx, this.y - 5, 9, '#ffb765', 0.18);
    drawSprite(ctx, eclipseCreatureArt('wick', phase), this.cx, this.y + this.h + 1, f < 0, 1, 1, this.flipped);
  }
}

// ── Inkling ─────────────────────────────────────────────────────────────────
class Inkling extends Enemy {
  constructor(col, row, x) {
    super(x != null ? x : col * TILE - 1, (row + 1) * TILE - 14, 18, 14);
    this.walker = true; this.dir = -1; this.cool = 30 + (col * 13) % 30; this.prep = 0; this.vx = 0;
  }
  update(g) {
    this.t++;
    const p = g.player;
    if (this.prep > 0) {
      if (--this.prep === 0) { this.vx = this.dir * 2.1; Sound.play('plop'); }
    } else if (Math.abs(this.vx) < 0.15 && --this.cool <= 0) {
      this.dir = p.x + p.w / 2 < this.cx ? -1 : 1;   // it creeps toward you
      this.prep = 14; this.cool = 46;
    }
    this.vx *= 0.93;
    const was = this.vx;
    this.walk(g, true);
    if (Math.sign(this.vx) !== Math.sign(was) && was) this.dir = Math.sign(this.vx);   // bumped a wall or a ledge edge
  }
  stomp(g, p) {
    g.bounce(p); g.stompScore(this); Sound.play('stomp');
    this.dead = true; this.splat = true; this.deadT = 0; this.vx = 0;
    this.burstDeath(g);
    for (let i = 0; i < 10; i++) g.particles.push({ kind: 'px', x: this.cx + rand(-7, 7), y: this.y + 8, vx: rand(-1.6, 1.6), vy: rand(-2.2, -0.6), g: 0.18, life: 30, t: 0, color: ['#252c6e', '#5ce0ff', '#ff5fa8'][i % 3], size: 2 });
  }
  updateDead(g) { if (!this.splat) { super.updateDead(g); return; } if (++this.deadT > 50) this.remove = true; }
  glow(hole) { if (!this.dead) hole(this.cx, this.y + 6, 12, 0.5); }
  draw(ctx, g) {
    if (this.splat) {
      ctx.globalAlpha = Math.min(1, (50 - this.deadT) / 15);
      fEll(ctx, this.cx, this.y + this.h - 1, 10.5, 1.2, '#2e3f66');fEll(ctx, this.cx - 3, this.y + this.h - 1.3, 3.7, 0.4, '#99c5cf');ctx.globalAlpha = 1;return;
    }
    const prep = this.prep > 0, moving = Math.abs(this.vx) > 0.6;
    drawSprite(ctx, eclipseCreatureArt('ink', (this.t >> 3) % 4), this.cx + this.vx * 0.6, this.y + this.h, false, prep ? 1.12 : 1, prep ? 0.82 : moving ? 1.05 : 1, this.flipped);
  }
}

// ── Thornback ───────────────────────────────────────────────────────────────
class Thornback extends Enemy {
  constructor(col, row) {
    super(col * TILE - 2, (row + 1) * TILE - 20, 20, 20);
    this.vx = -0.5; this.walker = true; this.stompable = false; this.rollKill = this.rollFrontOnly = true; this.spin = 0;
  }
  update(g) { this.t++; this.walk(g, true); this.spin += this.vx / 10; }
  glow(hole) { if (!this.dead) hole(this.cx, this.y + 10, 12, 0.45); }
  draw(ctx) {
    ctx.save();ctx.beginPath();ctx.rect(this.x - 8, this.y - 8, this.w + 16, this.h + 9);ctx.clip();
    drawFlipped(ctx, this, () => {
      const phase = ((Math.round(this.spin * 12 / Math.PI) % 24) + 24) % 24;
      ctx.save(); ctx.translate(fSnap(this.cx), fSnap(this.y + 10)); ctx.scale(this.vx < 0 ? -1 : 1, 1); ctx.drawImage(eclipseCreatureArt('thorn', phase), -17, -17); ctx.restore();
    });ctx.restore();
  }
}

// ── Gloomoth ────────────────────────────────────────────────────────────────
class Gloomoth extends Enemy {
  constructor(col, row) {
    super(col * TILE, row * TILE + 2, 14, 10);
    this.baseX = this.x; this.baseY = this.y; this.state = 'idle'; this.dir = -1; this.ph = col * 0.9;
  }
  update(g) {
    this.t++;
    const p = g.player, tx = p.x + p.w / 2 - this.w / 2, ty = p.y + 2 - this.h;
    if (this.state === 'idle') {
      this.x = this.baseX + Math.sin(this.t * 0.03 + this.ph) * 6;
      this.y = this.baseY + Math.sin(this.t * 0.07 + this.ph) * 4;
      if (Math.abs(tx - this.x) < 130 && p.state === 'play') this.state = 'seek';
      return;
    }
    // drawn to his light: it drifts after him in loopy, fluttering arcs (slower than he can run)
    this.vx += clamp(tx - this.x, -1, 1) * 0.035; this.vy = (this.vy || 0) + clamp(ty - this.y, -1, 1) * 0.03;
    this.vx = clamp(this.vx, -1.05, 1.05); this.vy = clamp(this.vy, -0.8, 0.8);
    this.x += this.vx; this.y += this.vy + Math.sin(this.t * 0.25 + this.ph) * 0.9;
    this.y = Math.min(this.y, 12 * TILE - this.h - 2);
    if (Math.abs(this.vx) > 0.1) this.dir = Math.sign(this.vx);
    if (this.x + this.w < g.camX - 160) this.remove = true;
  }
  glow(hole) { if (!this.dead) hole(this.cx, this.y + 4, 10, 0.45); }
  draw(ctx) {
    const beat = Math.sin(this.t * (this.state === 'idle' ? 0.3 : 0.55) + this.ph), phase = Math.round((beat + 1) * 3);
    drawFlipped(ctx, this, () => ctx.drawImage(eclipseCreatureArt('moth', phase), fSnap(this.cx - 20), fSnap(this.y + 5 - 20)));
  }
}

// ── Gargling ────────────────────────────────────────────────────────────────
// A little gargoyle crouched on its own stone corbel, facing out at you. It can't be hurt and doesn't hurt to touch:
// it's there to keep you on your toes. Come near and, after a moment, its eyes kindle red and it spits a ball of
// energy straight at you (dodge it); three shots, then it crumbles away to nothing, leaving the corbel as a ledge.
const GARG_SHOTS = 3, GARG_CHARGE = 40, GARG_REST = 64;
class Gargling extends Enemy {
  constructor(col, row) {
    super(col * TILE - 3, (row + 1) * TILE - 19, 22, 19);
    this.col = col; this.perch = row + 1;   // its corbel: the tile under it (solid, a ledge once it's gone)
    this.state = 'wait'; this.timer = 0; this.shots = 0; this.fade = 1;
    this.passive = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false; this.noFreeze = true;
  }
  hitbox() { return null; }
  touches() { return false; }
  heat() {
    if (this.state !== 'charge') return this.state === 'fire' ? 3 : 0;
    return this.timer < GARG_CHARGE * 0.35 ? 1 : this.timer < GARG_CHARGE * 0.75 ? 2 : 3;
  }
  update(g) {
    this.t++; this.timer++;
    if (this.t === 1) g.level.set(this.col, this.perch, T.BODY);
    const p = g.player, ex = this.cx, ey = this.y + 9;
    if (this.state === 'wait') {   // stone still, until he comes near (and is on screen with it)
      const near = p.state === 'play' && Math.abs(p.x + p.w / 2 - ex) < 150 && this.x > g.camX - 8 && this.x < g.camX + VIEW_W;
      if (!near) this.timer = 0;
      else if (this.timer > 45) { this.state = 'charge'; this.timer = 0; Sound.play('chargeUp'); }
      return;
    }
    if (this.state === 'charge') {
      if (this.timer % 6 === 0) g.spark(ex + rand(-6, 6), ey + rand(-2, 2), '#ff5a4a', 14, rand(-0.3, 0.3), rand(-0.6, -0.1));
      if (this.timer >= GARG_CHARGE) {   // spit: a ball of energy straight at where he is now
        const tx = p.x + p.w / 2, ty = p.y + p.h / 2, d = Math.hypot(tx - ex, ty - ey) || 1;
        g.entities.push(new GargBolt(ex, ey + 2, (tx - ex) / d * 2.1, (ty - ey) / d * 2.1, this.col, this.perch));
        Sound.play('fire'); this.shots++; this.state = 'fire'; this.timer = 0;
      }
      return;
    }
    if (this.state === 'fire') { if (this.timer > 10) { this.state = this.shots >= GARG_SHOTS ? 'spent' : 'rest'; this.timer = 0; } return; }
    if (this.state === 'rest') { if (this.timer > GARG_REST) { this.state = 'charge'; this.timer = 0; Sound.play('chargeUp'); } return; }
    if (this.state === 'spent') {   // its work done: it crumbles to dust and is gone
      if (this.timer === 30) Sound.play('crumble');
      if (this.timer > 30) {
        this.fade = Math.max(0, 1 - (this.timer - 30) / 30);
        if (this.timer % 2 === 0) g.particles.push({ kind: 'px', x: this.x + rand(2, this.w - 2), y: this.y + rand(0, this.h), vx: rand(-0.4, 0.4), vy: rand(-0.2, 0.6), g: 0.12, life: 30, t: 0, color: ['#cfc5ad', '#9a8f78', '#f4eedc'][this.timer % 3], size: 2 });
      }
      if (this.fade <= 0) this.remove = true;
    }
  }
  glow(hole) {
    const h = this.heat();
    hole(this.cx, this.y + 10, 12, 0.35);
    if (h && this.fade > 0) hole(this.cx, this.y + 8, 8 + h * 4, 0.3 + h * 0.15);
  }
  draw(ctx) {
    const px = this.col * TILE, py = this.perch * TILE;
    ctx.drawImage(eclipseCreatureArt('corbel'), px - 6, py - 1);
    if (this.fade <= 0) return;
    const heat = this.heat(), shake = this.state === 'charge' && heat >= 2 ? Math.sin(this.t * 1.5) * 0.45 : 0;
    ctx.globalAlpha = this.fade;ctx.drawImage(eclipseCreatureArt('garg', heat), fSnap(this.cx - 14 + shake), fSnap(this.y + this.h - 25));ctx.globalAlpha = 1;
    if (heat) fGlow(ctx, this.cx, this.y + 8, 5 + heat, '#f49478', heat * this.fade * 0.07);
  }
}
// its shot: a crackling ball of red energy that flies straight and fizzles against anything solid
class GargBolt extends Enemy {
  constructor(x, y, vx, vy, pc, pr) {
    super(x - 4, y - 4, 8, 8);
    this.vx = vx; this.vy = vy; this.bossHazard = true; this.pc = pc; this.pr = pr;   // (it passes through the corbel it was fired from)
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return { x: this.x + 1, y: this.y + 1, w: 6, h: 6 }; }
  update(g) {
    this.t++;
    this.x += this.vx; this.y += this.vy;
    if (this.t % 3 === 0) g.particles.push({ kind: 'px', x: this.cx + rand(-1, 1), y: this.y + 4 + rand(-1, 1), vx: 0, vy: 0, life: 12, t: 0, color: this.t % 2 ? '#ff5a4a' : '#ffb0a0', size: 1 });
    const c = Math.floor(this.cx / TILE), r = Math.floor((this.y + 4) / TILE);
    if (g.level.solid(c, r) && !(c === this.pc && r === this.pr)) {
      g.burst(this.cx, this.y + 4, ['#ff5a4a', '#ffd0c0', '#ffffff'], 6); Sound.play('sizzle'); this.remove = true; return;
    }
    if (this.x < g.camX - 40 || this.x > g.camX + VIEW_W + 40 || this.y < -40 || this.y > VIEW_H + 20 || this.t > 360) this.remove = true;
  }
  glow(hole) { hole(this.cx, this.y + 4, 14, 0.7); }
  draw(ctx) {
    const x = this.cx, y = this.y + 4, angle = this.t * 0.5;
    fGlow(ctx, x, y, 8.5, '#ef755f', 0.35);fBlob(ctx, x, y, 4.1, '#9a3e51');fBlob(ctx, x - 0.3, y - 0.5, 3, '#e88570');fBlob(ctx, x - 0.7, y - 0.8, 1.4, '#ffebc4');
    for (const side of [-1, 1]) fLine(ctx, x + Math.cos(angle) * side * 5, y + Math.sin(angle) * side * 5, x + Math.cos(angle + 0.5) * side * 5.4, y + Math.sin(angle + 0.5) * side * 5.4, '#fbd6b9', 1);
  }
}

// ── Gloomdrop ───────────────────────────────────────────────────────────────
class Gloomdrop extends Enemy {
  constructor(col, row) {
    super(col * TILE + 1, row * TILE, 14, 16);
    this.state = 'cling'; this.timer = 0; this.stompable = false; this.top = row * TILE;
  }
  touches(p) { return this.state === 'fall' && super.touches(p); }
  hitbox() { return this.state === 'cling' ? null : this; }
  update(g) {
    this.t++; this.timer++;
    const p = g.player;
    if (this.state === 'cling') {
      if (p.state === 'play' && Math.abs(p.x + p.w / 2 - this.cx) < 30 && p.y > this.y) { this.state = 'quiver'; this.timer = 0; Sound.play('plop'); }
      return;
    }
    if (this.state === 'quiver') { if (this.timer > 26) { this.state = 'fall'; this.timer = 0; this.vy = 0; } return; }
    this.vy = Math.min(this.vy + 0.32, 6);
    if (sweepY(g.level, this, this.vy) === 1) {
      // splat! and out of the puddle crawls an inkling
      g.entities.push(new Inkling(0, Math.floor((this.y + this.h) / TILE) - 1, this.cx - 9));
      for (let i = 0; i < 10; i++) g.particles.push({ kind: 'px', x: this.cx + rand(-6, 6), y: this.y + this.h - 2, vx: rand(-1.8, 1.8), vy: rand(-2, -0.5), g: 0.2, life: 26, t: 0, color: ['#252c6e', '#5ce0ff', '#3848a8'][i % 3], size: 2 });
      Sound.play('splash');
      this.remove = true;
    }
    if (this.y > VIEW_H + 20) this.remove = true;
  }
  glow(hole) { hole(this.cx, this.y + 10, 11, 0.45); }
  draw(ctx) {
    const wob = this.state === 'quiver' ? Math.sin(this.t * 1.4) * 0.6 : Math.sin(this.t * 0.06) * 0.25;
    if (this.state !== 'fall') fLine(ctx, this.cx, this.top - 2, this.cx + wob, this.y + 7, '#7898b8', 2);
    const pose = this.state === 'fall' ? 1 : this.state === 'cling' && this.t % 160 < 8 ? 2 : 0;
    drawSprite(ctx, eclipseCreatureArt('drop', pose), this.cx + wob, this.y + this.h, false, 1, this.state === 'fall' ? 1.08 : 1);
  }
}

// The spire creatures above are painted directly in fine art pixels.
