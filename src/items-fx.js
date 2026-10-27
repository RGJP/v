'use strict';
class Item {
  // `down`: the block has rock on top, so the item slides out of its underside instead
  constructor(kind, col, row, down) {
    this.kind = kind; this.dir = down ? 1 : -1;
    this.x = col * TILE + 1; this.w = 14; this.h = 16;
    this.baseY = row * TILE; this.y = this.baseY;
    this.emerge = 0; this.vx = 0; this.vy = 0; this.t = 0; this.remove = false;
  }
  get emerging() { return this.emerge < 16; }
  update(g) {
    this.t++;
    if (this.emerging) {
      this.emerge += 0.5;
      this.y = this.baseY + this.dir * this.emerge;
      if (!this.emerging && !SUIT_OF[this.kind] && this.kind !== 'coin') this.vx = 1.1;
      return;
    }
    if (SUIT_OF[this.kind] || this.kind === 'coin') { this.y = this.baseY + this.dir * 16 + Math.round(Math.sin(this.t * 0.1)); return; }   // (they stay put on top of the block)
    const lv = g.level;
    this.vy = Math.min(this.vy + 0.3, 5);
    if (sweepX(lv, this, this.vx)) this.vx = -this.vx;
    if (sweepY(lv, this, this.vy)) this.vy = 0;
    if (this.y > VIEW_H + 20 || this.x + this.w < g.camX - 64) this.remove = true;
  }
  draw(ctx) {
    if (this.kind === 'oneup') { drawApple(ctx, Math.round(this.x + 7), Math.round(this.y + 16), this.t); return; }
    if (this.kind === 'coin') { drawGoldCoin(ctx, Math.round(this.x + 7), Math.round(this.y + 9), this.t); return; }
    const suit = SUIT_OF[this.kind];
    let img = this.kind === 'berry' ? SPR.berry : this.kind === 'oneup' ? SPR.heart : (Math.floor(this.t / 6) % 2 ? SPR.pepperB : SPR.pepperA);
    if (suit && suit !== 'fire' && !this.emerging) {
      img = SPR[SUIT_INFO[suit].icon];
      ctx.globalAlpha = 0.22 + Math.sin(this.t * 0.15) * 0.08; blob(ctx, this.x + 7, this.y + 8, 11, SUIT_INFO[suit].color); ctx.globalAlpha = 1;
    } else if (suit && suit !== 'fire') img = SPR[SUIT_INFO[suit].icon];
    drawSprite(ctx, img, this.x + 7, this.y + 16, false);
  }
}

// A gold coin (3-1: the camel's fare), spinning on the spot: a 'C' stamped on its face
function drawGoldCoin(ctx, cx, cy, t) {   // (in fine pixels: hires.js) a gold disc turning smoothly on its axis
  const turn = Math.cos(t * 0.09), w = Math.max(0.6, Math.abs(turn) * 6.2), face = turn > 0;
  fEll(ctx, cx, cy, w + 1, 7, INK);
  const g = ctx.createLinearGradient(cx - w, cy - 6, cx + w, cy + 6); g.addColorStop(0, '#fff0a8'); g.addColorStop(0.35, '#f4c840'); g.addColorStop(1, '#a8741a');
  fEll(ctx, cx, cy, w, 6, g);
  if (w > 2.4) {
    fEll(ctx, cx, cy, w * 0.72, 4.4, face ? '#e8b830' : '#d8a020');
    ctx.save(); ctx.translate(cx, cy); ctx.scale(w / 6.2 * (face ? 1 : -1), 1);   // the 'C' stamped on it, turning with it
    ctx.strokeStyle = '#a8741a'; ctx.lineWidth = 1.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, 2.4, 0.75, Math.PI * 2 - 0.75); ctx.stroke();
    ctx.restore();
  }
  fEll(ctx, cx - w * 0.45, cy - 3.6, Math.max(0.4, w * 0.3), 1, '#fff8d0');
  if (t % 50 < 6) fSparkle(ctx, cx - 3.5, cy - 4, 2.6);
}

// The 1-UP: a shiny red apple with a stalk and a leaf, bottom-centred on (cx, by), glinting now and then.
function drawApple(ctx, cx, by, t) {
  drawSprite(ctx, fineAppleItem(), cx, by, false);
  if (t % 60 < 5) { fLine(ctx, cx - 4.5, by - 11, cx - 4.5, by - 8.5, '#ffffff', 1); fLine(ctx, cx - 5.7, by - 9.7, cx - 3.3, by - 9.7, '#ffffff', 1); }
}

