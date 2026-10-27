'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 4-1 THE GUMBO FEVER DREAM: the critters of the pot (its set pieces are in gumbo.js)
//   'crawdad'   CRAWDAD CHOPPER: armoured in front. Get in front of it at its own level and it winds up, then lunges its
//               pincers forward. Its back is wide open: stomp it from above (or lure it into a steam vent: cooked)
//   'andouille' ANDOUILLE ROLLER: a slice of sausage rolling along, faster after every drop, bouncing off walls
//   'andouilles' x, untilX, every: they keep rolling in from the right while Chickaroo is between the columns
//   'spitter'   OKRA SPITTER: an okra pod that spits sticky seeds in high arcs; they leave puddles of slime
//   'onion'     ONION TEARER: floats overhead, crying, and drops clouds of onion gas: his arrows swap sides for a while.
//               Two layers to peel
//   'celery'    CELERY STALKER: a tall walking stalk. Its leafy top is springy; chop its base (fire, a roll, a shell) and
//               it falls like a tree -- a bridge
//   'pepper'    BELL PEPPER BOUNCER: a heavy brute that hops and slams the ground, throwing Chickaroo sky-high. Two stomps
//               (the first knocks its stem off, and it goes red with rage)
//   'trinity'   x: passing column x, the Holy Trinity (the nearest onion, celery and pepper) introduce themselves
// ═══════════════════════════════════════════════════════════════════════════

// draw a killed foe upside down (as it tumbles off)
function gumboFlip(ctx, e, fn) {
  if (!e.flipped) { fn(); return; }
  ctx.save(); ctx.translate(0, Math.round(e.y + e.h / 2) * 2); ctx.scale(1, -1); fn(); ctx.restore();
}

// ── CRAWDAD CHOPPER ──────────────────────────────────────────────────────────
// It patrols; with Chickaroo in front of it, at its own level and close, it stops and draws its claws back (the tell),
// then lunges them forward -- `ext` px of reach in front for a moment -- and needs a breather before the next snap.
// Its top is never guarded: any stomp from above cooks its goose. Rolling into its pincers while they're out hurts.
const CRAW_WIND = 22, CRAW_SNAP = 16, CRAW_REST = 46, CRAW_REACH = 14;
class Crawdad extends Enemy {
  constructor(col, row) {
    super(col * TILE, (row + 1) * TILE - 12, 22, 12);
    this.vx = -0.35; this.dir = -1; this.walker = true; this.state = 'walk'; this.timer = 0; this.ext = 0; this.speakerName = 'CRAWDAD';
  }
  get face() { return this.dir; }
  // the body, plus the pincers' reach in front while they're out
  hitbox() { const e = Math.round(this.ext); return e ? { x: this.face > 0 ? this.x : this.x - e, y: this.y, w: this.w + e, h: this.h } : this; }
  clawsOut() { return this.state === 'snap' && this.ext > 4; }
  update(g) {
    this.t++;
    const p = g.player, dx = p.x + p.w / 2 - this.cx, ahead = dx * this.face;
    const level = p.state === 'play' && p.y + p.h > this.y - 6 && p.y < this.y + this.h + 4;   // (on its level, not above it)
    if (this.timer > 0) this.timer--;
    if (this.state === 'walk') {
      if (level && ahead > 4 && ahead < 58 && !this.timer) { this.state = 'wind'; this.timer = CRAW_WIND; Sound.play('snip'); }
    } else if (this.state === 'wind' && !this.timer) { this.state = 'snap'; this.timer = CRAW_SNAP; Sound.play('snip'); }
    else if (this.state === 'snap' && !this.timer) { this.state = 'walk'; this.timer = CRAW_REST; }
    const want = this.state === 'snap' ? CRAW_REACH : 0;
    this.ext += (want - this.ext) * (want ? 0.6 : 0.2);
    if (this.ext < 0.5) this.ext = 0;
    this.vx = this.state === 'walk' ? this.dir * 0.35 : 0;   // (planted while it winds up and snaps)
    this.walk(g, true);
    if (this.vx) this.dir = Math.sign(this.vx);   // (turned at a wall or a ledge)
  }
  onTouch(g, p) {
    if (g.isStomp(p, this)) { this.stomp(g, p); return; }
    g.hurtPlayer();
  }
  // a roll into its open pincers loses; from behind, or while they're tucked in, it bowls it over like anything else
  rollGuard(p) { return this.clawsOut() && (p.x + p.w / 2 - this.cx) * this.face > 0; }
  // caught in a steam vent: boiled bright red, and that's that
  cook(g) {
    this.cooked = true; this.flipKill(g, 0); this.vy = -6;
    g.addScore(500, this.cx, this.y - 6); 
    Sound.play('sizzle');
  }
  // how it looks: crawdad-art.js (claws drawn back and gaping as it winds up, with a shiver; thrust out and clamped on the snap)
  draw(ctx) {
    gumboFlip(ctx, this, () => {
      const f = this.face, wind = this.state === 'wind', shut = this.state === 'snap' && this.ext > 4;
      const x = Math.round(this.cx) + (wind ? ((this.t >> 1) % 2) * f : 0), y = Math.round(this.y + this.h);
      const walking = this.state === 'walk' && !this.dead;
      drawCrawdad(ctx, x, y, f, wind ? -3 : Math.round(this.ext), wind ? 'wide' : shut ? 'shut' : 'open', walking ? (this.t >> 3) % 2 : 0, this.cooked || this.flipped ? 'cooked' : 'live');
      if (shut && this.timer > CRAW_SNAP - 4) for (const d of [-3, 0, 3]) fRoundRect(ctx, x + f * (24 + this.ext) - (f < 0 ? 2 : 0), y - 6.4 + d, 2, 0.7, 0.35, '#ffffff');   // a little burst at the tips (fine)
    });
  }
}

