'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 8. ENTITIES
// ═══════════════════════════════════════════════════════════════════════════
// Axis-separated tile collision. Moves are always < 1 tile per frame, so only the
// leading edge needs checking — no tunnelling is possible.
function sweepX(lv, e, dx) {
  if (!dx) return 0;
  e.x += dx;
  for (const cap of lv.secretCaps) if (overlap(e, cap)) {
    e.x = dx > 0 ? cap.x - e.w : cap.x + cap.w;
    return dx > 0 ? 1 : -1;
  }
  const top = Math.floor(e.y / TILE), bot = Math.floor((e.y + e.h - 0.01) / TILE);
  if (dx > 0) {
    const c = Math.floor((e.x + e.w - 0.01) / TILE);
    for (let r = top; r <= bot; r++) if (lv.solid(c, r)) { e.x = c * TILE - e.w; return 1; }
  } else {
    const c = Math.floor(e.x / TILE);
    for (let r = top; r <= bot; r++) if (lv.solid(c, r)) { e.x = (c + 1) * TILE; return -1; }
  }
  return 0;
}
function sweepY(lv, e, dy) {
  const prevBottom = e.y + e.h;
  e.y += dy;
  for (const cap of lv.secretCaps) if (overlap(e, cap)) {
    if (dy > 0 && prevBottom <= cap.y + 0.5) { e.y = cap.y - e.h; return 1; }
    if (dy < 0 && e.y - dy >= cap.y + cap.h - 0.5) { e.y = cap.y + cap.h; return -1; }
  }
  const c0 = Math.floor(e.x / TILE), c1 = Math.floor((e.x + e.w - 0.01) / TILE);
  if (dy > 0) {
    const r = Math.floor((e.y + e.h) / TILE);
    for (let c = c0; c <= c1; c++) {
      if (lv.solid(c, r) || (lv.get(c, r) === T.SEMI && prevBottom <= r * TILE + 0.5)) { e.y = r * TILE - e.h; return 1; }
    }
  } else if (dy < 0) {
    const r = Math.floor(e.y / TILE);
    for (let c = c0; c <= c1; c++) if (lv.solid(c, r)) { e.y = (r + 1) * TILE; return -1; }
  }
  return 0;
}

class Enemy {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0; this.t = 0;
    this.dead = false; this.remove = false; this.flipped = false; this.deadT = 0;
    this.stompable = true; this.fireKill = true; this.shellKill = true; this.bumpKill = true;
    this.walker = false; this.onGround = false;
  }
  get cx() { return this.x + this.w / 2; }
  hitbox() { return this; }
  // A foe only touches him once it's a little way into his box (HURT_INSET px at the sides and top): a graze by a pixel
  // or two isn't a hit. Coming down on top of it (a stomp), and anything friendly, uses his whole box.
  touches(p) {
    const b = this.hitbox();
    if (!b) return false;
    const m = this.stompMargin || (p.pounding ? 12 : 8);
    if (this.friendly || (p.vy > 0 && p.prevY + p.h <= b.y + m)) return overlap(b, p);
    return overlap(b, { x: p.x + HURT_INSET, y: p.y + HURT_INSET, w: p.w - HURT_INSET * 2, h: p.h - HURT_INSET });
  }
  onTouch(g, p) {
    if (this.stompable && g.isStomp(p, this)) this.stomp(g, p);
    else g.hurtPlayer();
  }
  stomp(g, p) { this.flipKill(g, 0); g.bounce(p); g.stompScore(this); Sound.play('stomp'); }
  flipKill(g, dir) {
    this.burstDeath(g, dir);
  }
  burstDeath(g, dir = 0) {
    if (this.burstDone) return;
    this.burstDone = true; this.dead = this.remove = true; this.flipped = false;
    const colors = {
      Grumblet: this.theme === 'meadow' ? ['#8c5937', '#c69b63', '#eee0b1'] : ['#9077b9', '#d0a8e7', '#79d9ba'],
      Shellback: ['#526374', '#8fa2aa', '#d4d9cb'], Chimpchuck: ['#8a5d38', '#edc693', '#d9363e'],
      Slideguin: ['#293849', '#e4eeee', '#e4a952'], Tinbird: ['#8e9cac', '#d8d4be', '#c59c53'],
      Inkling: ['#252c6e', '#5ce0ff', '#ff5fa8'],
    }[this.constructor.name] || ['#775b89', '#b897b3', '#ead9c0'];
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2, speed = rand(1.1, 3.2);
      g.particles.push({ kind: 'enemyChunk', x: this.cx + rand(-this.w * 0.3, this.w * 0.3), y: this.y + this.h / 2 + rand(-this.h * 0.3, this.h * 0.3), vx: Math.cos(a) * speed + dir * 0.5, vy: Math.sin(a) * speed - 1.8, g: 0.16, drag: 0.98, life: 36 + i % 5 * 4, t: 0, color: colors[i % colors.length], size: 1.6 + i % 3 * 0.7, spin: rand(-0.16, 0.16) });
    }
    g.burst(this.cx, this.y + this.h / 2, ['#fff4d6', '#ffffff'], 5);
  }
  updateDead() {
    this.deadT++;
    if (this.flipped) {
      this.vy = Math.min(this.vy + 0.3, 6);
      this.x += this.vx; this.y += this.vy;
      if (this.y > VIEW_H + 32) this.remove = true;
    } else if (this.deadT > 30) this.remove = true;
  }
  // Quicksand: a foe that wanders in sinks slowly, and is gone in a puff of sand once it's under.
  sandCheck(g) {
    if (this.sandProof) { this.inSand = false; return; }   // (sand snakes glide over it)
    const d = g.sandDepth(this.cx, this.y + this.h);
    this.inSand = d > 0;
    if (!this.inSand) return;
    this.vx *= 0.94;
    if (this.t % 9 === 0) g.sandPuff(this.cx, this.y + this.h - d, 1);
    if (d > this.h - 1) {
      this.dead = true; this.remove = true;
      g.sandPuff(this.cx, this.y + this.h - d, 6);
      if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('sandsink');
    }
  }
  walk(g, smart) {
    const lv = g.level;
    this.vy = Math.min(this.vy + 0.3, 5);
    if (this.inSand) this.vy = Math.min(this.vy, 0.3);
    if (sweepX(lv, this, this.vx)) this.vx = -this.vx;
    const r = sweepY(lv, this, this.vy);
    if (r === 1) {
      this.vy = 0; this.onGround = true;
      if (smart && this.vx) {
        const ac = this.vx > 0 ? Math.floor((this.x + this.w + 1) / TILE) : Math.floor((this.x - 1) / TILE);
        const br = Math.floor((this.y + this.h + 1) / TILE);
        if (!lv.solid(ac, br) && lv.get(ac, br) !== T.SEMI) this.vx = -this.vx;
      }
    } else {
      this.onGround = false;
      if (r === -1) this.vy = 0;
    }
    this.sandCheck(g);
    if (this.y > VIEW_H + 32 || this.x + this.w < g.camX - 160) this.remove = true;
  }
}