class Fireball {
  constructor(x, y, dir) { this.x = x; this.y = y; this.w = 8; this.h = 8; this.vx = dir * 4.2; this.vy = 1.5; this.t = 0; this.remove = false; }
  update(g) {
    this.t++;
    const lv = g.level;
    this.vy = g.wet(this.x) ? 0 : Math.min(this.vy + 0.4, 5);
    if (g.wet(this.x) && this.t % 3 === 0) g.spark(this.x + 4, this.y + 4, '#cdefff', 16, 0, -0.4);
    if (sweepX(lv, this, this.vx)) { this.pop(g); return; }
    const r = sweepY(lv, this, this.vy);
    if (r === 1) this.vy = -3.4; else if (r === -1) this.vy = 1;
    if (this.y > VIEW_H || this.x < g.camX - 16 || this.x > g.camX + VIEW_W + 16) { this.remove = true; return; }
    for (const e of g.entities) {
      if (e.dead || !(e.fireKill || e.fireHit)) continue;
      const b = e.hitbox();
      if (b && overlap(this, b)) {
        if (e.fireHit) { e.fireHit(g, CHILI_DMG[0]); this.pop(g); return; }
        e.flipKill(g, Math.sign(this.vx));
        g.addScore(200, e.cx, e.y);
        Sound.play('kick');
        this.pop(g);
        return;
      }
    }
  }
  pop(g) {
    this.remove = true;
    for (let i = 0; i < 6; i++) g.spark(this.x + 4, this.y + 4, i % 2 ? '#ffd166' : '#ff8a2a', 14, rand(-1.5, 1.5), rand(-1.5, 1.5));
  }
  draw(ctx) {
    const cx = this.x + 4, cy = this.y + 4;
    fGlow(ctx, cx - Math.sign(this.vx) * 3, cy, 6, '#ff8a2a', 0.4);
    drawSpun(ctx, SPR.pepperA, cx, cy, 11, this.t * 0.45 * Math.sign(this.vx));
  }
}

// Draw a sprite centred at (cx, cy), scaled to `size` px and rotated by `a` radians.
function drawSpun(ctx, img, cx, cy, size, a) {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.rotate(a);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
}