// ── ANDOUILLE ROLLER ─────────────────────────────────────────────────────────
class Andouille extends Enemy {
  constructor(px, py, dir = -1) {
    super(px, py, 26, 16);
    this.vx = dir * 1.1; this.spin = 0; this.rollKill = true; this.sandProof = true;   // (its wheels roll over anything: roux too)
  }
  update(g) {
    this.t++;
    const lv = g.level;
    this.vy = Math.min(this.vy + 0.3, 6);
    if (sweepX(lv, this, this.vx)) {   // a wall: it bounces off it, hard
      this.vx = -this.vx * 0.9; this.vy = -3.4; Sound.play('thud');
      g.dust(this.cx, this.y + this.h, 3);
    }
    const fell = this.vy;
    let r = sweepY(lv, this, this.vy);
    // the roux is road to it: its wheels ride along it at the banks' height, so it rolls straight across and out the far side
    // (drawn a little lower, wheels dipped in), and lands on it off a drop, just like on ground
    const rc = Math.floor(this.cx / TILE), rr = Math.floor((this.y + this.h - 0.5) / TILE) + (this.vy > 0 ? 0 : 0);
    const roux = (c, r) => lv.get(c, r) === T.QSAND && lv.get(c, r - 1) !== T.QSAND;
    this.onRoux = false;
    for (const row of [rr, rr + 1]) if (r !== 1 && this.vy >= 0 && roux(rc, row) && this.y + this.h >= row * TILE - 1 && this.y + this.h <= row * TILE + 6) { this.y = row * TILE - this.h; this.vy = 0; r = 1; this.onRoux = true; break; }
    if (r === 1 && roux(rc, Math.floor((this.y + this.h + 1) / TILE))) this.onRoux = true;
    // and slopes (the heap of vegetables, the spoon): it rides down (or up) along the line, wheels on it
    this.onSlope = false;
    let tilt = 0;
    for (const e of g.entities) {
      if (!e.lineY || this.cx < e.xa - 2 || this.cx > (e.xt || e.xb) + 2) continue;
      const ly = Math.round(e.lineY(this.cx)), feet = this.y + this.h;
      if (this.vy >= -0.5 && feet >= ly - 4 && feet <= ly + 12) { this.y = ly - this.h; this.vy = 0; r = 1; this.onSlope = true; tilt = Math.atan2(e.lineY(this.cx + 6) - e.lineY(this.cx - 6), 12); }
    }
    this.tilt = (this.tilt || 0) + (tilt - (this.tilt || 0)) * 0.3;   // (leaning with the slope, both wheels on it: eased on and off)
    if (r === 1) {
      if (fell > 2.5) { this.vx = Math.sign(this.vx) * Math.min(2.4, Math.abs(this.vx) + 0.35); this.vy = -fell * 0.3; }   // off a drop: faster, and a little bounce
      else this.vy = 0;
      this.onGround = true;
    } else { this.onGround = false; if (r === -1) this.vy = 0; }
    this.spin += this.vx / 4;
    // never through each other: one catching up behind another slows to keep a gap; two meeting head-on bounce apart
    for (const o of g.entities) {
      if (o === this || !(o instanceof Andouille) || o.dead || Math.abs(o.y - this.y) > 12) continue;
      const gap = 4, ahead = (o.cx - this.cx) * Math.sign(this.vx);
      if (ahead <= 0 || ahead > this.w + gap) continue;
      if (Math.sign(o.vx) === Math.sign(this.vx)) { if (Math.abs(this.vx) > Math.abs(o.vx)) this.vx = o.vx; this.x = o.cx - Math.sign(this.vx) * (this.w + gap) - this.w / 2; }
      else { this.vx = -this.vx; o.vx = -o.vx; this.x -= Math.sign(o.cx - this.cx) * 2; Sound.play('thud'); }
    }
    this.sandCheck(g);
    if (this.y > VIEW_H + 32 || this.x + this.w < g.camX - 160 || this.x > g.camX + VIEW_W + 260) this.remove = true;
  }
  breakMeat(g){
    if(this.dead||this.remove)return;this.dead=this.remove=true;this.flat=false;
    for(let i=0;i<24;i++)g.particles.push({kind:'sausageMeat',x:this.cx+rand(-11,11),y:this.y+rand(1,12),vx:rand(-2.6,2.6),vy:rand(-4,-.8),g:.2,drag:.99,t:0,life:45+rand(0,20),size:rand(2.2,5),variant:i%5,spin:rand(-.25,.25)});
    for(const side of [-1,1])g.particles.push({kind:'sausageWheel',x:this.cx+side*9,y:this.y+this.h-2,vx:side*rand(1.5,2.8),vy:rand(-3,-1.5),g:.2,t:0,life:55,size:2.8});
    Sound.play('pop');
  }
  flipKill(g){this.breakMeat(g);}
  stomp(g,p){
    if(this.dead||this.remove)return;g.bounce(p);g.stompScore(this);Sound.play('stomp');this.breakMeat(g);
  }
  updateDead() { if (this.flat) { if (++this.deadT > 30) this.remove = true; } else super.updateDead(); }
  // A fat link of andouille on a pair of little wheels (as in the concept), scowling the way it's going; its wheels
  // spin with its speed, and it trails speed lines when it's really moving
  // how it looks: crawdad-art.js (a link of andouille on two little wheels, scowling the way it's going)
  draw(ctx) {
    const d = this.vx < 0 ? -1 : 1, cx = this.cx, b = Math.round(this.y + this.h);
    if (this.flat) { gumboEll(ctx, cx, b - 2, 14, 3, INK); gumboEll(ctx, cx, b - 2, 13, 2, '#b02c1e'); ctx.fillStyle = '#ff9a80'; ctx.fillRect(Math.round(cx) - 6, b - 4, 9, 1); return; }
    gumboFlip(ctx, this, () => {
      if (Math.abs(this.vx) > 1.5) for (let i = 0; i < 3; i++) { ctx.fillStyle = '#fff0d8'; ctx.fillRect(Math.round(cx - d * (18 + (i % 2) * 4)) - (d > 0 ? 4 : 0), b - 14 + i * 4, 4, 1); }   // speed lines
      drawAndouilleArt(ctx, cx, b + (this.onRoux ? 3 : 0), d, this.spin, this.onGround && Math.abs(this.vx) > 1.4 ? (this.t >> 2) % 2 : 0, this.tilt || 0);
    });
  }
}
class AndouilleSpawner extends Enemy {
  constructor(col, until, every = 150) {
    super(col * TILE, 0, 1, 1);
    this.until = until * TILE; this.every = every; this.timer = 50;
    this.passive = this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    const p = g.player;
    if (p.x > this.until) { this.remove = true; return; }
    if (p.x < this.x - 48 || p.state !== 'play' || --this.timer > 0) return;
    // one at a time, in from the right edge, at fair intervals: only onto real ground (not roux), only when the way in is
    // clear (none just there to land on), and never more than three about
    const sx = Math.min(g.camX + VIEW_W + 8, this.until + 12 * TILE), lv = g.level, c = Math.floor(sx / TILE), row = lv.surfaceRow(c);   // (no further on than a little past its end)
    const rolling = g.entities.filter(e => e instanceof Andouille && !e.dead);
    if (sx > this.until + VIEW_W || row >= ROWS || lv.get(c, row) === T.QSAND || rolling.length >= 3 || rolling.some(e => Math.abs(e.cx - sx) < 6 * TILE) || g.entities.some(e => e.lineY && sx > e.xa - 16 && sx < e.xb + 16)) { this.timer = 20; return; }   // (and never into a slope's pile)
    this.timer = this.every + Math.floor(rand(-15, 15));
    g.entities.push(new Andouille(sx, row * TILE - 30, -1));
  }
  draw() {}
}

