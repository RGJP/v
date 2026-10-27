'use strict';
// ── Desert world (3-1) ───────────────────────────────────────────────────────
// Sidewinder: a sand snake, the dunes' everyday crawler. It sidewinds: the body lifts into low
// arches that stay put in the sand while the snake flows through them, so only a few stretches
// touch the ground at once and they never slip. The head glides level just above the sand and
// flicks its tongue now and then. It goes anywhere: glides right over quicksand (the sand never
// swallows it), climbs straight up any wall, block or log in its way and over the top, and pours
// itself down over ledges -- head first, the body flowing after it round every corner (the body
// follows the exact path the head took). But it never crawls out of sight: at the edge of the
// screen, a bottomless drop, or a wall it can't get over, it turns back. Stomp it flat.
const SNAKE_LEN = 28, SNAKE_STEP = 1, SNAKE_WAVE = 15, SNAKE_CLIMB = 0.7, SNAKE_DOWN = 1.0;   // (px per frame up, and down, a wall face)
class Sidewinder extends Enemy {
  constructor(col, row) {
    super(col * TILE - 2, (row + 1) * TILE - 8, 20, 8);
    this.vx = -0.5; this.walker = true; this.sandProof = true; this.tongue = 40 + Math.floor(Math.random() * 60);
    this.climb = null; this.down = null; this.trail = null;
  }
  get dir() { return this.vx < 0 ? -1 : 1; }
  // where its snout is: gliding along the ground, or nosing up / down a wall face
  headPos() {
    const f = this.dir;
    if (this.climb != null) return [(f > 0 ? this.x + this.w : this.x) - f * 3, this.y + this.h - 4];
    if (this.down != null) return [this.edge + f * 3, this.y + this.h - 2];
    return [this.cx + f * 9, this.y + this.h - 2];
  }
  // a fresh, straight body laid out on the ground behind the head (spawning, or turning round)
  straighten() { const [hx, hy] = this.headPos(); this.trail = [[hx - this.dir * (SNAKE_LEN + 4), hy], [hx, hy]]; }
  update(g) {
    this.t++;
    if (--this.tongue < -14) this.tongue = 60 + Math.floor(Math.random() * 90);
    if (!this.trail) this.straighten();
    const lv = g.level, dir = this.dir;
    if (this.climb != null) {   // slithering up a wall face; at the top it noses over onto it
      this.y = Math.max(this.climb, this.y - SNAKE_CLIMB);
      if (this.y <= this.climb) { this.climb = null; this.x += dir * 6; this.vy = 0; }
    } else if (this.down != null) {   // pouring down a wall face to the floor below
      this.y = Math.min(this.down, this.y + SNAKE_DOWN);
      if (this.y >= this.down) { this.down = null; this.vy = 0; this.onGround = true; }
    } else this.crawl(g, lv, dir);
    if (this.dir !== dir) this.straighten();
    else {   // the body follows the head's path
      const [hx, hy] = this.headPos(), last = this.trail[this.trail.length - 1];
      if (Math.hypot(hx - last[0], hy - last[1]) >= 0.3) this.trail.push([hx, hy]);
      let len = 0;
      for (let i = this.trail.length - 1; i > 0; i--) {
        len += Math.hypot(this.trail[i][0] - this.trail[i - 1][0], this.trail[i][1] - this.trail[i - 1][1]);
        if (len > SNAKE_LEN + 6) { this.trail.splice(0, i - 1); break; }
      }
    }
    if (this.y > VIEW_H + 32 || this.x + this.w < g.camX - 160) this.remove = true;
  }
  crawl(g, lv, dir) {
    // never out of sight: turn back at the screen's edge, and before a drop with nothing at the bottom
    const onScreen = this.x > g.camX - 2 && this.x + this.w < g.camX + VIEW_W + 2;
    const fr = Math.floor((this.y + this.h) / TILE), ahead = Math.floor((this.cx + dir * 11) / TILE);
    if (onScreen && (dir < 0 ? this.x + this.vx < g.camX + 1 : this.x + this.w + this.vx > g.camX + VIEW_W - 1)) { this.vx = -this.vx; return; }
    if (this.onGround && !this.floorBelow(lv, ahead)) { this.vx = -this.vx; return; }
    // the ground ends just ahead, but there's a floor further down: pour over the edge and down the face
    if (this.onGround && !this.floorAt(lv, ahead, fr)) {
      let r = fr; while (r < ROWS && !this.floorAt(lv, ahead, r)) r++;
      this.edge = dir > 0 ? ahead * TILE : (ahead + 1) * TILE;
      this.down = r * TILE - this.h; this.onGround = false;
      this.x = this.edge + dir * 3 - dir * 9 - this.w / 2;   // (keeps the snout just where it was)
      return;
    }
    this.vy = Math.min(this.vy + 0.3, 5);
    if (sweepX(lv, this, this.vx) && !this.startClimb(lv, dir)) this.vx = -this.vx;
    if (this.climb != null) return;
    const r = sweepY(lv, this, this.vy);
    this.onGround = r === 1; if (r) this.vy = 0;
    // quicksand is as good as solid ground under a sand snake: it rides along the surface
    const f2 = Math.floor((this.y + this.h) / TILE);
    if (this.vy >= 0 && [this.x + 2, this.cx, this.x + this.w - 2].some(x => lv.get(Math.floor(x / TILE), f2) === T.QSAND && lv.get(Math.floor(x / TILE), f2 - 1) !== T.QSAND)) {
      this.y = f2 * TILE - this.h; this.vy = 0; this.onGround = true;
    }
  }
  floorAt(lv, c, r) { const t = lv.get(c, r); return lv.solid(c, r) || t === T.SEMI || t === T.QSAND; }
  // anything to land on in column c, from its feet down (rock, a ledge, quicksand)?
  floorBelow(lv, c) {
    for (let r = Math.floor((this.y + this.h - 1) / TILE); r < ROWS; r++) if (this.floorAt(lv, c, r)) return true;
    return false;
  }
  // blocked by a wall: find its top; if it's on screen and the way up is clear, start climbing
  startClimb(lv, dir) {
    const wc = Math.floor((dir > 0 ? this.x + this.w + 1 : this.x - 1) / TILE);
    let r = Math.floor((this.y + this.h - 1) / TILE);
    while (r >= 0 && lv.solid(wc, r)) r--;
    if (r < 0) return false;
    const top = (r + 1) * TILE - this.h, c0 = Math.floor(this.x / TILE), c1 = Math.floor((this.x + this.w - 0.01) / TILE);
    for (let rr = Math.floor(top / TILE); rr <= Math.floor(this.y / TILE); rr++) for (let c = c0; c <= c1; c++) if (lv.solid(c, rr)) return false;
    this.climb = top; this.onGround = false;
    return true;
  }
  stomp(g, p) {
    this.dead = true; this.squashed = true; this.deadT = 0; this.vx = 0;
    this.burstDeath(g);
    g.bounce(p); g.stompScore(this); Sound.play('stomp');
    g.dust(this.cx, this.y + this.h, 6); g.shake = Math.max(g.shake, 1.5);
  }
  // body radius `s` px back from the snout: a slim neck, a thick middle, a long tapering tail
  static girth(s) { return s < 4 ? 1.5 : s < 8 ? 1.5 + (s - 4) * 0.125 : s < 15 ? 2 : Math.max(0.5, 2 - (s - 15) / 8); }
  // the point `s` px back along the head's path (past the oldest point it carries on straight behind)
  along(s) {
    const tr = this.trail;
    let i = tr.length - 1, left = s;
    while (i > 0) {
      const [ax, ay] = tr[i], [bx, by] = tr[i - 1], d = Math.hypot(ax - bx, ay - by);
      if (d >= left) { const k = d ? left / d : 0; return [ax + (bx - ax) * k, ay + (by - ay) * k, Math.abs(ax - bx) >= Math.abs(ay - by)]; }
      left -= d; i--;
    }
    return [tr[0][0] - this.dir * left, tr[0][1], true];
  }
  draw(ctx, g) {
    const f=this.dir,by0=this.y+this.h;
    if(this.squashed){ctx.save();ctx.translate(this.cx,by0);ctx.scale(1,0.25);ctx.drawImage(duneSnakeHeadArt(false),-7,-11);fEll(ctx,-f*10,-4,12,2,'#c89962');ctx.restore();return;}
    if(!this.trail)this.straighten();
    ctx.save();if(this.flipped){ctx.translate(0,by0*2-this.h);ctx.scale(1,-1);}
    const raw = [];
    for (let s = 0; s <= SNAKE_LEN; s += SNAKE_STEP) raw.push(this.along(s));   // (a ring every SNAKE_STEP px)
    const pts = raw.map(([x, y, flat], i) => {
      const s = i * SNAKE_STEP, r = Sidewinder.girth(s), near = Math.round(3 / SNAKE_STEP);
      let calm = 1;
      for (let k = -near; k <= near; k++) { const q = raw[i + k]; if (q && !q[2]) { calm = Math.min(calm, Math.abs(k) * SNAKE_STEP / 3.5); } }
      if (!flat) {
        const rockR = g && g.level.solid(Math.floor((x + 4) / TILE), Math.floor(y / TILE)), side = rockR ? 1 : -1;
        return { x, y, r, s, flat: false, side };
      }
      const ramp = Math.min(1, Math.max(0, (s - 5) / 5)) * Math.min(1, (SNAKE_LEN - s) / 7) * calm;
      const lift = ramp * 4 * Math.max(0, Math.sin(x * Math.PI * 2 / SNAKE_WAVE));
      const head = s < 5 ? (5 - s) * 0.5 * calm : 0;                // the head held a little off the sand
      return { x, y: y + 2 - r - 0.5 - lift - head, r, s, flat: true, ground: y + 2, lift };
    });
    // The body is a few hundred little ellipses, one over the next: filled one by one, a pyramid full of snakes was
    // thousands of canvas fills a frame. They're set into a pixel buffer instead (FinePix: the same art pixels) and the
    // whole body goes on screen in one drawImage
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    for(const q of pts){x0=Math.min(x0,q.x-q.r-2);x1=Math.max(x1,q.x+q.r+2);y0=Math.min(y0,q.y-q.r-2);y1=Math.max(y1,q.y+q.r+2,(q.ground||0)+2);}
    const P=(this.pix=this.pix||new FinePix()).begin(x0,y0,x1,y1),C=SNAKE_COL,shadow=P.soft('#79533a',0.18);
    for(const q of pts)if(q.flat&&q.lift<0.5)P.ell(q.x,q.ground,1.1,0.5,shadow);
    for(const q of pts)P.ell(q.x,q.y,q.r+0.65,q.r+0.65,C.INK);
    for(let i=pts.length-1;i>=0;i--){
      const q=pts[i];P.ell(q.x,q.y,q.r,q.r,C.BODY);P.ell(q.x-0.18,q.y-q.r*0.22,q.r*0.88,q.r*0.66,C.SHEEN);
      P.ell(q.x,q.y+q.r*0.64,q.r*0.8,0.35,C.BELLY);
      if(q.s>6&&q.s<SNAKE_LEN-3&&(q.s%6)<1.2)P.ell(q.x,q.y-q.r*0.53,0.48,q.r*0.5,C.MARK);
    }
    P.end(ctx);
    const h0=pts[0],h1=pts[Math.round(2/SNAKE_STEP)],angle=Math.atan2(h0.y-h1.y,h0.x-h1.x);
    ctx.translate(h0.x,h0.y);ctx.rotate(angle);if(f<0)ctx.scale(1,-1);ctx.drawImage(duneSnakeHeadArt(this.tongue<0&&(this.t>>1)%3),-10,-6);ctx.restore();
  }
}