// Charged chili shots. Level 1 "hot pepper": a big chili flying straight, pierces three foes.
// Level 2 "chili blast": a huge blazing chili with a fire beam behind it that pierces everything
// (even fire-proof critters) and smashes blocks; encounter-specific armour still blocks it.
class ChiliShot {
  constructor(x, y, dir, level) {
    this.level = level; this.dir = dir;
    this.w = level === 2 ? 28 : 14; this.h = level === 2 ? 20 : 10;
    this.x = x - (dir > 0 ? 0 : this.w); this.y = y - this.h / 2;
    this.x0 = this.x;
    this.vx = dir * (level === 2 ? 5.2 : 5); this.t = 0; this.remove = false;
    this.pierce = level === 2 ? Infinity : 3; this.hits = new Set(); this.bumped = new Set();
  }
  update(g) {
    this.t++;
    const lv = g.level;
    this.x += this.vx;
    const big = this.level === 2, cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    // trail
    for (let i = 0; i < (big ? 4 : 2); i++) {
      g.particles.push({ kind: 'px', x: cx - this.dir * rand(4, this.w / 2 + 4), y: cy + rand(-this.h / 2, this.h / 2), vx: -this.dir * rand(0.5, 1.5), vy: rand(-0.6, 0.3), g: -0.02, life: big ? 26 : 16, t: 0, color: ['#ff3b2f', '#ff8a2a', '#ffd166', '#ffffff'][i % 4], size: big ? 2 : 1 });
    }
    if (big && this.t % 3 === 0) g.particles.push({ kind: 'pep', x: cx - this.dir * 10, y: cy + rand(-8, 8), vx: -this.dir * rand(0.4, 1.2), vy: rand(-1.2, 1.2), g: 0.05, life: 40, t: 0, spin: rand(-0.4, 0.4) });
    // terrain: blocks in a blast's path get hit; anything else stops the shot
    const c0 = Math.floor(this.x / TILE), c1 = Math.floor((this.x + this.w - 0.01) / TILE);
    const r0 = Math.floor(this.y / TILE), r1 = Math.floor((this.y + this.h - 0.01) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const t = lv.get(c, r);
      if (!lv.solid(c, r)) continue;
      const block = t === T.BRICK || t === T.MULTI || t === T.QCOIN || t === T.QPOW || t === T.Q1UP;
      if (big && block) { const k = r * lv.w + c; if (!this.bumped.has(k)) { this.bumped.add(k); g.hitBlock(c, r); } continue; }
      if (big && t === T.USED) continue;
      this.pop(g); return;
    }
    if (this.x > g.camX + VIEW_W + 40 || this.x + this.w < g.camX - 40) { this.remove = true; return; }
    // foes
    for (const e of g.entities) {
      if (e.dead || this.hits.has(e)) continue;
      if (!(e.fireKill || e.fireHit || (big && e.beamKill))) continue;
      const b = e.hitbox();
      if (!b || !overlap(this, b)) continue;
      this.hits.add(e);
      if (e.fireHit) { e.fireHit(g, CHILI_DMG[this.level]); this.pop(g); return; }
      e.flipKill(g, this.dir);
      g.addScore(big ? 500 : 300, e.cx, e.y);
      g.burst(e.cx, e.y + e.h / 2, ['#ff8a2a', '#ffd166', '#ffffff'], 8);
      Sound.play('kick');
      if (--this.pierce <= 0) { this.pop(g); return; }
    }
  }
  pop(g) {
    this.remove = true;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2, big = this.level === 2;
    g.burst(cx, cy, ['#ff3b2f', '#ff8a2a', '#ffd166', '#ffffff'], big ? 30 : 12);
    if (big) { g.shake = Math.max(g.shake, 4); Sound.play('break'); }
  }
  draw(ctx) {
    const big = this.level === 2, cx = this.x + this.w / 2, cy = this.y + this.h / 2, t = this.t, d = this.dir;
    if (big) {
      // fire beam stretching back toward where it was fired
      const len = Math.min(110, Math.abs(this.x - this.x0) + 10);
      for (let i = len; i > 0; i -= 4) {
        const k = i / len, r = Math.max(2, Math.round(9 * (1 - k)) + ((t + i) % 8 < 4 ? 1 : 0));
        const bx = cx - d * i, by = cy + Math.sin(i * 0.25 - t * 0.6) * 3 * k;
        ctx.globalAlpha = 0.85 - k * 0.6;
        blob(ctx, bx, by, r + 1, '#ff3b2f'); blob(ctx, bx, by, r, k < 0.4 ? '#ffd166' : '#ff8a2a');
      }
      ctx.globalAlpha = 1;
      ctx.globalAlpha = 0.35 + (t % 6 < 3 ? 0.15 : 0); blob(ctx, cx, cy, 18, '#ffd166'); ctx.globalAlpha = 1;
      blob(ctx, cx, cy, 12, '#ff6a1f'); blob(ctx, cx, cy, 9, '#ffd166'); blob(ctx, cx, cy, 5, '#ffffff');
      drawSpun(ctx, SPR.pepperB, cx + d * 2, cy, 30, d > 0 ? -Math.PI * 0.75 : Math.PI * 0.25);
    } else {
      for (let i = 1; i <= 4; i++) { ctx.globalAlpha = 0.6 - i * 0.12; blob(ctx, cx - d * i * 5, cy, 5 - i, '#ff8a2a'); }
      ctx.globalAlpha = 0.4; blob(ctx, cx, cy, 9, '#ffb347'); ctx.globalAlpha = 1;
      drawSpun(ctx, t % 4 < 2 ? SPR.pepperA : SPR.pepperB, cx, cy, 18, d > 0 ? -Math.PI * 0.75 : Math.PI * 0.25);
    }
  }
}

// ═══ Power-up suits: ice wand, gale feather, volt orb ═══════════════════════
// Which foes can be frozen: anything that walks, flies or swims. Hazards, the boss and things
// built into the scenery (log-worms, springs, icicles) are left alone.
function canFreeze(e) {
  if (e.dead || e.remove || e.bossHazard || e.passive || e.noFreeze) return false;
  if (e instanceof IceBlock || e instanceof Boss || e instanceof Firebar || e instanceof Ember || e instanceof Spring ||
      e instanceof Icicle || e instanceof Snapvine) return false;
  if (e instanceof Shellback && e.state !== 'walk' && e.state !== 'shell') return false;
  return true;
}