// ── OKRA SPITTER (and its seeds) ─────────────────────────────────────────────
const SPIT_EVERY = 150, SPIT_SWELL = 30, SPIT_GAP = 9;
class OkraSpitter extends Enemy {
  constructor(col, row) {
    super(col * TILE + 2, (row + 1) * TILE - 24, 12, 24);
    this.timer = 60 + (col * 7) % 60; this.face = -1; this.swell = 0; this.burstLeft = 0; this.burstTimer = 0; this.speakerName = 'OKRA';
  }
  update(g) {
    this.t++;
    const p = g.player, dx = p.x + p.w / 2 - this.cx;
    this.face = dx < 0 ? -1 : 1;
    const inView = this.x > g.camX - 8 && this.x < g.camX + VIEW_W - 8;
    if (this.swell > 0) {
      if (++this.swell >= SPIT_SWELL) {
        this.swell = 0; this.burstLeft = 4 + Math.floor(Math.random() * 2); this.burstTimer = 0;
      }
    } else if (this.burstLeft > 0) {
      if (--this.burstTimer <= 0) {
        this.spit(g); this.burstLeft--; this.burstTimer = SPIT_GAP;
      }
    } else if (--this.timer <= 0 && inView && Math.abs(dx) < 11 * TILE && p.state === 'play') { this.swell = 1; this.timer = SPIT_EVERY; }
  }
  spit(g) {
    const p = g.player, sx = this.cx + this.face * 5, sy = this.y + 3, vy = -4.6, gr = 0.2;
    const dy = (p.y + p.h) - sy, T = (-vy + Math.sqrt(vy * vy + 2 * gr * Math.max(-20, dy))) / gr;
    const vx = clamp((p.x + p.w / 2 - sx) / Math.max(20, T), -2.4, 2.4);
    g.entities.push(new OkraSeed(sx, sy, vx, vy));
    Sound.play('spit');
  }
  // how it looks: crawdad-art.js (a ridged, thorny pod, puffing up before it spits, scowling at him)
  draw(ctx) {
    gumboFlip(ctx, this, () => {
      const s = this.swell ? Math.sin(this.swell / SPIT_SWELL * Math.PI) : 0;
      drawOkraArt(ctx, this.cx, this.y + this.h, this.face, s > 0.66 ? 2 : s > 0.2 ? 1 : 0, !!this.swell);
    });
  }

}
class OkraSeed extends Enemy {
  constructor(x, y, vx, vy) {
    super(x - 3, y - 3, 6, 6);
    this.vx = vx; this.vy = vy;
    this.stompable = false; this.fireKill = true; this.shellKill = false; this.bumpKill = false;
  }
  update(g) {
    this.t++;
    this.vy = Math.min(this.vy + 0.2, 5);
    this.x += this.vx;
    const lv = g.level, c = Math.floor(this.cx / TILE), r = Math.floor((this.y + this.h) / TILE);
    if (lv.get(c, r) === T.QSAND && this.vy > 0) { g.sandPuff(this.cx, r * TILE + 4, 3); this.remove = true; return; }
    if (sweepY(lv, this, this.vy) === 1) {   // splat: a fresh puddle of slime where it lands
      const col = Math.floor(this.cx / TILE - 0.5), row = Math.floor((this.y + this.h) / TILE) - 1;
      if (lv.solid(col, row + 1) && lv.solid(col + 1, row + 1)) g.entities.push(new SlimePuddle(col, row, 2, 480));
      for (let i = 0; i < 6; i++) g.particles.push({ kind: 'px', x: this.cx, y: this.y + this.h, vx: rand(-1, 1), vy: rand(-1.4, -0.3), g: 0.15, life: 20, t: 0, color: i % 2 ? '#7ac850' : '#e8ffc8', size: 2 });
      Sound.play('plop'); this.remove = true; return;
    }
    if (this.y > VIEW_H + 16 || this.x < g.camX - 40 || this.x > g.camX + VIEW_W + 40) this.remove = true;
  }
  // a direct hit doesn't hurt: it splats on him, and his feet are slimed
  onTouch(g, p) {
    this.remove = true; g.slimeFeet(p);
    Sound.play('plop');
  }
  draw(ctx) {
    const x = Math.round(this.cx), y = Math.round(this.y + 3);
    fEll(ctx, x + 0.5, y + 0.5, 3, 3.4, INK); fEll(ctx, x + 0.5, y + 0.5, 2.1, 2.5, '#f4ffe0'); fEll(ctx, x - 0.3, y - 0.4, 0.7, 0.9, '#ffffff');   // a seed, trailing slime (fine)
    fEll(ctx, x - 1.8, y + 3, 1, 1.2, '#7ac850'); fEll(ctx, x + 1.6, y + 4, 0.6, 1, '#7ac850');
  }
}