const SNAKE_COL = { INK: FinePix.rgba(INK), BODY: FinePix.rgba('#c79a60'), SHEEN: FinePix.rgba('#e5bf7f'), BELLY: FinePix.rgba('#f6dfaf'), MARK: FinePix.rgba('#8b6846') };

// Scorpling: a scorpion that patrols its patch of sand (turning at ledges). With Chickaroo close in
// front it stops, cocks its tail high (the stinger glints), then jabs it forward. Landing on it means
// landing on the stinger, so it can't be stomped: use a roll or a powered attack instead.
// The stinger hurts from every side.
class Scorpling extends Enemy {
  constructor(col, row) {
    super(col * TILE, (row + 1) * TILE - 12, 16, 12);
    this.vx = -0.4; this.walker = true; this.state = 'walk'; this.timer = 0; this.cool = 40; this.face = -1;
    this.stompable = this.shellKill = this.bumpKill = false; this.fireKill = this.rollKill = true;
  }
  onThaw() { this.state = 'walk'; this.timer = 0; this.vx = this.face * 0.4; }
  stingBox() {
    if (this.state !== 'strike') return null;
    const f = this.face;
    const reach = Math.max(8, Math.round(32 * Math.min(1, this.timer / 14)));
    return { x: f > 0 ? this.x + this.w : this.x - reach, y: this.y - 4, w: reach, h: 10 };
  }
  touches(p) { const s = this.stingBox(); return overlap(this, p) || (!!s && overlap(s, p)); }
  onTouch(g, p) {
    const s = this.stingBox();
    if (s && overlap(s, p) && !overlap(this, p)) { g.hurtPlayer(); return; }
    super.onTouch(g, p);
  }
  update(g) {
    this.t++; this.timer++;
    const p = g.player, dx = p.x + p.w / 2 - this.cx, dy = Math.abs(p.y + p.h - (this.y + this.h));
    if (this.cool > 0) this.cool--;
    if (this.state === 'walk') {
      this.walk(g, true);
      if (this.vx) this.face = Math.sign(this.vx);
      if (!this.cool && this.onGround && p.state === 'play' && dy < 22 && dx * this.face > 0 && Math.abs(dx) < 46) {
        this.state = 'cock'; this.timer = 0; this.vx = 0;
        if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('snip');
      }
      return;
    }
    this.vx = 0; this.walk(g, true);
    if (this.state === 'cock' && this.timer >= 42) {
      this.state = 'strike'; this.timer = 0;
      if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('dart');
      g.spark(this.cx + this.face * 40, this.y + 1, '#ffd166', 14);
    } else if (this.state === 'strike' && this.timer >= 24) { this.state = 'recover'; this.timer = 0; }
    else if (this.state === 'recover' && this.timer >= 24) { this.state = 'walk'; this.timer = 0; this.cool = 75; this.vx = this.face * 0.4; }
  }
  draw(ctx) {
    const frame=this.state==='strike'?Math.min(7,Math.floor(this.timer/14*7)):0;
    ctx.save();ctx.translate(this.cx,this.y+this.h);ctx.scale(this.face,this.flipped?-1:1);
    ctx.drawImage(duneScorpionArt(this.state,frame,(this.t>>3)%2),-22,-33);
    if(this.state==='cock'&&this.t%6<4)umbraSpark(ctx,1,-26,1.2,'#fff1c9');ctx.restore();
  }
}