// A frozen foe: a block of ice with the critter inside. Leave it and it thaws out again; walk
// into it to kick it sliding, hold run to pick it up and throw it (up = lob, down = set it down).
// A thrown block bowls over the foes it hits, bursts on walls and smashes bricks.
class IceBlock extends Shellback {
  constructor(inner) {
    super(0, 0);
    this.inner = inner;
    this.w = Math.max(inner.w + 2, 14); this.h = Math.max(inner.h + 2, 14);
    this.x = inner.x + inner.w / 2 - this.w / 2; this.y = inner.y + inner.h - this.h;
    this.vx = 0; this.vy = Math.max(0, inner.vy || 0); this.state = 'shell'; this.walker = true;
    this.stompable = false; this.melt = 0; this.grace = 18; this.seed = Math.random() * 6;
  }
  update(g) {
    this.t++;
    if (this.grace > 0) this.grace--;
    const lv = g.level;
    if (this.state === 'held') { this.updateHeld(g); return; }
    if (this.state === 'slide') {
      this.vy = Math.min(this.vy + 0.3, 5);
      if (sweepX(lv, this, this.vx)) { this.crash(g); return; }
      if (sweepY(lv, this, this.vy)) this.vy = 0;
      if (this.t % 2 === 0) g.spark(this.cx - Math.sign(this.vx) * 6, this.y + this.h - 2, '#e6f8ff', 14, 0, -0.3);
      if (this.combo >= 2) { this.shatter(g); return; }          // spent after a couple of foes
      if (this.y > VIEW_H + 32 || this.x > g.camX + VIEW_W + 64 || this.x + this.w < g.camX - 64) this.remove = true;
      return;
    }
    if (this.state === 'toss') {
      this.vy = Math.min(this.vy + 0.3, 5);
      if (sweepX(lv, this, this.vx)) this.vx = -this.vx * 0.5;
      const r = sweepY(lv, this, this.vy);
      if (r === 1) { this.state = 'shell'; this.walker = true; this.vx = 0; this.vy = 0; this.grace = 8; }
      else if (r === -1) this.vy = 0.5;
      if (this.y > VIEW_H + 32) this.remove = true;
      return;
    }
    this.vx = 0; this.walk(g, false);
    if (++this.melt > ICE_MELT) this.thaw(g);
    else if (this.melt > ICE_MELT - 150 && this.t % 9 === 0) g.spark(this.x + rand(2, this.w - 2), this.y + this.h - 2, '#9be8ff', 18, 0, 0.3);
  }
  updateHeld(g) {
    const p = g.player;
    this.melt += 0.5;
    if (p.state !== 'play') { g.dropHeld(); return; }
    this.holdPos(p);
    if (this.melt > ICE_MELT) { this.shatter(g); return; }
    if (!Input.down('run')) g.throwHeld();
  }
  kick(g, p) {
    const dir = p.x + p.w / 2 < this.cx ? 1 : -1;
    this.state = 'slide'; this.walker = false; this.grace = 12; this.combo = 0; this.vx = SHELL_SPEED * dir;
    sweepX(g.level, this, dir > 0 ? (p.x + p.w) - this.x + 1 : (p.x - this.w) - this.x - 1);
    Sound.play('kick');
  }
  onTouch(g, p) {
    const stomp = g.isStomp(p, this);
    if (this.state === 'slide') {
      if (this.grace > 0) return;
      if (stomp) { this.state = 'shell'; this.walker = true; this.vx = 0; this.grace = 12; g.bounce(p); Sound.play('stomp'); }
      else g.hurtPlayer();
      return;
    }
    if (this.grace > 0) return;
    if (this.state === 'toss') { if (Input.down('run') && !g.held) g.pickUp(this); return; }
    if (stomp) { g.bounce(p); this.grace = 6; Sound.play('bump'); g.spark(this.cx, this.y, '#ffffff', 14); }
    else if (Input.down('run') && !g.held) g.pickUp(this);
    else this.kick(g, p);
  }
  flipKill(g) { this.shatter(g); }
  // burst on a wall; bricks in the way go with it
  crash(g) {
    const lv = g.level, dir = Math.sign(this.vx);
    const c = dir > 0 ? Math.floor((this.x + this.w + 0.5) / TILE) : Math.floor((this.x - 0.5) / TILE);
    for (let r = Math.floor(this.y / TILE); r <= Math.floor((this.y + this.h - 1) / TILE); r++) {
      if (lv.get(c, r) === T.BRICK) { lv.set(c, r, T.EMPTY); g.breakBrick(c, r); }
    }
    this.shatter(g);
  }
  shatter(g) {
    if (this.dead) return;
    this.dead = true; this.remove = true;
    if (g.held === this) g.held = null;
    const cx = this.cx, cy = this.y + this.h / 2;
    for (let i = 0; i < 14; i++) g.particles.push({ kind: 'px', x: cx + rand(-5, 5), y: cy + rand(-5, 5), vx: rand(-2.2, 2.2), vy: rand(-3, 0.5), g: 0.25, life: 36, t: 0, color: ['#ffffff', '#bff0ff', '#7fd4ff'][i % 3], size: 2 });
    g.burst(cx, cy, ['#ffffff', '#bff0ff'], 8);
    g.shake = Math.max(g.shake, 1.5);
    Sound.play('shatter');
  }
  thaw(g) {
    const e = this.inner;
    e.x = this.cx - e.w / 2; e.y = this.y + this.h - e.h; e.vy = 0; e.dead = false; e.remove = false;
    if (e.onThaw) e.onThaw();
    g.entities.push(e);
    this.remove = true;
    for (let i = 0; i < 8; i++) g.spark(this.cx + rand(-6, 6), this.y + rand(0, this.h), '#e6f8ff', 22, rand(-0.3, 0.3), rand(-0.9, -0.2));
    Sound.play('select');
  }
  draw(ctx, g) {
    const e = this.inner;
    e.x = this.x + (this.w - e.w) / 2; e.y = this.y + this.h - e.h - 1;
    const warn = this.state !== 'slide' && this.state !== 'toss' && this.melt > ICE_MELT - 150;
    const wob = warn && Math.floor(this.t / 2) % 2 ? 1 : 0;
    ctx.save();
    ctx.translate(wob, 0);
    const wasDead = e.dead; e.dead = false;   // (it's frozen alive: draw it as itself, not as the corpse its `dead` flag would paint)
    e.draw(ctx, g);
    e.dead = wasDead;
    const x = fSnap(this.x), y = fSnap(this.y), w = this.w, h = this.h;
    fRoundRect(ctx, x - 0.5, y - 0.5, w + 1, h + 1, 2.1, '#427c98', 2);
    ctx.globalAlpha = warn ? 0.2 : 0.28;fRoundRect(ctx, x, y, w, h, 1.7, '#c0edf0');ctx.globalAlpha = 1;
    fLine(ctx, x + 1.5, y + 0.4, x + w - 1.5, y + 0.4, '#edfdf3', 1);
    fLine(ctx, x + 0.4, y + 1.5, x + 0.4, y + h - 1.5, '#c9f3ed', 1);
    fLine(ctx, x + w - 0.4, y + 1.5, x + w - 0.4, y + h - 1.5, '#5aa5bd', 2);
    fLine(ctx, x + 1.5, y + h - 0.4, x + w - 1.5, y + h - 0.4, '#6db8cb', 2);
    ctx.save();ctx.beginPath();ctx.rect(x + 1, y + 1, w - 2, h - 2);ctx.clip();ctx.globalAlpha = 0.22;
    fPoly(ctx, [[x + 1, y + h * 0.3], [x + w * 0.45, y], [x + w * 0.7, y], [x + 1, y + h * 0.55]], '#ffffff');ctx.restore();
    const gl = (this.t * 0.35 + this.seed * 3) % (w + h + 12) - 6;
    if (gl > 2 && gl < w - 2) {fLine(ctx, x + gl - 1.2, y + 2.5, x + gl + 1.2, y + 2.5, '#ffffff', 1);fLine(ctx, x + gl, y + 1.3, x + gl, y + 3.7, '#ffffff', 1);}
    if (warn) {fLine(ctx, x + 4, y + 1.5, x + 5.3, y + 5, '#e7fbf2', 1);fLine(ctx, x + 5.3, y + 5, x + 4.7, y + 7, '#e7fbf2', 1);}
    ctx.restore();
  }
}