// ── ONION TEARER (and its gas) ───────────────────────────────────────────────
const ONION_DROP = 170;
class Onion extends Enemy {
  constructor(col, row) {
    super(col * TILE, row * TILE, 16, 16);
    this.hy = row * TILE; this.layers = 2; this.timer = 80; this.speakerName = 'ONION';
  }
  update(g) {
    this.t++;
    const p = g.player, dx = p.x + p.w / 2 - this.cx;
    // the first onion of the visit, once it's all the way on screen: a word of warning
    if (!g.onionTold && p.state === 'play' && this.x >= g.camX && this.x + this.w <= g.camX + VIEW_W && this.y >= 0) {
      g.onionTold = true; g.tipLine('ONION GAS', 'ONION GAS INVERTS YOUR CONTROLS, CAREFUL!');
    }
    if (Math.abs(dx) < 10 * TILE && p.state === 'play') this.vx += (Math.sign(dx) * 0.55 - this.vx) * 0.03;
    else this.vx *= 0.95;
    this.x += this.vx;
    this.y = this.hy + Math.sin(this.t * 0.05) * 4;
    if (--this.timer <= 0 && Math.abs(dx) < 30 && p.y > this.y) {
      this.timer = ONION_DROP;
      g.entities.push(new TearCloud(this.cx, this.y + this.h));
      Sound.play('sour');
    }
    if (this.timer > 20 && this.timer % 40 === 0) g.particles.push({ kind: 'px', x: this.cx + (this.t % 80 < 40 ? -3 : 3), y: this.y + 9, vx: 0, vy: 0.6, g: 0.1, life: 20, t: 0, color: '#9ad8ff', size: 1 });   // always crying
  }
  stomp(g, p) {
    if (--this.layers > 0) {   // a layer peels off: it's smaller, and still crying
      g.bounce(p); Sound.play('stomp'); g.stompScore(this);
      this.x += 2; this.w = 12; this.h = 12; this.hy += 4;
      
      g.particles.push({ kind: 'px', x: this.cx, y: this.y, vx: rand(-1, 1), vy: -2, g: 0.15, life: 40, t: 0, color: '#d8a868', size: 3 });
      return;
    }
    super.stomp(g, p);
  }
  // how it looks: crawdad-art.js (a teardrop bulb in papery skin -- pale and smaller with a layer peeled -- crying)
  draw(ctx) {
    gumboFlip(ctx, this, () => drawOnionArt(ctx, this.cx, this.y + this.h / 2 + 1, this.layers > 1, this.t));
  }

}
class TearCloud extends Enemy {
  constructor(x, y) {
    super(x - 6, y, 12, 10);
    this.r = 5; this.passive = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return { x: this.cx - this.r, y: this.y + 5 - this.r, w: this.r * 2, h: this.r * 2 }; }
  update(g) {
    this.t++;
    const lv = g.level;
    if (this.t < 80 && !lv.solid(Math.floor(this.cx / TILE), Math.floor((this.y + 5 + this.r) / TILE))) this.y += 0.6;
    this.r = Math.min(15, 5 + this.t * 0.2);
    if (this.t > 260) this.remove = true;
  }
  onTouch(g, p) { if (this.t < 240) g.tearUp(p); }
  draw(ctx) { drawTearCloudArt(ctx, this.cx, this.y + 5, this.r, Math.min(1, (260 - this.t) / 40) * 0.45, this.t); }

}