// Tumbleweed: a grumpy ball of twigs the desert wind keeps bowling along, bouncing in big lopsided
// hops (right over small gaps). Its scowling eyes peek out of the tangle. Stomp it or burn it.
class Tumbleweed extends Enemy {
  constructor(x, y, dir) {
    super(x, y, 14, 14);
    this.vx = dir * rand(1.2, 1.75); this.spin = 0; this.seed = Math.floor(rand(0, 1000)); this.walker = false; this.climb = 0;
  }
  hitbox() { return { x: this.x + 2, y: this.y + 2, w: 10, h: 10 }; }
  flipKill(g) {
    if (this.dead) return;
    this.dead = true; this.remove = true;
    for (let i = 0; i < 12; i++) g.particles.push({ kind: 'px', x: this.cx + rand(-6, 6), y: this.y + 7 + rand(-6, 6), vx: rand(-1.8, 1.8), vy: rand(-2.6, -0.4), g: 0.18, life: 34, t: 0, color: i % 3 ? '#b8864a' : '#e0b070', size: 2 });
  }
  stomp(g, p) { this.flipKill(g); g.bounce(p); g.stompScore(this); Sound.play('stomp'); }
  update(g) {
    this.t++;
    const lv = g.level;
    this.vy = Math.min(this.vy + 0.22, 5);
    if (this.inSand) this.vy = Math.min(this.vy, 0.35);
    if (sweepX(lv, this, this.vx)) {
      // the wind lifts it up and over a dune wall; only a wall it already failed to clear turns it back
      if (this.climb++ < 2) this.vy = Math.min(this.vy, -4.9); else { this.vx = -this.vx * 0.6; this.climb = 0; }
    }
    const r = sweepY(lv, this, this.vy);
    if (r === 1) {
      this.vy = -rand(2.6, 4.2); if (this.vy < -3) this.climb = 0;
      g.dust(this.cx, this.y + this.h, 2);
      if (this.x > g.camX && this.x < g.camX + VIEW_W && Math.random() < 0.5) Sound.play('rustle');
    } else if (r === -1) this.vy = 0;
    this.sandCheck(g);
    this.spin += this.vx * 0.13;
    if (this.y > VIEW_H + 32 || this.x + this.w < g.camX - 64) this.remove = true;
  }
  draw(ctx) {
    const cx = Math.round(this.cx), cy = Math.round(this.y + 7), rng = mulberry32(this.seed);
    if (this.flipped) return;
    // a tangle of curved strands, turning as it rolls (fine strokes: hires.js)
    ctx.lineCap = 'round'; ctx.lineWidth = 0.6;
    for (let i = 0; i < 18; i++) {
      const a0 = rng() * Math.PI * 2 + this.spin, r = 3 + rng() * 5, len = 1.2 + rng() * 1.6;
      ctx.strokeStyle = i % 4 === 0 ? '#5e3a1a' : i % 2 ? '#b8864a' : '#e0b070'; ctx.beginPath();
      for (let k = 0; k <= 12; k++) { const a = a0 + k / 12 * len, rr = r + Math.sin(k * 0.45 + i) * 1.2; ctx.lineTo(cx + 0.5 + Math.cos(a) * rr, cy + 0.5 + Math.sin(a) * rr); }
      ctx.stroke();
    }
    ctx.strokeStyle = '#5e3a1a'; ctx.lineWidth = 0.8; ctx.setLineDash([1.6, 2]); ctx.lineDashOffset = -this.spin * 7 * 0.7;
    ctx.beginPath(); ctx.arc(cx + 0.5, cy + 0.5, 7, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    // scowling eyes in the middle (they don't spin)
    const f = this.vx < 0 ? -1 : 1;
    fRoundRect(ctx, cx - 4.4, cy - 2.2, 9.8, 5, 2.2, INK);
    for (const ex of [-1.5, 2.5]) { fEll(ctx, cx + ex, cy + 0.4, 1.4, 1.4, '#ffffff'); fEll(ctx, cx + ex + f * 0.5, cy + 0.7, 0.7, 0.8, INK); }
    fLine(ctx, cx - 4, cy - 3.4, cx - 0.6, cy - 2, INK, 2); fLine(ctx, cx + 5, cy - 3.4, cx + 1.6, cy - 2, INK, 2);
  }
}
// Invisible: while Chickaroo is between its two columns, rolls a tumbleweed in from the right edge
// of the screen every so often.
class TumbleSpawner extends Enemy {
  constructor(col, until, every) {
    super(col * TILE, 0, 1, 1);
    this.until = until * TILE; this.every = every || 120; this.timer = 40;
    this.passive = true; this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    const p = g.player;
    if (p.x > this.until) { this.remove = true; return; }
    if (p.x < this.x - 48 || p.state !== 'play' || --this.timer > 0) return;
    this.timer = this.every + Math.floor(rand(-25, 25));
    const sx = g.camX + VIEW_W + 10;
    if (sx > this.until + VIEW_W) return;
    const row = g.level.surfaceRow(Math.floor(sx / TILE));
    g.entities.push(new Tumbleweed(sx, (row < ROWS ? row : 10) * TILE - 30, -1));
  }
  draw() {}
}

// Dunefin: a sand shark cruising just under the surface of a quicksand pool, only its fin showing.
// It shadows Chickaroo along the pool; when he's above it, the fin shivers, then it bursts out in a
// leap at him. Only stompable while it's out of the sand.
class Dunefin extends Enemy {
  constructor(lv, c0, c1) {
    let top = 12;
    for (let r = 0; r < ROWS; r++) if (lv.get(c0 + 1, r) === T.QSAND) { top = r; break; }
    super(c0 * TILE, top * TILE - 6, 20, 12);
    this.surf = top * TILE; this.lo = c0 * TILE + 4; this.hi = (c1 + 1) * TILE - 4;
    this.x = (this.lo + this.hi) / 2 - 10; this.state = 'swim'; this.timer = 0; this.cool = 90; this.dir = -1;
    this.walker = false;
  }
  get drawOver() { return this.state !== 'leap' && !this.dead; }   // the fin shows over the sand
  get noFreeze() { return this.state !== 'leap'; }
  hitbox() {
    if (this.state === 'leap' || this.dead) return { x: this.x + 2, y: this.y + 1, w: this.w - 4, h: this.h - 2 };
    return { x: this.cx - 3, y: this.surf - 7, w: 6, h: 9 };          // just the fin
  }
  onTouch(g, p) {
    if (this.state === 'leap' && g.isStomp(p, this)) { this.stomp(g, p); return; }
    g.hurtPlayer();
  }
  update(g) {
    this.t++; this.timer++;
    const p = g.player, pcx = p.x + p.w / 2;
    if (this.cool > 0) this.cool--;
    if (this.state === 'leap') {
      this.vy += 0.24; this.x += this.vx; this.y += this.vy;
      this.x = clamp(this.x, this.lo - 10, this.hi - 10);
      if (this.vy > 0 && this.y + this.h / 2 >= this.surf) {
        this.state = 'swim'; this.vy = 0; this.y = this.surf - 6; this.cool = 70; this.timer = 0;
        g.sandPuff(this.cx, this.surf, 8);
        if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('sandsink');
      }
      return;
    }
    const over = pcx > this.lo - 20 && pcx < this.hi + 20 && p.state === 'play';
    if (this.state === 'swim') {
      const target = over ? pcx : (this.dir < 0 ? this.lo : this.hi);
      if (!over && Math.abs(target - this.cx) < 6) this.dir = -this.dir;
      const dx = clamp(target - this.cx, -0.95, 0.95);
      if (Math.abs(dx) > 0.05) this.dir = Math.sign(dx);
      this.x = clamp(this.x + dx, this.lo - 10, this.hi - 10);
      if (this.t % 6 === 0) g.sandPuff(this.cx - this.dir * 5, this.surf, 1);
      if (over && !this.cool && Math.abs(pcx - this.cx) < 30 && p.y + p.h < this.surf + 14) { this.state = 'rise'; this.timer = 0; Sound.play('rumble'); }
    } else if (this.state === 'rise') {
      if (this.t % 3 === 0) g.sandPuff(this.cx + rand(-6, 6), this.surf, 1);
      if (this.timer >= 30) {
        this.state = 'leap'; this.vy = -6.3; this.vx = clamp((pcx - this.cx) / 40, -1.4, 1.4); this.dir = this.vx < 0 ? -1 : 1;
        this.y = this.surf - 6;
        g.sandPuff(this.cx, this.surf, 10);
        if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('leap');
      }
    }
  }
  updateDead(g) {
    this.deadT++;
    this.vy = Math.min(this.vy + 0.3, 6); this.y += this.vy;
    if (this.y > this.surf + 4) { g.sandPuff(this.cx, this.surf, 6); this.remove = true; }
  }
  draw(ctx) {
    const buried=this.state!=='leap'&&!this.dead,shake=this.state==='rise'?Math.sin(this.t*1.3)*0.65:0;
    ctx.save();ctx.translate(this.cx+shake,buried?this.surf:this.y+6);ctx.scale(this.dir,this.flipped?-1:1);
    if(buried){ctx.save();ctx.beginPath();ctx.rect(-20,-20,40,20);ctx.clip();ctx.drawImage(duneSharkArt(true),-17,-10,34,17.5);ctx.restore();
      ctx.globalAlpha=0.6;fArc(ctx,0,1,7,7.35,Math.PI,Math.PI*2,'#e2bb82',0.16);ctx.globalAlpha=1;
    }else ctx.drawImage(duneSharkArt(false),-17,-17);ctx.restore();
  }
}

// Vulturk: a bald, scruffy vulture gliding overhead, clutching a rock. When it's right above
// Chickaroo it squawks, hovers, and lets go; the boulder then rolls. It comes back with another.
class Vulturk extends Enemy {
  constructor(col, until) {
    super(col * TILE, 28, 22, 12);
    this.until = until * TILE; this.state = 'glide'; this.timer = 110; this.baseY = 26; this.face = -1; this.rock = true;
    this.shellKill = this.bumpKill = false;
  }
  onThaw() { this.state = 'glide'; this.timer = 90; }
  update(g) {
    this.t++;
    const p = g.player, pcx = p.x + p.w / 2;
    if (this.state === 'leave') { this.y -= 1.1; this.x += 1.2; if (this.y < -30) this.remove = true; return; }
    if (p.x > this.until) { this.state = 'leave'; return; }
    if (this.state === 'glide') {
      const ahead = pcx + (p.vx > 0.5 ? 26 : p.vx < -0.5 ? -26 : 0);
      const dx = clamp(ahead - this.cx, -1.3, 1.3);
      this.x += dx; if (Math.abs(dx) > 0.2) this.face = Math.sign(dx);
      this.y = this.baseY + Math.round(Math.sin(this.t * 0.05) * 4);
      if (!this.rock && this.timer < 60) this.rock = true;
      if (--this.timer <= 0 && this.rock && Math.abs(pcx - this.cx) < 18 && p.state === 'play') {
        this.state = 'aim'; this.timer = 88;   // freeze in place a full second before dropping the boulder
        if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('squawk');
      }
    } else if (this.state === 'aim') {
      this.y = this.baseY - 4 + Math.round(Math.sin(this.t * 0.5));
      if (--this.timer <= 0) {
        g.entities.push(new Boulder(this.cx, this.y + this.h + 2, this.face * 0.6));
        this.rock = false; this.state = 'glide'; this.timer = 170 + Math.floor(rand(0, 60));
      }
    }
    this.x = clamp(this.x, g.camX + 4, g.camX + VIEW_W - this.w - 4);
  }
  draw(ctx) {
    const frame=Math.floor(this.t/(this.state==='aim'?3:8))%8;
    ctx.save();ctx.translate(this.cx,this.y+6);ctx.scale(this.face,this.flipped?-1:1);
    ctx.drawImage(duneVultureArt(frame,this.state==='aim',this.rock),-21,-17);ctx.restore();
  }
}
// A boulder dropped by a vulture: falls, lands with a thud, then rolls along until it smashes into a
// wall, sinks in the sand, or crumbles. Hop on top of it safely; don't let it roll into you.
class Boulder extends Enemy {
  constructor(cx, y, vx) {
    super(cx - 7, y, 14, 14);
    this.vx = vx; this.bossHazard = true; this.rolling = false; this.ang = 0;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return { x: this.x + 1, y: this.y + 1, w: 12, h: 13 }; }
  onTouch(g, p) {
    if (g.isStomp(p, this)) { g.bounce(p); Sound.play('bump'); g.dust(this.cx, this.y, 3); }
    else g.hurtPlayer();
  }
  shatter(g) {
    this.remove = true;
    for (let i = 0; i < 12; i++) g.particles.push({ kind: 'px', x: this.cx + rand(-5, 5), y: this.y + 7 + rand(-5, 5), vx: rand(-2, 2), vy: rand(-3, -0.5), g: 0.25, life: 34, t: 0, color: i % 2 ? '#9a7a5a' : '#c8a888', size: 2 });
    if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('break');
  }
  update(g) {
    this.t++;
    const lv = g.level;
    this.vy = Math.min(this.vy + 0.3, 5.5);
    if (this.inSand) this.vy = Math.min(this.vy, 0.3);
    if (sweepX(lv, this, this.vx)) { this.shatter(g); return; }
    const r = sweepY(lv, this, this.vy);
    if (r === 1) {
      if (!this.rolling) {
        this.rolling = true; this.vy = -1.8;
        const p = g.player;
        this.vx = (p.x + p.w / 2 < this.cx ? -1 : 1) * 1.25;
        g.shake = Math.max(g.shake, 2.5); g.dust(this.cx, this.y + this.h, 6);
        if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('thud');
      } else this.vy = 0;
      if (this.t % 8 === 0) g.dust(this.cx - Math.sign(this.vx) * 5, this.y + this.h, 1);
    }
    this.sandCheck(g);
    this.ang += this.vx * 0.14;
    if (this.t > 460) this.shatter(g);
    if (this.y > VIEW_H + 32 || this.x + this.w < g.camX - 64 || this.x > g.camX + VIEW_W + 64) this.remove = true;
  }
  draw(ctx) {
    const cx = Math.round(this.cx), cy = Math.round(this.y + 7);
    const ball = ctx.createRadialGradient(cx - 2, cy - 2.4, 0.5, cx + 0.5, cy + 0.5, 7);   // (fine: hires.js)
    ball.addColorStop(0, '#d8b898'); ball.addColorStop(0.45, '#ae8e6c'); ball.addColorStop(1, '#6e5038');
    fBlob(ctx, cx + 0.5, cy + 0.5, 7.4, INK); fBlob(ctx, cx + 0.5, cy + 0.5, 6.6, ball);
    for (let i = 0; i < 3; i++) { const a = this.ang + i * 2.1, k = Math.sin(a); fEll(ctx, cx + 0.5 + Math.cos(a) * 3.5, cy + 0.5 + k * 3.5, 1.4, 0.8, '#6a4e38'); }
    fEll(ctx, cx - 1.6, cy - 2.6, 1.8, 0.8, '#e8d0b0');
  }
}

// Dart trap: a carved serpent face set into a sandstone block. Its eyes smoulder, then flare, and it
// spits a dart. Scenery you can't break; the darts can be stomped (or burned, or blown away).
class DartTrap extends Enemy {
  constructor(col, row, dir, period, phase) {
    super(col * TILE, row * TILE, 16, 16);
    this.dir = dir || -1; this.period = period || 120; this.t = Math.floor((phase || 0) * this.period);
    this.passive = true; this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  get warn() { const k = this.t % this.period; return k > this.period - 55 ? (k - (this.period - 55)) / 55 : 0; }
  update(g) {
    this.t++;
    if (this.t % this.period !== 0) return;
    if (this.x < g.camX - 48 || this.x > g.camX + VIEW_W + 48) return;
    const d = this.dir, mx = d < 0 ? this.x - 18 : this.x + this.w - 4;
    g.entities.push(new Dart(mx, this.y + 9, d));
    g.burst(d < 0 ? this.x : this.x + this.w, this.y + 9, ['#ff4d2e', '#ffb347', '#fff3b0'], 7);
    Sound.play('dart');
  }
  draw(ctx) {
    ctx.save();ctx.translate(this.x+(this.dir>0?16:0),this.y);ctx.scale(this.dir>0?-1:1,1);
    const w=this.warn,pulse=w>0?0.75+0.25*Math.sin(this.t*0.55):0;
    if(w>0){
      fGlow(ctx,8,8,18+w*12,'#ff2a1f',(0.45+w*0.45)*pulse);
    }
    ctx.drawImage(duneDartTrapArt(Math.min(8,Math.ceil(w*8))),0,0);
    if(w>0){
      ctx.globalAlpha=clamp(w*0.55*pulse,0,0.65);
      fRect(ctx,0,0,16,16,'#ff2211');
      ctx.globalAlpha=clamp(w*0.75*pulse,0,0.85);
      fRect(ctx,0,0,16,1,'#ff9e66');fRect(ctx,0,15,16,1,'#ff4422');
      fRect(ctx,0,0,1,16,'#ff9e66');fRect(ctx,15,0,1,16,'#ff4422');
      ctx.globalAlpha=1;
    }
    ctx.restore();
  }
}
class Dart extends Enemy {
  constructor(x, y, dir) {
    super(x, y - 5, 24, 10);
    this.vx = dir * 2.8; this.bossHazard = true;
  }
  update(g) {
    this.t++;
    this.x += this.vx;
    const lead = this.vx < 0 ? this.x : this.x + this.w;
    if (g.level.solid(Math.floor(lead / TILE), Math.floor((this.y + 5) / TILE))) {
      g.burst(lead, this.y + 5, ['#f0d0a0', '#c88a4a'], 6); this.remove = true; return;
    }
    if (this.x < g.camX - 32 || this.x > g.camX + VIEW_W + 32 || this.t > 400) this.remove = true;
  }
  hitbox() { return { x: this.x + 1, y: this.y, w: this.w - 2, h: this.h }; }
  draw(ctx) {
    ctx.save();ctx.translate(this.x+12,this.y+5);ctx.scale(this.vx<0?-1:1,this.flipped?-1:1);ctx.drawImage(duneDartArt(),-14,-7.5);ctx.restore();
  }
}

// Sand geyser (a moving platform): 2 tiles wide. It rumbles and spits a little, then a column of
// sand roars up `rows` tiles and holds there (stand on its frothy crown to ride it), then sinks back.
// Anyone caught inside the column is flung up on top. With baseRow 14 it rises out of a bottomless gap.
const SPOUT_WARN = 54, SPOUT_RISE = 24, SPOUT_HOLD = 96, SPOUT_FALL = 56;
class SandSpout {
  constructor(col, rows, period, phase, baseRow) {
    this.cx = col * TILE + 16; this.w = 28; this.x = this.cx - 14; this.h = 8;
    this.base = (baseRow == null ? 12 : baseRow) * TILE; this.maxH = rows * TILE;
    this.period = Math.max(period || 240, SPOUT_WARN + SPOUT_RISE + SPOUT_HOLD + SPOUT_FALL + 10);
    this.t = Math.floor((phase || 0) * this.period); this.hgt = 0; this.top = this.base;
    this.y = 1e5; this.prevY = 1e5; this.dx = 0; this.dy = 0;
  }
  phase() {
    const k = this.t % this.period;
    if (k < SPOUT_WARN) return ['warn', k / SPOUT_WARN];
    if (k < SPOUT_WARN + SPOUT_RISE) return ['rise', (k - SPOUT_WARN) / SPOUT_RISE];
    if (k < SPOUT_WARN + SPOUT_RISE + SPOUT_HOLD) return ['hold', 1];
    if (k < SPOUT_WARN + SPOUT_RISE + SPOUT_HOLD + SPOUT_FALL) return ['fall', 1 - (k - SPOUT_WARN - SPOUT_RISE - SPOUT_HOLD) / SPOUT_FALL];
    return ['idle', 0];
  }
  update(g) {
    this.t++;
    const [ph, k] = this.phase(), oldTop = this.top;
    this.ph = ph;
    this.hgt = ph === 'rise' ? this.maxH * (1 - (1 - k) * (1 - k)) : ph === 'hold' ? this.maxH + Math.round(Math.sin(this.t * 0.3)) : ph === 'fall' ? this.maxH * k : 0;
    this.top = this.base - this.hgt;
    this.dy = this.top - oldTop;
    this.prevY = this.y;
    this.y = this.hgt >= 10 ? this.top : 1e5;
    if (!g) return;
    const on = this.cx > g.camX - 40 && this.cx < g.camX + VIEW_W + 40, ground = Math.min(this.base, 12 * TILE);
    if (ph === 'warn' && on) {
      if (this.t % 5 === 0) g.sandPuff(this.cx + rand(-10, 10), ground, 1, -1.5 - k * 2);
      if (this.t % 18 === 0) Sound.play('rumble');
    }
    if (ph === 'rise' && k < 0.05 && on) { Sound.play('spout'); g.shake = Math.max(g.shake, 2); }
    if ((ph === 'rise' || ph === 'hold') && on && this.t % 2 === 0) g.sandPuff(this.cx + rand(-12, 12), this.top + 2, 1, rand(-2.2, -0.8));
    // caught inside the column: flung up onto the crown
    const p = g.player;
    if (this.y < 1e4 && p.state === 'play' && p.x + p.w > this.x + 3 && p.x < this.x + this.w - 3 && p.y + p.h > this.top + 4 && p.y < this.base) {
      p.vy = Math.min(p.vy, -4.6); p.onGround = false; p.jumping = false; p.platform = null;
      if (p.sand) p.sand = 0;
    }
  }
  draw(ctx) {
    if(this.hgt<2)return;
    const top=fSnap(this.top),bot=Math.min(this.base,VIEW_H+8),frame=Math.floor(this.t/3)%16,img=duneSandStreamArt(frame);
    for(let y=top+4;y<bot;y+=48){const h=Math.min(48,bot-y);ctx.drawImage(img,0,0,32,h,this.cx-16,y,32,h);}
    ctx.drawImage(duneSandCrownArt(Math.floor(this.t/4)%12),this.cx-18,top);
    for(let i=0;i<8;i++){
      const u=((this.t*1.6+i*17)%70)/70,side=i%2?1:-1;
      fEll(ctx,this.cx+side*(13+u*4)+Math.sin(i+u*4),top+6+u*Math.min(34,this.hgt),.25,.6,i%3?'#e4c18a':'#f8dfaf');
    }
  }
}

// their 1x drawings, lifted to the fine screen look by look (hires.js)