// Frost bolt: freezes susceptible foes into IceBlocks; MAGMAW's armour blocks it.
class IceBolt {
  constructor(x, y, dir) {
    this.x = x; this.y = y; this.w = 8; this.h = 8; this.dir = dir; this.vx = dir * 4.6;
    this.t = 0; this.remove = false; this.level = 9;
  }
  update(g) {
    this.t++;
    if (sweepX(g.level, this, this.vx)) { this.pop(g); return; }
    if (this.t % 2 === 0) g.spark(this.x + 4 - this.dir * 3, this.y + 4 + rand(-2, 2), this.t % 4 ? '#ffffff' : '#9be8ff', 18, -this.dir * 0.3, rand(-0.2, 0.4));
    if (this.x < g.camX - 24 || this.x > g.camX + VIEW_W + 24 || this.y > VIEW_H) { this.remove = true; return; }
    for (const e of g.entities) {
      if (e.dead || e.remove) continue;
      const b = e.hitbox();
      if (!b || !overlap(this, b)) continue;
      if (e.iceHit) { e.iceHit(g); this.pop(g); return; }
      if (!canFreeze(e)) continue;
      g.freezeEnemy(e);
      this.pop(g);
      return;
    }
  }
  pop(g) {
    this.remove = true;
    for (let i = 0; i < 7; i++) g.spark(this.x + 4, this.y + 4, i % 2 ? '#ffffff' : '#7fd4ff', 18, rand(-1.4, 1.4), rand(-1.4, 1.4));
  }
  draw(ctx) {
    const cx = fSnap(this.x + 4), cy = fSnap(this.y + 4), d = this.dir;
    fGlow(ctx, cx, cy, 7, '#8fe4ff', 0.25);
    ctx.globalAlpha = 0.35; fLine(ctx, cx - d * 10, cy, cx - d * 3, cy, '#b8f2ff', 2); ctx.globalAlpha = 1;
    const angle = this.t * 0.13;
    for (let i = 0; i < 6; i++) {
      const a = angle + i * Math.PI / 3, ux = Math.cos(a), uy = Math.sin(a);
      fLine(ctx, cx, cy, cx + ux * 4.1, cy + uy * 4.1, '#4b9ec3', 3);
      fLine(ctx, cx, cy, cx + ux * 4.1, cy + uy * 4.1, '#e8fdff', 1);
      for (const side of [-1, 1]) fLine(ctx, cx + ux * 2.6, cy + uy * 2.6, cx + ux * 2.1 - uy * side * 0.9, cy + uy * 2.1 + ux * side * 0.9, '#bcf3ff', 1);
    }
    fBlob(ctx, cx, cy, 0.8, '#ffffff');
  }
}

