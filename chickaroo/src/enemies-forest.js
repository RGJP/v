'use strict';
// ── Meadow critters (1-1) ────────────────────────────────────────────────────
// Bee: bobs around its patch of air. When Chickaroo comes level with it, it winds up with an
// angry buzz (backing off and shaking), then darts straight at where they were and drifts
// home. 'hover' bees never charge: a line of them over a gap is a stomp-bounce bridge.
class Buzzbee extends Enemy {
  constructor(col, row, mode) {
    super(col * TILE - 1, row * TILE + 1, 18, 14);
    this.homeX = this.x; this.homeY = this.y; this.mode = mode || 'charge';
    this.state = 'hover'; this.timer = 0; this.ht = (col * 37) % 100; this.dir = -1;
    this.walker = false;
  }
  onThaw() { this.state = 'home'; this.timer = 0; this.vx = 0; }
  update(g) {
    this.t++; this.timer++;
    const p = g.player, pcx = p.x + p.w / 2, pcy = p.y + p.h / 2, lv = g.level;
    if (this.state === 'hover') {
      this.ht++;
      this.x = this.homeX + Math.sin(this.ht * 0.03) * 10;
      this.y = this.homeY + Math.sin(this.ht * 0.11) * 3;
      if (Math.abs(pcx - this.cx) > 4) this.dir = pcx < this.cx ? -1 : 1;
      const dx = Math.abs(pcx - this.cx);
      if (this.mode === 'charge' && this.timer > 50 && p.state === 'play' && Math.abs(pcy - (this.y + 7)) < 20 && dx > 12 && dx < 130) {
        this.state = 'wind'; this.timer = 0;
        if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('buzz');
      }
    } else if (this.state === 'wind') {
      this.x -= this.dir * 0.25;                          // rears back before the dart
      if (this.timer >= 34) { this.state = 'dash'; this.timer = 0; this.vx = this.dir * 3.4; }
    } else if (this.state === 'dash') {
      if (this.timer > 34) this.vx *= 0.9;
      if (sweepX(lv, this, this.vx)) this.vx = 0;
      if (this.timer % 3 === 0) g.spark(this.cx - this.dir * 12, this.y + 8, '#fff1a8', 12, -this.vx * 0.1, 0);
      if (Math.abs(this.vx) < 0.25) { this.state = 'home'; this.timer = 0; }
    } else {                                              // fly home up and over, not back through Chickaroo
      const dx = this.homeX - this.x, ty = Math.abs(dx) > 6 ? this.homeY - 34 : this.homeY;
      if (Math.abs(dx) < 1 && Math.abs(this.homeY - this.y) < 1) { this.x = this.homeX; this.y = this.homeY; this.state = 'hover'; this.timer = 0; this.ht = 0; }
      else {
        this.y += clamp(ty - this.y, -1.2, 0.7);
        if (this.y < this.homeY - 20 || Math.abs(dx) <= 6) this.x += clamp(dx, -0.9, 0.9);
        this.dir = dx < 0 ? -1 : 1;
      }
    }
    if (this.x + this.w < g.camX - 200) this.remove = true;
  }
  // A honeybee, about 22px nose to stinger: a dark head with a big compound eye and elbowed
  // antennae, a fuzzy thorax with the legs hanging under it, a banded abdomen tapering to the
  // stinger, and two pairs of see-through veined wings buzzing over its back
  // painted (meadow-art.js): the body, then its see-through wings over it, buzzing faster as it winds up and darts
  draw(ctx) {
    const f = this.dir, wind = this.state === 'wind', jx = wind ? ((this.t >> 1) % 2 ? 1 : -1) : 0, M = meadowArt();
    const fast = wind || this.state === 'dash', up = fast ? this.t % 2 : (this.t >> 1) % 2;
    ctx.save(); ctx.translate(Math.round(this.cx) + jx, Math.round(this.y + 7));
    ctx.scale(f < 0 ? -1 : 1, this.flipped ? -1 : 1);
    ctx.drawImage(wind ? M.beeAngry : M.bee, -16, -10);
    ctx.globalAlpha = 0.72; ctx.drawImage(up ? M.beeWingUp : M.beeWingDown, -16, -10); ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// Grasshopper: squats (the warning), then springs at Chickaroo in a high arc. It won't leap
// into a pit: if the landing spot is bare air it hops straight up instead.
class Hopsprig extends Enemy {
  constructor(col, row) {
    super(col * TILE + 1, (row + 1) * TILE - 12, 14, 12);
    this.state = 'idle'; this.timer = (col * 23) % 50; this.dir = -1;
  }
  update(g) {
    this.t++; this.timer++;
    const lv = g.level, p = g.player, dx = p.x + p.w / 2 - this.cx;
    this.vy = Math.min(this.vy + (this.state === 'air' ? 0.22 : 0.3), 5);
    if (this.state === 'air' && sweepX(lv, this, this.vx)) this.vx = -this.vx * 0.5;
    const r = sweepY(lv, this, this.vy);
    if (r === 1) {
      this.vy = 0; this.onGround = true;
      if (this.state === 'air') {
        this.state = 'idle'; this.timer = 0; this.vx = 0;
        g.dust(this.cx, this.y + this.h, 3);
      }
    } else { this.onGround = false; if (r === -1) this.vy = 0; }
    if (this.state === 'idle') {
      if (Math.abs(dx) > 2) this.dir = dx < 0 ? -1 : 1;
      if (this.timer > 64 && this.onGround && Math.abs(dx) < 170 && p.state === 'play') { this.state = 'crouch'; this.timer = 0; }
    } else if (this.state === 'crouch' && this.timer >= 20) {
      let vx = this.dir * clamp(Math.abs(dx) / 46, 0.6, 1.9);
      const land = Math.floor((this.cx + vx * 50) / TILE);
      if (lv.surfaceRow(land) >= ROWS) vx = 0;              // no leaping into pits
      this.state = 'air'; this.vx = vx; this.vy = -5.4; this.onGround = false;
      if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('hop');
    }
    if (this.y > VIEW_H + 32 || this.x + this.w < g.camX - 160) this.remove = true;
  }
  draw(ctx) {
    const f = this.dir, crouch = this.state === 'crouch', air = this.state === 'air';
    const by = Math.round(this.y + this.h), cx = Math.round(this.cx), sq = crouch ? 2 : 0;
    if (this.flipped) { ctx.save(); ctx.translate(0, by * 2 - this.h); ctx.scale(1, -1); }
    // big back leg: folded zig-zag on the ground, stretched out in the air
    const kx = cx - f * 5, ky = air ? by - 2 : by - 9 + sq;
    const fx = air ? cx - f * 10 : cx - f * 2, fy = by;
    const hipX = cx - f + 0.5, hipY = by - 6 + sq + 0.5;   // (strokes in fine pixels: hires.js)
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kx + 0.5, ky + 0.5); ctx.stroke();   // the thigh...
    ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(kx + 0.5, ky + 0.5); ctx.lineTo(fx + 0.5, fy - 0.5); ctx.stroke();                  // ...and the shin
    ctx.strokeStyle = '#46b04c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kx + 0.5, ky + 0.5); ctx.stroke();
    ctx.strokeStyle = '#78d070'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(hipX, hipY - 0.4); ctx.lineTo(kx + 0.5, ky + 0.1); ctx.stroke();
    // body: painted (meadow-art.js)
    const bcy = by - 6 + sq;
    ctx.save(); ctx.translate(cx, bcy); if (f < 0) ctx.scale(-1, 1); ctx.drawImage(meadowArt().hopper, -12, -7); ctx.restore();
    // front legs
    ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.beginPath();
    for (const lx of [3, 5]) { ctx.moveTo(cx + f * lx + 0.5, bcy + 3); ctx.lineTo(cx + f * (lx + 0.4) + 0.5, by); }
    // antennae
    const hx = cx + f * 7 + 0.5, bob = crouch ? 0 : Math.sin(this.t * 0.2) * 0.6;
    ctx.moveTo(hx, bcy - 4); ctx.quadraticCurveTo(hx + f * 2, bcy - 8, hx + f * 4.4, bcy - 9.4 + bob);
    ctx.stroke();
    if (this.flipped) ctx.restore();
  }
}

// Mole: tunnels along under the turf toward Chickaroo (only a travelling mound of dirt shows),
// rumbles where it means to come up, then bursts out of the ground. Coming up it hurts; once
// it's out, blinking in the sun, it can be stomped. Then it ducks back down and digs again.
class Molebert extends Enemy {
  constructor(col, row) {
    super(col * TILE + 1, (row + 1) * TILE - 16, 14, 16);
    this.groundY = (row + 1) * TILE; this.row = row + 1;
    this.state = 'dig'; this.timer = 0; this.rise = 0; this.dir = -1; this.walker = false;
  }
  get noFreeze() { return this.state === 'dig' || this.state === 'rumble'; }
  hitbox() { return this.state === 'dig' || this.state === 'rumble' ? null : { x: this.x, y: this.groundY - this.rise, w: this.w, h: this.rise }; }
  touches(p) { const b = this.hitbox(); return !!b && b.h > 3 && overlap(b, p); }
  onTouch(g, p) {
    if (this.state === 'pop') { g.hurtPlayer(); return; }   // bursting up out of the ground: no stomping that
    super.onTouch(g, p);
  }
  onThaw() { this.groundY = this.y + this.h; this.row = Math.round(this.groundY / TILE); this.rise = this.h; this.state = 'up'; this.timer = 0; }
  canDig(lv, c) { return lv.solid(c, this.row) && !lv.solid(c, this.row - 1) && lv.get(c, this.row - 1) !== T.SEMI && !lv.secretAt(c, this.row - 1); }   // (never into a secret hollow: it'd show through the fake rock)
  update(g) {
    this.t++; this.timer++;
    const p = g.player, lv = g.level, dx = p.x + p.w / 2 - this.cx;
    const near = this.x > g.camX - 32 && this.x < g.camX + VIEW_W + 32;
    if (this.state === 'dig') {
      this.rise = 0;
      if (!near) return;
      if (Math.abs(dx) > 3) this.dir = dx < 0 ? -1 : 1;
      const ahead = Math.floor((this.dir > 0 ? this.x + this.w + 1 : this.x - 1) / TILE);
      const blocked = !this.canDig(lv, ahead);
      if (!blocked && Math.abs(dx) > 3) this.x += this.dir * 0.75;
      if (this.timer % 5 === 0) g.particles.push({ kind: 'px', x: this.cx + rand(-5, 5), y: this.groundY - 2, vx: rand(-0.6, 0.6) - this.dir * 0.3, vy: rand(-1.4, -0.5), g: 0.12, life: 18, t: 0, color: rand(0, 1) < 0.5 ? '#8a4c2a' : '#c47a48', size: 2 });
      // come up right under Chickaroo (or as close as the turf allows)
      if (this.timer > 70 && p.state === 'play' && (Math.abs(dx) < 6 || (blocked && Math.abs(dx) < 56))) { this.state = 'rumble'; this.timer = 0; }
    } else if (this.state === 'rumble') {
      if (this.timer % 4 === 0) g.particles.push({ kind: 'px', x: this.cx + rand(-7, 7), y: this.groundY - 2, vx: rand(-1, 1), vy: rand(-2.2, -1), g: 0.15, life: 20, t: 0, color: rand(0, 1) < 0.5 ? '#8a4c2a' : '#e6a771', size: 2 });
      if (this.timer % 12 === 1 && near) Sound.play('dig');
      if (this.timer >= 40) { this.state = 'pop'; this.timer = 0; g.dust(this.cx, this.groundY, 6); }
    } else if (this.state === 'pop') {
      this.rise = Math.min(this.h, this.rise + 2);
      if (this.rise >= this.h) { this.state = 'up'; this.timer = 0; }
    } else if (this.state === 'up') {
      if (Math.abs(dx) > 3) this.dir = dx < 0 ? -1 : 1;
      if (this.timer >= 110) { this.state = 'dive'; this.timer = 0; }
    } else if (this.state === 'dive') {
      this.rise = Math.max(0, this.rise - 1);
      if (this.rise <= 0) { this.state = 'dig'; this.timer = 0; }
    }
    this.y = this.groundY - Math.max(this.rise, 1);
    if (this.x + this.w < g.camX - 160) this.remove = true;
  }
  draw(ctx) {
    const cx = Math.round(this.cx), gy = Math.round(this.y) + Math.max(this.rise, 1), st = this.state;
    if (st === 'dig' || st === 'rumble') {
      // the travelling mound of turned earth (heaving when he's about to burst out)
      const big = st === 'rumble', jx = big ? ((this.t >> 1) % 2 ? 0.67 : -0.67) : 0, img = big ? meadowArt().moleMoundBig : meadowArt().moleMound;
      ctx.drawImage(img, cx - img.width / 2 + jx, gy - img.height + 0.67);
      return;
    }
    if (this.dead && this.flipped) { ctx.save(); ctx.translate(0, (this.y + this.h / 2) * 2); ctx.scale(1, -1); }
    const top = gy - this.rise, f = this.dir;
    ctx.save();
    if (!this.dead) { ctx.beginPath(); ctx.rect(cx - 14, top - 6, 28, gy - top + 6); ctx.clip(); }
    const bcy = (this.dead ? this.y + this.h : top + this.h) - 8;
    // digging claws raised either side
    const wave = st === 'up' ? ((this.t >> 3) % 2) : 0;
    const M = meadowArt();   // (painted: meadow-art.js)
    for (const sd of [-1, 1]) ctx.drawImage(M.moleClaw, cx + sd * 9 - 4, bcy - 1 - (sd === f ? wave : 0) - 4);
    // round velvet body and belly, sunglasses (squinting while it bursts out), a pink star of a nose
    ctx.save(); ctx.translate(cx, bcy); if (f < 0) ctx.scale(-1, 1); ctx.drawImage(st === 'pop' ? M.moleSquint : M.mole, -10, -9); ctx.restore();
    ctx.restore();
    if (!this.dead) {
      ctx.drawImage(M.moleLip, cx - 12, gy - 4);   // the lip of his hole, lumpy with clods
    }
    if (this.dead && this.flipped) ctx.restore();
  }
}