// ── CELERY STALKER ───────────────────────────────────────────────────────────
const CELERY_H = 56, CELERY_PLUCK = 24;
// a chunk of blown-apart celery stalk: tumbles end over end, bounces once off the floor, then fades
class CeleryChunk extends Enemy {
  constructor(x, y, vx, vy) {
    super(x - 3, y - 3, 6, 6);
    this.vx = vx; this.vy = vy; this.spin = rand(0, 6); this.vs = rand(0.2, 0.4) * (vx < 0 ? -1 : 1); this.bounced = false;
    this.passive = this.friendly = this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++; this.spin += this.vs; this.vy = Math.min(this.vy + 0.25, 6); this.x += this.vx;
    if (sweepY(g.level, this, this.vy) === 1) { if (this.bounced) { this.vx *= 0.8; this.vy = 0; } else { this.vy = -2.2; this.vx *= 0.6; this.bounced = true; } }
    if (this.t > 70 || this.y > VIEW_H + 20) this.remove = true;
  }
  draw(ctx) {
    const x = Math.round(this.cx), y = Math.round(this.y + 3), c = Math.abs(Math.cos(this.spin)), vert = c < 0.5;
    const w = vert ? 4 : 8, h = vert ? 8 : 4;
    ctx.globalAlpha = Math.min(1, (70 - this.t) / 15);
    fRoundRect(ctx, x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2, 1.6, INK);   // a chunk of celery, tumbling (fine)
    fRoundRect(ctx, x - w / 2, y - h / 2, w, h, 1.2, '#a8d878');
    fRoundRect(ctx, x - w / 2 + 0.3, y - h / 2 + 0.3, vert ? 0.8 : w - 0.6, vert ? h - 0.6 : 0.8, 0.4, '#d8f4a8');
    fRoundRect(ctx, vert ? x + 0.8 : x - w / 2 + 0.3, vert ? y - h / 2 + 0.3 : y + 0.8, vert ? 0.8 : w - 0.6, vert ? h - 0.6 : 0.8, 0.4, '#78b050');
    ctx.globalAlpha = 1;
  }
}   // (frames reaching up to pluck its leaves, before the fling)
// a celery leaf, flung: it tumbles and flutters down, rocking side to side -- scenery in the air, it never hurts anyone
class CeleryLeaf extends Enemy {
  constructor(x, y, vx, vy) {
    super(x - 3, y - 3, 6, 6);
    this.vx = vx; this.vy = vy; this.ph = rand(0, 6); this.spin = rand(0, 6); this.life = 150 + Math.floor(rand(0, 60)); this.light = rand(0, 1) < 0.5;
    this.passive = this.friendly = this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update() {
    this.t++;
    this.vx *= 0.97; this.vy = Math.min(this.vy + 0.09, 0.9);
    this.x += this.vx + Math.sin(this.t * 0.12 + this.ph) * 0.5; this.y += this.vy;
    this.spin += 0.15;
    if (this.t > this.life) this.remove = true;
  }
  draw(ctx) {
    const x = this.cx, y = this.y + 3.5, k = Math.cos(this.spin), w = Math.max(0.6, Math.abs(k) * 3.4);   // a leaf, tumbling (fine: hires.js)
    ctx.globalAlpha = Math.min(1, (this.life - this.t) / 30);
    fEll(ctx, x, y, w + 1, 2.6, INK); fEll(ctx, x, y, w, 1.8, this.light ? '#8ad860' : '#5ab048');
    fEll(ctx, x - w * 0.3, y - 0.6, w * 0.55, 0.6, this.light ? '#c8f0a0' : '#8ad860');
    fRoundRect(ctx, x - 0.3, y - 0.2, 0.67, 2, 0.3, '#3a7a28');
    ctx.globalAlpha = 1;
  }
}
class Celery extends Enemy {
  constructor(col, row) {
    super(col * TILE + 1, (row + 1) * TILE - CELERY_H, 14, CELERY_H);
    this.vx = -0.3; this.walker = true; this.bend = 0; this.rollKill = true; this.state = 'walk'; this.ang = 0; this.speakerName = 'CELERY';
    this.throwT = 0; this.cool = 90 + (col * 13) % 60;   // its leaf-throwing: 0 idle, else frames into a pluck-and-fling
  }
  hitbox() { return this.state === 'walk' ? this : null; }
  update(g) {
    this.t++;
    if (this.bend > 0) this.bend -= 0.06;
    if (this.state === 'walk') {
      // it plucks a fistful of its own leaves and flings them at him: a flurry that never hurts, just gets everywhere
      const p = g.player, dx = p.x + p.w / 2 - this.cx;
      if (this.throwT) {
        this.vx = 0.001 * (dx < 0 ? -1 : 1);
        if (++this.throwT === CELERY_PLUCK + 6) this.fling(g, dx);
        if (this.throwT >= CELERY_PLUCK + 26) { this.throwT = 0; this.cool = 150; this.vx = 0.3 * (dx < 0 ? -1 : 1); }
      } else if (--this.cool <= 0 && p.state === 'play' && Math.abs(dx) < 9 * TILE && this.onGround) { this.throwT = 1; Sound.play('leaf'); }
      this.walk(g, true);
      return;
    }
    if (this.state === 'fall') {   // TIMBER: it tips over from its base, faster and faster
      this.av = (this.av || 0.004) * 1.16;
      this.ang = Math.min(Math.PI / 2, this.ang + this.av);
      if (this.ang >= Math.PI / 2) {
        this.state = 'log';
        const base = this.y + this.h, x0 = this.dir > 0 ? this.x : this.x + this.w - CELERY_H;
        const log = new CeleryLog(x0, base - 12, CELERY_H);
        g.platforms.push(log); this.log = log;
        g.dust(this.dir > 0 ? x0 + CELERY_H : x0, base, 6); Sound.play('thud');
      }
    }
  }
  fling(g, dx) {
    const d = dx < 0 ? -1 : 1, hx = this.cx + d * 6, hy = this.y + 14;
    for (let i = 0; i < 14; i++) g.entities.push(new CeleryLeaf(hx, hy, d * rand(1.4, 3.6), rand(-3.8, -1.2)));
    Sound.play('whoosh');
  }
  onTouch(g, p) {
    if (g.isStomp(p, this)) {   // the leafy top: still a springboard -- and the stalk blows apart under him
      const held = Input.down('jump') || Input.down('up');
      p.vy = -(held ? 6.6 : 6.0); p.jumping = held;   // (held: ~128 px of air)
      p.holdGrace = 0; p.onGround = false; p.platform = null; p.flaps = 0; p.y = this.y - p.h;
      p.sx = 0.8; p.sy = 1.25;
      Sound.play('spring');
      this.blowUp(g);
      return;
    }
    g.hurtPlayer();
  }
  // whatever would kill it -- fire, a roll, a kicked shell -- chops its base instead, and it falls the way it was hit
  // POP: rolled into, or stomped on the head, it bursts -- chunks of stalk spinning off, its leaves everywhere, juice, a puff
  blowUp(g) {
    if (this.state !== 'walk') return;
    this.state = 'gone'; this.dead = true; this.remove = true;
    const cx = this.cx, top = this.y;
    for (let i = 0; i < 9; i++) g.entities.push(new CeleryChunk(cx + rand(-4, 4), top + 10 + i * 5, rand(-3, 3), rand(-6, -2.5)));
    for (let i = 0; i < 12; i++) g.entities.push(new CeleryLeaf(cx + rand(-6, 6), top + rand(0, 8), rand(-2.6, 2.6), rand(-4.5, -1.5)));
    for (let i = 0; i < 16; i++) g.particles.push({ kind: 'px', x: cx + rand(-6, 6), y: top + rand(8, CELERY_H - 6), vx: rand(-2.4, 2.4), vy: rand(-3.5, -0.5), g: 0.18, life: 30, t: 0, color: i % 3 ? '#b8e890' : '#ffffff', size: 2 });
    for (let i = 0; i < 8; i++) g.particles.push({ kind: 'px', x: cx + rand(-8, 8), y: top + rand(10, CELERY_H - 10), vx: rand(-0.6, 0.6), vy: rand(-0.9, -0.2), drag: 0.92, life: 28, t: 0, color: '#f4efe4', size: 4 });   // the puff
    g.addScore(1000, cx, top); Sound.play('pop'); Sound.play('crack');
  }
  catHit(g) { if (this.state !== 'walk') return false; this.blowUp(g); }   // (the cat's claws pop it like a stomp or a roll, never topple it)
  flipKill(g, dir) {
    if (this.state !== 'walk') return;
    const p = g.player;
    if (p.roll > 0 && overlap(p, this)) { this.blowUp(g); return; }   // (a roll bursts it; fire, a shell or a cleaver fell it like a tree)
    this.state = 'fall'; this.dir = dir || (g.player.x + g.player.w / 2 < this.cx ? 1 : -1); this.vx = 0; this.dead = false;
    g.addScore(1000, this.cx, this.y); 
    Sound.play('crack');
  }
  touches(p) { return this.state === 'walk' && super.touches(p); }
  draw(ctx) {
    const bx = Math.round(this.cx), by = Math.round(this.y + this.h);
    ctx.save(); ctx.translate(bx, by);
    if (this.state !== 'walk') ctx.rotate(this.ang * this.dir);
    const bend = Math.sin(this.t * 0.05) * 1 + this.bend * 3;
    // the stalk (crawdad-art.js), row by row so it bends; its leafy top
    const stalk = celeryStalkArt(), sh = CELERY_H - 12;
    for (let y = 0; y < sh; y += 1) { const ox = bend * (y / CELERY_H) ** 2; ctx.drawImage(stalk, 0, (sh - 1 - y) * 43 / (sh - 1), 16, 1, fSnap(ox) - 8, -y - 1, 16, 1); }   // (bending in fine slices: hires.js)
    const tx = Math.round(bend), ty = -CELERY_H + 6, sway = Math.round(Math.sin(this.t * 0.07) * 1);
    ctx.drawImage(celeryLeavesArt(), tx - 24 + sway, ty - 27);
    if (this.state === 'walk') {   // two stringy arms: hanging at its sides, or one up in its leaves (plucking), then flung out
      const d = this.vx < 0 ? -1 : 1, k = this.throwT, ay = -30;
      const arm = (sx, ex, ey) => {   // a stringy arm, a little round hand (fine strokes)
        ctx.lineCap = 'round'; for (const [wd, c] of [[2.6, INK], [1, '#78b050']]) { ctx.strokeStyle = c; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(sx + 0.5, ay + 0.5); ctx.quadraticCurveTo((sx + ex) / 2 + 0.5, ay + 2, ex + 0.5, ey + 0.5); ctx.stroke(); }
        fBlob(ctx, ex + 0.5, ey + 0.5, 2.2, INK); fBlob(ctx, ex + 0.5, ey + 0.5, 1.4, '#a8d878');
      };
      const sw = Math.sin(this.t * 0.1) * 1.5;
      arm(-6 - d * 0, -10, -18 + sw);                                      // the far arm, hanging
      if (!k) arm(6, 10, -18 - sw);
      else if (k < CELERY_PLUCK) arm(5, tx + 4, ty + 6 - Math.round(k / CELERY_PLUCK * 4));   // reaching up into its leaves
      else { const u = Math.min(1, (k - CELERY_PLUCK) / 6); arm(5, Math.round(4 + d * 14 * u), Math.round(ty + 4 + (ay + 4 - ty) * u)); }   // flung out toward him
    }
    if (this.state === 'walk') {   // a stern face partway up, and little feet
      for (const ex of [tx - 2, tx + 3]) fEll(ctx, ex, -33, 1.1, 1.2, INK);   // a stern face (fine)
      fLine(ctx, tx - 4, -36.4, tx - 1, -35.4, INK, 2); fLine(ctx, tx + 5, -36.4, tx + 2, -35.4, INK, 2); fRoundRect(ctx, tx - 1, -29.2, 3, 0.8, 0.4, INK);
      const st = (this.t >> 3) % 2;
      fRoundRect(ctx, -5, -1 - st, 3, 2, 0.8, INK); fRoundRect(ctx, 2, -1 - (1 - st), 3, 2, 0.8, INK);
    }
    ctx.restore();
  }
}
// a toppled celery stalk lying on its side: a one-way platform (the stalk itself is drawn by the Celery)
class CeleryLog {
  constructor(x, y, w) { this.x = x; this.y = y; this.w = w; this.h = 10; this.dx = 0; this.dy = 0; this.prevY = y; }
  update() { this.prevY = this.y; }
  draw() {}
}

// ── BELL PEPPER BOUNCER ──────────────────────────────────────────────────────
const PEPPER_EVERY = 200;
class BellPepper extends Enemy {
  constructor(col, row) {
    super(col * TILE - 3, (row + 1) * TILE - 22, 22, 22);
    this.vx = -0.4; this.walker = true; this.hp = 2; this.timer = 120; this.state = 'walk'; this.st = 0; this.speakerName = 'BELL PEPPER';
  }
  // red with rage, stem gone, it spews seeds out of the open top (harmless: they bounce once and fade)
  seeds(g, n, big) {
    for (let i = 0; i < n; i++) g.particles.push({ kind: 'px', x: this.cx + rand(-3, 3), y: this.y + 1, vx: rand(-1.6, 1.6) * (big ? 1.5 : 1), vy: rand(-4.2, -2.2) * (big ? 1.2 : 1), g: 0.18, life: 46, t: 0, color: i % 3 ? '#fff0c8' : '#e8d8a0', size: 2 });
  }
  update(g) {
    this.t++; this.prevY = this.y; if (this.safeT > 0) this.safeT--;
    const p = g.player, dx = p.x + p.w / 2 - this.cx, near = Math.abs(dx) < 9 * TILE && p.state === 'play';
    if (this.hp < 2 && this.t % 34 === 0 && this.x > g.camX - 20 && this.x < g.camX + VIEW_W + 20) this.seeds(g, 5, false);
    if (this.state === 'walk') {
      this.walk(g, true);
      if (near && --this.timer <= 0 && this.onGround) { this.state = 'crouch'; this.st = 0; this.vx = Math.sign(dx) * Math.abs(this.vx); }
      return;
    }
    this.st++;
    if (this.state === 'crouch' && this.st >= 20) { this.state = 'air'; this.vy = -5.5; this.onGround = false; Sound.play('hop'); }
    if (this.state === 'air') {
      this.vy = Math.min(this.vy + 0.3, 7);
      const r = sweepY(g.level, this, this.vy);
      if (r === 1 && this.vy >= 0) this.slam(g);
      else if (r === -1) this.vy = 0;
      this.sandCheck(g);
    }
    if (this.state === 'land' && this.st >= 24) { this.state = 'walk'; this.timer = this.hp > 1 ? PEPPER_EVERY : PEPPER_EVERY * 0.6; }
  }
  // the slam: a shockwave along the floor that throws anyone standing on it sky-high
  slam(g) {
    this.state = 'land'; this.st = 0; this.vy = 0; this.onGround = true;
    Sound.play('pound'); g.shake = Math.max(g.shake, 2.5);
    if (this.hp < 2) this.seeds(g, 12, true);   // (a slam shakes a shower of them out)
    g.dust(this.x, this.y + this.h, 5); g.dust(this.x + this.w, this.y + this.h, 5);
    const p = g.player, floor = this.y + this.h;
    if (p.state === 'play' && p.onGround && Math.abs(p.x + p.w / 2 - this.cx) < 6 * TILE && Math.abs(p.y + p.h - floor) < 6) {
      p.vy = -9.6; p.onGround = false; p.platform = null; p.jumping = false; p.holdGrace = 0; p.flaps = 0; p.sx = 0.7; p.sy = 1.3;
      Sound.play('sproing');
    }
  }
  // it leaps: feet on its top is a stomp, whichever way either of them is moving (landing on it as it rises into him,
  // or it jumping up under him while its own slam has him in the air); only its sides hurt
  onTouch(g, p) {
    if (this.safeT > 0) return;   // (just stomped: he's bouncing off it)
    const top = Math.min(this.y, this.prevY ?? this.y);
    if (!g.wet(p.x + p.w / 2) && p.prevY + p.h <= top + 10) this.stomp(g, p);
    else g.hurtPlayer();
  }
  // however it goes (stomped, burnt, chopped, bowled over): it bursts into chunks of pepper and a spray of seeds
  flipKill(g) {
    this.dead = this.remove = true;
    const red = this.hp < 2 || this.red, cols = red ? ['#d8241e', '#ff5a3a', '#8a1010'] : ['#3a9a2a', '#6ad04a', '#1e6a1a'], cy = this.y + this.h / 2;
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.particles.push({ kind: 'px', x: this.cx + Math.cos(a) * 6, y: cy + Math.sin(a) * 6, vx: Math.cos(a) * rand(1.4, 3.2), vy: Math.sin(a) * rand(1.4, 3) - 2, g: 0.22, life: 40, t: 0, color: cols[i % 3], size: i % 4 ? 3 : 4 }); }
    if (!red) g.particles.push({ kind: 'px', x: this.cx, y: this.y - 2, vx: rand(-1, 1), vy: -3.2, g: 0.15, life: 50, t: 0, color: '#3a7a2a', size: 3 });   // (its stem)
    this.seeds(g, 10, true);
    g.shake = Math.max(g.shake, 1.5); Sound.play('pop');
  }
  stomp(g, p) {
    if (--this.hp > 0) {   // the stem pops off -- and it ripens red with rage
      g.bounce(p); Sound.play('pop'); g.stompScore(this);
      this.safeT = 20; if (this.vy < 0) this.vy = 1;   // (stomped mid-leap: knocked back down, not up into him)
      g.particles.push({ kind: 'px', x: this.cx, y: this.y - 2, vx: rand(-1, 1), vy: -3, g: 0.15, life: 50, t: 0, color: '#3a7a2a', size: 3 });
      
      this.vx = Math.sign(this.vx || -1) * 0.75; this.timer = Math.min(this.timer, 40);
      return;
    }
    this.red = true; g.bounce(p); g.stompScore(this); Sound.play('stomp');
    this.flipKill(g);
  }
  // how it looks: crawdad-art.js (green with its stem; red with rage, stem gone, seeds showing; squashing as it crouches and lands)
  draw(ctx) {
    gumboFlip(ctx, this, () => {
      const squash = this.state === 'crouch' ? 2 : this.state === 'land' && this.st < 8 ? 1 : 0;
      drawPepperArt(ctx, this.cx, this.y + this.h, this.hp < 2, squash, this.t);
    });
  }

}

// ── the Holy Trinity introduce themselves ('trinity', x) ─────────────────────
const TRINITY_LINES = [
  ['ONION', '*sniff* Halt! This is the Holy Trinity\'s pot!'],
];
class TrinityTalk extends Enemy {
  constructor(col) {
    super(col * TILE, 0, 1, 1);
    this.passive = this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    const p = g.player;
    if (p.state !== 'play' || p.x < this.x || g.trinitySaid) return;
    g.trinitySaid = true; this.remove = true;
    const kinds = { ONION: Onion, CELERY: Celery, 'BELL PEPPER': BellPepper };
    for (const [who, line] of TRINITY_LINES) {
      const e = g.entities.filter(e => e instanceof kinds[who] && !e.dead).sort((a, b) => Math.abs(a.cx - p.x) - Math.abs(b.cx - p.x))[0];
      g.speak(e || { speakerName: who, remove: true }, line, who === 'ONION' ? '#f0d8a0' : who === 'CELERY' ? '#b8e890' : '#ff7a5a');
    }
  }
  draw() {}
}

// their 1x drawings, lifted to the fine screen look by look (hires.js)