// Gale gust: a pulse of wind that hurls foes away, sends shells and ice sliding, blows enemy
// shots off course and scoops up pollen in its path.
class Gust {
  constructor(x, y, dir) {
    this.dir = dir; this.w = 20; this.h = 28; this.x = x - (dir > 0 ? 0 : this.w); this.y = y - this.h / 2;
    this.vx = dir * 3.4; this.t = 0; this.remove = false; this.level = 9; this.hits = new Set();
  }
  update(g) {
    this.t++;
    const lv = g.level, d = this.dir;
    this.x += this.vx;
    if (this.t > 38 || lv.solid(Math.floor((this.x + (d > 0 ? this.w : 0)) / TILE), Math.floor((this.y + this.h / 2) / TILE))) { this.remove = true; return; }
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    for (let i = 0; i < 2; i++) g.particles.push({ kind: 'px', x: cx - d * rand(0, 8), y: cy + rand(-12, 12), vx: -d * rand(0.2, 1), vy: rand(-0.2, 0.2), life: 14, t: 0, color: i ? '#ffffff' : '#d8ffe4', size: 1, streak: 4 });
    for (let r = Math.floor(this.y / TILE); r <= Math.floor((this.y + this.h) / TILE); r++) {
      for (let c = Math.floor(this.x / TILE); c <= Math.floor((this.x + this.w) / TILE); c++) {
        if (lv.get(c, r) === T.COIN) { lv.set(c, r, T.EMPTY); g.addCoin(); g.addScore(200); g.pollenFly(c * TILE + 8, r * TILE + 8, 0, -1.5, 0); }
      }
    }
    for (const e of g.entities) {
      if (e.dead || e.remove || this.hits.has(e) || e === g.held) continue;
      const b = e.hitbox();
      if (!b || !overlap(this, b)) continue;
      this.hits.add(e);
      if (e.bossHazard) { e.remove = true; g.burst(e.cx, e.y + e.h / 2, ['#ffffff', '#d8ffe4'], 6); Sound.play('kick'); continue; }
      if (e instanceof Shellback && e.state === 'shell') {
        e.state = 'slide'; e.walker = false; e.grace = 0; e.combo = 0; e.vx = SHELL_SPEED * d; Sound.play('kick');
        continue;
      }
      if (e.fireHit) { e.fireHit(g, 1); continue; }
      if (!e.fireKill) continue;
      e.flipKill(g, d);
      g.addScore(200, e.cx, e.y);
      g.burst(e.cx, e.y + e.h / 2, ['#ffffff', '#d8ffe4', '#9ae8a8'], 8);
      Sound.play('kick');
    }
  }
  draw(ctx) {
    const d = this.dir, cx = this.x + this.w / 2, cy = this.y + this.h / 2, a = Math.max(0, 1 - this.t / 44);
    for (let k = -1; k <= 1; k++) {
      let prev = null;
      for (let i = 0; i <= 36; i++) {
        const u = i / 36, turn = u * Math.PI * 1.8, r = 4.4 * (1 - u);
        const x = cx + d * (Math.cos(turn) * r + 5 - u * 13);
        const y = cy + k * 8 + Math.sin(turn - this.t * 0.2 + k) * r * 0.7;
        ctx.globalAlpha = a * (0.85 - u * 0.55);
        if (prev) { fLine(ctx, prev[0], prev[1], x, y, '#8fcaaf', 3); fLine(ctx, prev[0], prev[1] - 0.3, x, y - 0.3, '#f6fff1', 1); }
        prev = [x,y];
      }
    }
    ctx.globalAlpha = 1;
  }
}

// Lightning: jagged polylines drawn pixel by pixel, flickering for a few frames.
function plotLine(ctx, x0, y0, x1, y1, a) {
  ctx.globalAlpha = 0.22 * a; fLine(ctx, x0, y0, x1, y1, '#7ad7ff', 7);
  ctx.globalAlpha = 0.7 * a; fLine(ctx, x0, y0, x1, y1, '#a7e9ff', 3);
  ctx.globalAlpha = a; fLine(ctx, x0, y0, x1, y1, '#ffffff', 1);
  ctx.globalAlpha = 1;
}
// the ElecChik's strike: one thick forking bolt (its shape fixed when it's fired, so it never strobes), fading out softly
class Zap {
  constructor(pts) {
    this.pts = pts; this.t = 0; this.remove = false; this.level = 9;
    this.paths = [];
    const jag = (a, b, amp, w, forks) => {
      const n = Math.max(3, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 10));
      const nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1, path = [a];
      for (let i = 1; i <= n; i++) {
        const k = i / n, j = i === n ? 0 : rand(-amp, amp);
        const q = [a[0] + (b[0] - a[0]) * k + nx / nl * j, a[1] + (b[1] - a[1]) * k + ny / nl * j];
        path.push(q);
        if (forks && i > 1 && i < n && Math.random() < 0.45) {
          const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + rand(-1, 1) * 0.9, len = rand(14, 34);
          jag(q, [q[0] + Math.cos(ang) * len, q[1] + Math.sin(ang) * len], 4, w * 0.6, false);
        }
      }
      this.paths.push({ path, w });
    };
    for (let i = 0; i + 1 < pts.length; i++) jag(pts[i], pts[i + 1], 9, 1, true);
  }
  update() { if (++this.t > 16) this.remove = true; }
  draw(ctx) {
    const a = this.t < 4 ? 1 : 1 - (this.t - 4) / 12;
    for (const { path, w } of this.paths) {
      for (const [col, wd, al] of [['#ffe14d', 7 * w, 0.28], ['#fff6a0', 4 * w, 0.6], ['#ffffff', 1.8 * w, 1]]) {
        ctx.globalAlpha = a * al;
        for (let i = 1; i < path.length; i++) fLine(ctx, path[i - 1][0], path[i - 1][1], path[i][0], path[i][1], col, wd);
      }
    }
    ctx.globalAlpha = 1;
    const [x0, y0] = this.pts[0], [x, y] = this.pts[this.pts.length - 1];
    fGlow(ctx, x0, y0, 22, '#fff6a0', a * 0.6);
    fGlow(ctx, x, y, 26, '#fff6a0', a * 0.6);
    fSparkle(ctx, x, y, 8 * a + 2, '#ffffff');
  }
}

