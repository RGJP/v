'use strict';
// Cloudtop Heights set pieces (1-3). Up here everything is a ride:
//   Parasol Pete   a grumpy little man under an umbrella; stomp the brolly and float off with it
//   Puffinch       a round bird; stomp it and it puffs up into a balloon you can ride up the sky
//   Sulkcloud      a sulky raincloud that follows you around; stomp it and it bursts into tears,
//                  and the rain makes a thirsty Sproutpot grow a beanstalk
//   Clapper        two giant cloud gloves clapping over a chasm: ride a hand in, and the clap
//                  throws you sky-high ("BRAVO!"); get caught between them and it's SQUISH
//   SkyWhale       a gentle whale that swims you over the void, and spouts you up from its blowhole
//   RainbowStar    grab it and you run on a rainbow road of your own for a few seconds

// ---------- Parasol Pete ----------------------------------------------------------------------
const BROLLY_LINES = ['MY BROLLY!', 'THIEF!!', 'I WAS USING THAT!', 'NOT AGAIN...', 'MUM!!'];
const BROLLY_TIME = 300, BROLLY_WARN = 90;   // five seconds of flight; flutter and blink for the last second and a half
class Brolly extends Enemy {
  constructor(col, row, low) {
    super(col * TILE + 2, row * TILE, 12, 14);
    this.home = this.x; this.top = row * TILE; this.low = (low == null ? row + 4 : low) * TILE;
    this.state = 'float'; this.timer = 0; this.n = 0;
    this.passive = true; this.noFreeze = true; this.friendly = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  canopy() { return { x: this.cx + PETE_GRIP - 13, y: this.y - 15, w: 26, h: 10 }; }   // (held up in his right hand)
  hitbox() { return this.state === 'float' ? this : null; }
  touches(p) { return this.state === 'float' && (overlap(this, p) || overlap(this.canopy(), p)); }
  update(g) {
    this.t++;
    const p = g.player;
    if (this.state === 'float') {
      const k = 0.5 - 0.5 * Math.cos(this.t * Math.PI * 2 / 320);
      this.x = this.home + Math.sin(this.t * 0.027) * 10;
      this.y = this.top + (this.low - this.top) * k;
      if (!g.level.brollyTold && Math.abs(p.x - this.x) < 170) { g.level.brollyTold = true; g.say('PARASOL PETE!', 'STOMP HIS BROLLY TO STEAL IT', '#ffd166'); }
    } else if (this.state === 'fall') {
      this.vy = Math.min(this.vy + 0.3, 6); this.y += this.vy; this.x += this.vx;
      if (this.y > VIEW_H + 40) { this.state = 'gone'; this.timer = 200; }
    } else if (this.state === 'gone') {
      // he always has a spare: back he comes, drifting down from above
      if (--this.timer <= 0) { this.state = 'back'; this.x = this.home; this.y = -30; }
    } else if (this.state === 'back') {
      this.y += 0.8;
      if (this.y >= this.top) { this.y = this.top; this.state = 'float'; this.t = 0; }
    }
  }
  onTouch(g, p) {
    const c = this.canopy();
    if (p.vy > 0 && p.prevY + p.h <= c.y + 8 && p.x + p.w > c.x && p.x < c.x + c.w) {
      // the brolly is ours now: a puff pops Chickaroo up, and down he floats under it
      this.state = 'fall'; this.vy = -2.5; this.vx = rand(-0.6, 0.6);
      p.floatT = BROLLY_TIME; p.chute = 'brolly'; p.vy = -3.2; p.jumping = false; p.springAir = false; p.onGround = false; p.spin = false; p.pounding = false;
      p.flapN = p.flapCool = p.flapGap = p.flapBuf = 0; p.flapRise = false;
      g.speak(this, BROLLY_LINES[this.n++ % BROLLY_LINES.length], '#ffffff');
      g.addScore(200);
      Sound.play('whoosh'); Sound.play('honk');
      return;
    }
    // bumping into Pete himself just gets you an earful
    if (overlap(this, p) && !(this.grumble > this.t)) { this.grumble = this.t + 60; g.speak(this, 'OI! HANDS OFF!', '#ffd166'); Sound.play('honk'); }
  }
  draw(ctx) {
    if (this.state === 'gone') return;
    const cx = Math.round(this.cx), y = Math.round(this.y), held = this.state !== 'fall';
    const sway = held ? Math.round(Math.sin(this.t * 0.05) * 1.5) : 0;
    const flail = held ? 0 : (this.t >> 2) % 2;   // (painted fine: sky-fine.js)
    ctx.drawImage(brollyPeteArt(held, sway, flail), cx - 11, y + 14 - 20);
    if (held) {   // the brolly in front of him, its shaft in his raised fist
      const hx = cx + PETE_GRIP + sway * 0.33;
      drawBrollyCanopy(ctx, hx, y - 4, this.t);
      ctx.drawImage(peteFistArt(), hx - 2, y - 1.4);
    }
  }
}
// a red-and-white striped umbrella, its canopy's top at (cx, top - 10), its handle down to `top + 3`
function drawBrollyCanopy(ctx, cx, top, t, noHandle) { ctx.drawImage(brollyCanopyArt(!!noHandle), cx - 15, top - 14); }   // (painted fine: sky-fine.js)

// ---------- Puffinch --------------------------------------------------------------------------
// A plump little bird. Stomp it and it panics and PUFFS up into a balloon, rising with you on its
// head; after a few seconds it blinks... and goes PFFFT, zipping off like a let-go balloon.
// 'fly' ones just fly left across the sky instead of patrolling.
const PUFF_RISE = 0.62, PUFF_TIME = 250, PUFF_RADIUS = 16, PUFF_PLATFORM_W = 30;
class Puffinch extends Enemy {
  constructor(col, row, mode) {
    super(col * TILE + 1, row * TILE + 2, 14, 12);
    this.x0 = this.x; this.y0 = this.y; this.mode = mode || 'patrol';
    this.vx = this.mode === 'fly' || this.mode === 'wave' ? -1.1 : 0.55; this.state = 'fly'; this.r = 6;
    this.top = null;
  }
  hitbox() { return this.state === 'fly' ? this : null; }
  update(g) {
    this.t++;
    if (this.state === 'fly') {
      this.x += this.vx;
      if (this.mode === 'patrol' && Math.abs(this.x - this.x0) > 34) { this.vx = -this.vx; this.x = this.x0 + Math.sign(this.x - this.x0) * 34; }
      this.y = this.y0 + Math.sin(this.t * 0.12) * 3 + (this.mode === 'wave' ? Math.sin(this.t * 0.045) * 26 : 0);
      if (this.x + this.w < g.camX - 60) this.remove = true;
    } else if (this.state === 'pop') {
      // the air rushing out sends it zigzagging away
      this.x += this.vx; this.y += this.vy; this.vx += Math.sin(this.t * 0.6) * 0.8; this.vy -= 0.08;
      if (this.t % 2 === 0) g.particles.push({ kind: 'px', x: this.cx, y: this.y + 6, vx: rand(-0.4, 0.4), vy: rand(0.2, 0.8), life: 18, t: 0, color: '#ffffff', size: 2 });
      if (this.y < -40 || this.t > 120) this.remove = true;
    }
  }
  // the inflated bird is a platform (it lives in g.platforms while it's puffed up)
  rise(g) {
    const pl = this.top, oy = pl.y;
    this.timer--;
    if (this.r < PUFF_RADIUS) this.r++;
    this.y -= PUFF_RISE;
    this.x += Math.sin(this.t * 0.05) * 0.15;
    pl.x = this.cx - pl.w / 2; pl.y = this.y + 7 - this.r; pl.prevY = oy; pl.dx = Math.sin(this.t * 0.05) * 0.15; pl.dy = pl.y - oy;
    if (this.timer <= 0 || pl.y < 10) this.pop(g);
  }
  pop(g) {
    const i = g.platforms.indexOf(this.top);
    if (i >= 0) g.platforms.splice(i, 1);
    if (g.player.platform === this.top) g.player.platform = null;
    this.top = null; this.state = 'pop'; this.t = 0; this.r = 6; this.vx = rand(-1, 1); this.vy = -1;
    Sound.play('whoosh');
  }
  stomp(g, p) {
    this.state = 'puff'; this.timer = PUFF_TIME; this.t = 0;
    this.top = { x: this.cx - PUFF_PLATFORM_W / 2, y: this.y, w: PUFF_PLATFORM_W, h: 6, dx: 0, dy: 0, prevY: this.y, update: gg => this.rise(gg), draw() {} };
    g.platforms.push(this.top);
    this.top.y = this.top.prevY = this.y + 7 - this.r;
    p.y = this.top.y - p.h; p.vy = 0.5; p.jumping = false; p.onGround = false; p.springAir = false; p.spin = false;   // set down right on top of the swelling balloon
    g.addScore(100);   // scored quietly: a popup would sit right in front of the ride
    Sound.play('honk');
  }
  draw(ctx) {   // (in fine pixels: hires.js)
    const cx = Math.round(this.cx), cy = Math.round(this.y + 6), f = this.vx < 0 ? -1 : 1;
    const PINK = ['#a83a64', '#df658f', '#ff9ab8', '#ffc8d8', '#ffe4ec'];
    if (this.flipped) { fBlob(ctx, cx, cy, 7.5, INK); fBlob(ctx, cx, cy, 6.6, PINK[2]); for (const ex of [-2, 2]) fArc(ctx, cx + ex, cy + 1.6, 0.6, 1.3, Math.PI * 1.1, Math.PI * 1.9, INK); return; }
    if (this.state === 'puff') {
      const left = this.timer, blink = left < 60 && (left >> 2) % 2;
      const r = this.r + (left < 60 ? Math.sin(this.t * 0.9) : 0), by = Math.round(this.y + 7);
      const wf = (this.t >> 1) % 2 ? -3 : 1;
      for (const s of [-1, 1]) { fEll(ctx, cx + s * (r + 2.4), by + wf + 1.4, 3.4, 2, INK); fEll(ctx, cx + s * (r + 2.4), by + wf + 1.2, 2.6, 1.3, '#ffd0dc'); }   // furiously flapping wings
      fBlob(ctx, cx, by, r + 0.9, INK); fBlob(ctx, cx, by, r, blink ? '#ffd0dc' : PINK[1]);
      fBlob(ctx, cx - 1, by - 1.6, r - 1.6, blink ? '#ffe3ec' : PINK[2]); fBlob(ctx, cx, by + 4, Math.max(3, r - 6), '#ffe4e8');
      fBlob(ctx, cx - 3, by - 4, Math.max(2, r - 7), PINK[3]);
      fEll(ctx, cx - r * 0.5, by - r * 0.55, 2, 1.2, '#ffffff');   // shine
      for (const ex of [-3.4, 4.4]) fArc(ctx, ex + cx, by - 1, 0.8, 1.6, Math.PI * 1.15, Math.PI * 1.85, INK);   // squeezed-shut eyes
      fEll(ctx, cx - 6.4, by + 2, 1.6, 1, '#ff6a8a'); fEll(ctx, cx + 7.4, by + 2, 1.6, 1, '#ff6a8a');   // puffed cheeks
      fEll(ctx, cx + 0.5, by + 2.4, 1.8, 1.4, INK); fEll(ctx, cx + 0.5, by + 2.2, 1.1, 0.7, '#ffb347');   // a tiny beak
      fRect(ctx, cx - 2, by + r, 2 / 3, 3, INK); fRect(ctx, cx + 2.4, by + r, 2 / 3, 3, INK);   // dangling feet
      return;
    }
    if (this.state === 'pop') {   // a sad deflated scrap of a bird
      fEll(ctx, cx, cy + 1, 5.6, 4.4, INK); fEll(ctx, cx, cy + 1, 4.8, 3.6, PINK[2]);
      for (const ex of [-1.8, 2.2]) fEll(ctx, cx + ex, cy, 0.5, 0.9, INK);
      return;
    }
    // flying: a round pink bird with a cheeky tuft, flapping
    const flap = (this.t >> 3) % 2;
    fEll(ctx, cx - f * 7.5, cy + 2.4, 2.6, 1.8, INK); fEll(ctx, cx - f * 7.5, cy + 2.2, 1.8, 1, PINK[1]);   // tail feathers
    for (const lx of [-2.2, 2.6]) { fRect(ctx, cx + lx - 0.6, cy + 5.6, 1.4, 3, INK); fRect(ctx, cx + lx - 1, cy + 7.8, 2.2, 0.9, '#efaa44'); }   // amber feet
    fBlob(ctx, cx, cy, 7.3, INK); fBlob(ctx, cx, cy, 6.5, PINK[1]); fBlob(ctx, cx - 0.8, cy - 1, 5.4, PINK[2]); fBlob(ctx, cx + f * 1.2, cy + 2.4, 3.8, '#ffe4e8');
    fEll(ctx, cx - 2.4, cy - 3.6, 2, 0.8, PINK[3]);
    fLine(ctx, cx - 0.4, cy - 6, cx, cy - 9.4, INK, 3); fLine(ctx, cx + 0.4, cy - 7, cx + 2.4, cy - 9.6, INK, 3);   // tuft
    fEll(ctx, cx + f * 2.6, cy - 2.2, 1.1, 1.4, INK); fRect(ctx, cx + f * 2.6 - 0.3, cy - 3, 1 / 3, 1 / 3, '#ffffff');
    fPoly(ctx, [[cx + f * 5.8, cy - 1.4], [cx + f * 9.6, cy], [cx + f * 5.8, cy + 1.6]], INK); fPoly(ctx, [[cx + f * 6.2, cy - 0.7], [cx + f * 8.6, cy], [cx + f * 6.2, cy + 0.8]], '#ffb347');   // beak
    fEll(ctx, cx - f * 3.6, cy - flap * 3, 3.6, 2, INK); fEll(ctx, cx - f * 3.6, cy - flap * 3 - 0.2, 2.8, 1.2, '#ffd0dc');   // wing
  }
}

// ---------- Sulkcloud & Sproutpot ---------------------------------------------------------------
// A little raincloud in a mood. It trails after Chickaroo (within columns x0-x1), muttering. Stomp
// it and it bursts into tears -- a downpour right below it -- then feels much better for a bit.
const SULK_CRY = 210;
class Sulkcloud extends Enemy {
  constructor(col, row, x0, x1) {
    super(col * TILE, row * TILE, 30, 14);
    this.y0 = this.y; this.lo = (x0 == null ? col - 20 : x0) * TILE; this.hi = (x1 == null ? col + 20 : x1) * TILE;
    this.mood = 'sulk'; this.timer = 0; this.squash = 0;
    this.passive = true; this.noFreeze = true; this.friendly = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  update(g) {
    this.t++;
    if (this.squash > 0) this.squash--;
    const p = g.player;
    if (this.mood === 'bye') {
      this.y -= 0.8; this.x += 0.15;
      if (this.y + this.h < -16) this.remove = true;
      return;
    }
    // Leave once the garden is finished, independent of the player's position.
    // Include offscreen pots that have not spawned yet: the first pot alone is not the garden.
    const pots = g.level.def.entities.filter(d => d[0] === 'pot' && d[1] * TILE + 8 >= this.lo && d[1] * TILE + 8 <= this.hi);
    const gardenDone = pots.length > 0 && pots.every(d =>
      g.level.stalks.some(s => s.c === d[1] && s.r === (d[3] == null ? 11 : d[3]) + 1 && s.h <= s.top));
    if (gardenDone) {
      if (this.departT == null) this.departT = 180;
      else if (--this.departT <= 0) {
        this.mood = 'bye'; this.timer = 90;
        return;
      }
    } else this.departT = null;
    if (this.mood !== 'cry') {
      const want = clamp(p.x + p.w / 2 - this.w / 2, this.lo, this.hi - this.w);
      this.x += clamp(want - this.x, -0.75, 0.75);
    }
    this.y = this.y0 + Math.round(Math.sin(this.t * 0.05) * 2);
    if (this.mood === 'cry') {
      // the downpour: drops fall from its belly; anything thirsty under it gets watered
      for (let i = 0; i < 2; i++) g.particles.push({ kind: 'px', x: this.x + rand(2, this.w - 2), y: this.y + 12, vx: 0, vy: rand(3, 4), life: 46, t: 0, color: i ? '#8fd0ff' : '#cfeaff', size: 1, streak: 3 });
      for (const e of g.entities) if (e instanceof Sproutpot && e.cx > this.x - 4 && e.cx < this.x + this.w + 4) e.water(g);
      if (this.t % 20 === 0 && this.x > g.camX - 40 && this.x < g.camX + VIEW_W + 40) Sound.play('rain');
      if (--this.timer <= 0) { this.mood = 'better'; this.timer = 200; }
    } else if (this.mood === 'better' && --this.timer <= 0) this.mood = 'sulk';
  }
  onTouch(g, p) {
    if (this.mood === 'bye') return;
    if (!(p.vy > 0 && p.prevY + p.h <= this.y + 8)) return;   // walking into it: a damp shrug
    p.y = this.y - p.h; p.vy = -7; p.jumping = false; p.onGround = false; p.springAir = true; p.spin = false; p.pounding = false;
    this.squash = 12;
    if (this.mood === 'cry') { Sound.play('spring'); return; }
    this.mood = 'cry'; this.timer = SULK_CRY;
    Sound.play('honk'); Sound.play('spring');
  }
  draw(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y), sq = this.squash > 0 ? 2 : 0, cx = x + 15;
    const happy = this.mood === 'better' || this.mood === 'bye';
    if (this.mood === 'bye') ctx.globalAlpha = clamp((this.y + this.h + 16) / 64, 0, 1);
    const body = happy ? '#ffffff' : this.mood === 'cry' ? '#7d8bb8' : '#a6b0d0', hi = happy ? '#ffffff' : '#c8d0e8';
    const puffs = [[-9, 8, 7], [0, 5 + sq, 9], [9, 8, 7], [-4, 10, 7], [5, 10, 7]];
    for (const [dx, dy, r] of puffs) blob(ctx, cx + dx * (1 + sq * 0.08), y + dy, r + 1, INK);
    for (const [dx, dy, r] of puffs) blob(ctx, cx + dx * (1 + sq * 0.08), y + dy, r, body);
    blob(ctx, cx - 3, y + 2 + sq, 3, hi); blob(ctx, cx - 9, y + 6, 2, hi);
    const fy = y + 8 + sq;   // (in fine pixels: hires.js)
    if (happy) {   // content: closed happy eyes and a smile
      for (const ex of [-4.4, 4.4]) fArc(ctx, cx + ex, fy, 0.9, 1.7, Math.PI * 1.1, Math.PI * 1.9, INK);
      fArc(ctx, cx + 0.5, fy + 1.2, 1.4, 2.2, Math.PI * 0.15, Math.PI * 0.85, INK);
      fEll(ctx, cx - 8, fy + 1.5, 1.4, 0.7, '#ffb0c8'); fEll(ctx, cx + 9, fy + 1.5, 1.4, 0.7, '#ffb0c8');
    } else if (this.mood === 'cry') {   // wailing: eyes screwed shut, a big open mouth, tears streaming
      for (const ex of [-4, 5]) fRect(ctx, cx + ex - 2, fy - 2, 4, 2 / 3, INK);
      fEll(ctx, cx + 0.5, fy + 2.4, 2.8, 2.4, INK); fEll(ctx, cx + 0.5, fy + 3.2, 1.8, 1.3, '#d04060');
      const k = this.t % 8;
      fEll(ctx, cx - 5.5, fy + k, 0.6, 1.1, '#8fd0ff'); fEll(ctx, cx + 6.5, fy + ((k + 4) % 8), 0.6, 1.1, '#8fd0ff');
    } else {   // sulking: heavy lids, eyes sliding toward Chickaroo, a pout
      const look = (this.t >> 6) % 3 - 1;
      for (const ex of [-4, 5]) { fEll(ctx, cx + ex + look * 0.8, fy, 1, 1.1, INK); fRect(ctx, cx + ex - 2, fy - 2, 4, 1, '#7d86a8'); fRect(ctx, cx + ex - 2, fy - 1.2, 4, 1 / 3, INK); }
      fArc(ctx, cx + 0.5, fy + 5.6, 1.4, 2.1, Math.PI * 1.15, Math.PI * 1.85, INK);
    }
    if (this.mood === 'sulk' && this.t % 120 < 60) for (let i = 0; i < 3; i++) fEll(ctx, cx - 6 + i * 6 + 0.5, y + 19 + ((this.t + i * 7) % 10), 0.5, 1.1, '#8fd0ff');   // a little personal drizzle
    ctx.globalAlpha = 1;
  }
}
// A clay pot with a wilting seedling, standing in `row` (normally 11, on the ground). Water it (a
// crying Sulkcloud overhead) and a beanstalk shoots up out of it to `top`.
class Sproutpot extends Enemy {
  constructor(col, top, row, thirstyLine = 'SO... THIRSTY...') {
    row = row == null ? 11 : row;
    super(col * TILE + 2, (row + 1) * TILE - 12, 12, 12);
    this.col = col; this.row = row; this.top = top == null ? 2 : top; this.wet = 0; this.grown = false;
    this.thirstyLine = thirstyLine;
    this.passive = true; this.noFreeze = true; this.friendly = true; this.behindTiles = false;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  touches() { return false; }
  update(g) {
    this.t++;
    const p = g.player;
    if (!this.grown && this.t % 200 === 60 && Math.abs(p.x - this.x) < 120) g.speak(this, this.thirstyLine, '#ffcf9a');
  }
  water(g) {
    if (this.grown) return;
    if (++this.wet % 6 === 0) g.burst(this.cx, this.y, ['#8fd0ff', '#ffffff'], 2);
    if (this.wet < 50) return;
    this.grown = true;
    g.speak(this, 'Ahhh ^_^', '#7be08a');
    g.level.stalks.push({ c: this.col, r: this.row + 1, top: this.top, h: this.row + 1, t: 0, side: 1 });
    g.addScore(500);
    Sound.play('sprout');
  }
  draw(ctx) {
    const x = Math.round(this.x), by = Math.round(this.y + this.h);
    // the seedling: wilting while thirsty, perking up as it drinks (painted fine: sky-fine.js)
    if (!this.grown) ctx.drawImage(seedlingArt(Math.round(Math.min(1, this.wet / 50) * SEEDLING_STEPS) / SEEDLING_STEPS), x + 6 - 8, by - 10.4 - 11.6);
    ctx.drawImage(sproutPotArt(this.wet > 0 && !this.grown), x - 3, by - 14);
  }
}

// ---------- Clapper ---------------------------------------------------------------------------
// Two huge cloud gloves over a chasm, applauding. They sit open (rideable, flush with the ledges),
// pull back, then CLAP together in the middle and hold there before easing apart. The tops of the
// gloves are platforms. Anyone standing on (or just above) the hands when they clap gets a BRAVO
// launch high into the sky; anyone caught between them gets squished.
const CLAP_OPEN = 110, CLAP_WIND = 26, CLAP_SHUT = 10, CLAP_HOLD = 90, CLAP_BACK = 56;
const CLAP_CYCLE = CLAP_OPEN + CLAP_WIND + CLAP_SHUT + CLAP_HOLD + CLAP_BACK;
const GLOVE_W = 48, GLOVE_H = 20, GLOVE_CLOUD_W = 28, GLOVE_SEAM = 4;
class Clapper extends Enemy {
  // `col`: the column whose left edge the hands meet at; `row`: the row of the gloves' tops;
  // `gap`: tiles from the middle to each open hand
  constructor(col, row, gap, phase) {
    super(col * TILE - GLOVE_W, row * TILE, GLOVE_W * 2, GLOVE_H);
    this.mid = col * TILE; this.gap = (gap || 4) * TILE; this.t = Math.floor((phase || 0) * CLAP_CYCLE);
    this.passive = true; this.noFreeze = true; this.friendly = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    const glove = side => ({
      clapper: this, side, x: 0, y: this.y,
      w: GLOVE_W + GLOVE_CLOUD_W + GLOVE_SEAM, h: GLOVE_H,
      dx: 0, dy: 0, prevY: this.y, stepUp: true,
      update(g) { if (side === 'L') this.clapper.step(g); },
      draw() {}
    });
    this.L = glove('L'); this.R = glove('R'); this.added = false; this.k = 1; this.lastStepT = -1;
    this.place();
    this.L.dx = this.R.dx = 0;
  }
  hitbox() { return null; }
  touches() { return false; }
  open() {   // 1 = wide open, 0 = clapped shut
    const k = this.t % CLAP_CYCLE;
    if (k < CLAP_OPEN) return 1;
    if (k < CLAP_OPEN + CLAP_WIND) { const u = (k - CLAP_OPEN) / CLAP_WIND; return 1 + 0.18 * Math.sin(u * Math.PI / 2); }
    if (k < CLAP_OPEN + CLAP_WIND + CLAP_SHUT) { const u = (k - CLAP_OPEN - CLAP_WIND) / CLAP_SHUT; return 1.18 * (1 - u * u); }
    if (k < CLAP_CYCLE - CLAP_BACK) return 0;
    const u = (k - (CLAP_CYCLE - CLAP_BACK)) / CLAP_BACK; return 0.5 - 0.5 * Math.cos(u * Math.PI);
  }
  place() {
    this.k = this.open();
    const lx = this.mid - GLOVE_W - this.gap * this.k - GLOVE_CLOUD_W;
    const rx = this.mid + this.gap * this.k - GLOVE_SEAM;
    this.L.dx = lx - this.L.x; this.R.dx = rx - this.R.x;
    this.L.x = lx; this.R.x = rx;
  }
  step(g) {
    this.t++;
    this.lastStepT = this.t;
    this.place();
    const k = this.t % CLAP_CYCLE;
    const near = this.mid > g.camX - 80 && this.mid < g.camX + VIEW_W + 80;
    if (k === CLAP_OPEN && near) Sound.play('gustWarn');
    const p = g.player;
    if (p && p.state === 'play' && p.onGround && Math.abs(p.y + p.h - this.y) <= 2) {
      if (p.x + p.w > this.L.x + 1 && p.x < this.L.x + this.L.w - 1) p.platform = this.L;
      else if (p.x + p.w > this.R.x + 1 && p.x < this.R.x + this.R.w - 1) p.platform = this.R;
    }
  }
  update(g) {
    if (!this.added) {
      this.added = true;
      if (!g.platforms.includes(this.L)) g.platforms.push(this.L, this.R);
      this.L.dx = this.R.dx = 0;
    }
    if (this.lastStepT !== this.t) this.step(g);
    const k = this.t % CLAP_CYCLE, p = g.player, top = this.y;
    const near = this.mid > g.camX - 80 && this.mid < g.camX + VIEW_W + 80;
    if (p.state !== 'play') return;
    const feet = p.y + p.h;
    const onTop = p.platform === this.L || p.platform === this.R ||
      (p.onGround && Math.abs(feet - top) <= 3) || feet <= top + 3;
    // squished: caught in the closing gap (their tops are safe to stand on)
    if (!onTop && k >= CLAP_OPEN + CLAP_WIND && k < CLAP_CYCLE - CLAP_BACK) {
      for (const h of [this.L, this.R]) if (overlap(p, { x: h.x + (h === this.L ? GLOVE_CLOUD_W : 0) + 2, y: h.y + 6, w: GLOVE_W - 4, h: h.h - 6 })) { g.hurtPlayer(); if (p.state === 'play') { p.vy = -4; p.y = top - p.h - 1; } break; }
    }
    if (k === CLAP_OPEN + CLAP_WIND + CLAP_SHUT) {   // CLAP!
      if (near) { Sound.play('pound'); g.shake = Math.max(g.shake, 2.5); }
      for (let i = 0; i < 14; i++) { const a = rand(-Math.PI, 0); g.particles.push({ kind: 'spark', x: this.mid, y: top + 4, vx: Math.cos(a) * rand(1, 3), vy: Math.sin(a) * rand(1, 3), g: 0.05, drag: 0.94, life: 30, t: 0, color: i % 2 ? '#ffffff' : '#ffd166' }); }
      const onHands = p.platform === this.L || p.platform === this.R || (p.x + p.w > this.L.x && p.x < this.R.x + this.R.w);
      if (onHands && feet > top - 44 && feet <= top + 4) {
        p.vy = -11.6; p.jumping = false; p.onGround = false; p.platform = null; p.springAir = true; p.airMax = WALK_MAX;   // gentle drift: he comes down on the hands
        p.spin = false; p.pounding = false;
        p.sx = 0.7; p.sy = 1.35;
        g.addScore(500);
        Sound.play('spring'); Sound.play('tada');
      }
    }
  }
  draw(ctx) {
    drawGlove(ctx, this.L.x + GLOVE_CLOUD_W, this.L.y, 1, this.t);
    drawGlove(ctx, this.R.x + GLOVE_SEAM, this.R.y, -1, this.t);
  }
}
// A big red boxing glove lying flat, punching `dir`-ward, its arm vanishing into a puff of cloud.
function drawGlove(ctx, x, y, dir, t) {
  x = Math.round(x); y = Math.round(y);
  const W = GLOVE_W, H = GLOVE_H, outer = dir > 0 ? x : x + W;
  const X = (rx, rw) => dir > 0 ? x + rx : x + W - rx - rw;   // mirror a span for the left-punching glove
  const PX = rx => dir > 0 ? x + rx : x + W - rx;              // mirror a point
  // A short cloud wrist overlaps both the puff and cuff, even at the extremes of the bob.
  fRect(ctx, X(0, 17), y, 17, 18, INK);   // (in fine pixels: hires.js)
  fRect(ctx, X(0, 17), y + 2 / 3, 17, 16.6, '#c9d6f0'); fRect(ctx, X(0, 17), y + 2 / 3, 17, 10, '#eef3ff'); fRect(ctx, X(0, 17), y + 2 / 3, 17, 1.4, '#ffffff');
  // the cloud: a lumpy cluster, lit white on top, shaded blue-grey underneath, with a few curls
  const bob = k => Math.round(Math.sin(t * 0.05 + k) * 1);
  const puffs = [[-14, 13, 8, 0], [-6, 16, 8, 1], [-20, 6, 7, 2], [-9, 4, 8, 3], [-2, 9, 9, 4], [-16, 17, 6, 5]];
  const P = ([dx, dy, r, k]) => [outer + dx * dir, y + dy + bob(k), r];
  for (const q of puffs) { const [px, py, r] = P(q); blob(ctx, px, py, r + 1, INK); }
  for (const q of puffs) { const [px, py, r] = P(q); blob(ctx, px, py, r, '#c9d6f0'); }
  for (const q of puffs) { const [px, py, r] = P(q); blob(ctx, px - dir, py - 2, r - 2, '#eef3ff'); }
  for (const q of puffs) { const [px, py, r] = P(q); if (r > 7) blob(ctx, px - dir * 2, py - 4, r - 5, '#ffffff'); }
  for (const q of puffs.slice(0, 4)) { const [px, py, r] = P(q); fArc(ctx, px, py + r - 4, 1.2, 1.9, Math.PI * 0.2, Math.PI * 0.8, '#a9b8dc'); }   // curls between the lumps
  // the boxing glove itself: painted fine (sky-fine.js), once per facing
  ctx.drawImage(fineGloveArt(dir), dir > 0 ? x + 12 : x, y - 1);
}

// ---------- Sky whale ------------------------------------------------------------------------
// A huge, gentle whale floating at the edge of the void, its broad back a platform. Step aboard and
// it swims off to column `until`, carrying you over the abyss. Step onto the blowhole and a
// second later it spouts and you're shot up into the sky; while the jet holds at full height its top is a solid perch.
const WHALE_ARM = 30, WHALE_SPOUT_LEN = 110,   // ~1.83 s total: quick rise, sustained jet, then a 10-frame fade
      WHALE_SPEED = 1.05;
class SkyWhale {
  constructor(col, row, until) {
    this.x = col * TILE - 8; this.y0 = row * TILE; this.y = this.y0; this.body = 8 * TILE; this.h = 10;
    this.w = this.body + 20;   // the standable back runs right up to where the head starts to curve down (the art's flat top)
    this.until = until * TILE - 8; this.dx = 0; this.dy = 0; this.prevY = this.y;
    this.t = 0; this.speed = 0; this.going = false; this.spoutT = -1; this.launched = false;
    // the top of the water jet: a solid little platform while the jet stands at full height
    this.jet = { x: -1e5, y: 0, w: 40, h: 6, dx: 0, dy: 0, prevY: 0, update() {}, draw() {} };
  }
  // how tall the water jet stands right now (0 when it's off): shoots up, holds, then dies down
  spoutHeight() {
    const k = this.spoutT;
    if (k < 0) return 0;
    if (k > WHALE_SPOUT_LEN - 10) return 80 * (WHALE_SPOUT_LEN - k) / 10;
    // running out: for its last second the jet sags (it stays standable, above 60) with a sputter
    const w = this.sputter();
    return Math.min(80, k * 9) - (w > 0 ? w * 14 + (k % 12 < 3 ? 2 : 0) : 0);
  }
  // 0 while the jet is going strong, rising to 1 as it's about to cut out
  sputter() { const k = this.spoutT, from = WHALE_SPOUT_LEN - 70; return k < from ? 0 : Math.min(1, (k - from) / 60); }
  get blowX() { return this.x + 8 + this.body - 64; }   // far enough back that stepping off the jet's top still lands you on the whale
  update(g) {
    const p = g.player, ox = this.x, oy = this.y;
    this.t++;
    if (!g.platforms.includes(this.jet)) g.platforms.push(this.jet);
    if (!this.going && p.platform === this && p.state === 'play') {
      this.going = true; this.ride = 0;
      g.say('RIDE THE WHALE!', 'STAND ON THE BLOWHOLE!', '#bfe9ff');
      Sound.play('snore');
    }
    const target = this.going && this.x < this.until ? WHALE_SPEED : 0;
    this.speed += (target - this.speed) * 0.02;
    this.x = Math.min(this.until, this.x + this.speed);
    this.y = this.y0 + 2 - Math.cos(this.t * 0.035) * 2;   // a gentle swell (never above where it started)
    this.dx = this.x - ox; this.dy = this.y - oy; this.prevY = oy;
    // Hearts rise above the right-hand eye, carrying the whale's motion instead of trailing over its rump.
    if (this.loveT > 0) {
      if (this.loveT % 15 === 0) g.particles.push({ kind: 'heart', x: this.x + 8 + this.body / 2 + 66 + rand(-3, 3),
        y: this.y + 11, vx: this.dx + rand(-0.08, 0.08), vy: -0.65, drag: 1,
        life: 90, t: 0, phase: rand(0, Math.PI * 2), color: this.loveT % 30 ? '#ff8fab' : '#ff527e' });
      this.loveT--;
    }
    // a rider keeps the whale's way on even in the air (like jumping on a moving train), so hops
    // and jet rides come down on the whale instead of letting it swim out from under him
    if (p.platform === this || p.platform === this.jet) this.rider = true;
    else if (p.onGround || p.state !== 'play') this.rider = false;
    if (this.rider && !p.platform && this.dx) sweepX(g.level, p, this.dx);
    if (this.going) {
      this.ride++;
    }
    // stepping onto the blowhole primes it: half a second of rumbling, then the jet
    if (this.spoutT < 0 && this.arm == null && p.platform === this && Math.abs(p.x + p.w / 2 - this.blowX) < 13) { this.arm = WHALE_ARM; Sound.play('rumble'); }
    if (this.arm != null && --this.arm <= 0) { this.arm = null; this.spoutT = 0; this.launched = false; Sound.play('spout'); }
    if (this.spoutT >= 0) {
      if (++this.spoutT > WHALE_SPOUT_LEN) this.spoutT = -1;
      if (this.sputter() > 0 && this.spoutT % 12 === 0 && this.spoutT <= WHALE_SPOUT_LEN - 10) Sound.play('blink');
      if (this.spoutT % 2 === 0) for (let i = 0; i < 3; i++) g.particles.push({ kind: 'px', x: this.blowX + rand(-9, 9), y: this.y - rand(0, 70), vx: rand(-1.8, 1.8), vy: rand(-1.5, 0.5), g: 0.08, life: 26, t: 0, color: i ? '#cfeaff' : '#ffffff', size: 2 });
    }
    const jet = this.jet, jy = jet.x < -1e4 ? oy : jet.y, h = this.spoutHeight();
    jet.prevY = jy;
    if (h >= 60 || (this.spoutT > 0 && this.spoutT <= 9)) { jet.y = this.y - h; jet.x = this.blowX - jet.w / 2; jet.dx = this.dx; jet.dy = jet.y - jy; }
    else { if (p.platform === jet) p.platform = null; jet.x = -1e5; jet.dx = jet.dy = 0; jet.y = jet.prevY = 0; }
    // Attach the blowhole rider to the rising surface. Physics applies the platform's
    // movement once below, so start at its previous position rather than double-carrying.
    if (!this.launched && this.spoutT > 0 && this.spoutT <= 10 && p.state === 'play' &&
        Math.abs(p.x + p.w / 2 - this.blowX) < 18 && p.y + p.h >= jet.y && p.y + p.h <= this.y + 3) {
      this.launched = true;
      p.x = this.blowX - p.w / 2 - jet.dx;
      p.y = jet.prevY - p.h;
      p.vx = p.vy = 0; p.platform = jet; p.onGround = true;
      p.jumping = p.springAir = p.spin = false;
    }
    // fell into the stream itself (not just off the edge of the top): the water carries you swiftly (but softly) back up onto it
    if (h >= 60 && p.state === 'play' && p.platform !== jet && this.spoutT > 10) {
      const pc = p.x + p.w / 2, feet = p.y + p.h;
      if (Math.abs(pc - this.blowX) < 9 && feet > jet.y && feet < this.y + 2) {
        p.x += clamp((this.blowX - pc) * 0.2, -2.2, 2.2);
        p.vx = 0;
        if (feet - 4 <= jet.y) { p.y = jet.y - p.h - 0.5; p.vy = 0.5; p.x = clamp(p.x, jet.x - p.w + 8, jet.x + jet.w - 8); p.vx = 0; }   // set down on the top, no bounce
        else p.vy = -4 + GRAV;                                             // rising: physics adds gravity back
        p.jumping = false; p.springAir = false; p.onGround = false; p.platform = null;
      }
    }
    if (this.speed > 0.3 && this.t % 6 === 0) g.particles.push({ kind: 'px', x: this.x - 34, y: this.y + rand(4, 30), vx: -0.6, vy: rand(-0.2, 0.2), drag: 0.97, life: 50, t: 0, color: '#ffffff', size: 3 });
  }
  draw(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y), t = this.t;
    const cx = x + 8 + this.body / 2 + 4, cy = y + 19, rx = 86, ry = 23;
    const BLUE = ['#1a3a6e', '#295496', '#3e74c2', '#649ae8', '#9ec3f8', '#d6e8ff'];
    const wag = Math.sin(t * 0.06) * 3, sx = cx - rx + 8;

    // 1. Dorsal fin: cute little curved fin along the back rump
    const finX = cx - 36, finY = y - 1;
    fPoly(ctx, [[finX - 7, finY + 4], [finX - 1, finY - 4], [finX + 5, finY - 2], [finX + 3, finY + 4]], INK);
    fPoly(ctx, [[finX - 6, finY + 3.5], [finX - 1, finY - 3], [finX + 4, finY - 1.5], [finX + 2, finY + 3.5]], BLUE[2]);
    fLine(ctx, finX - 1, finY - 2.5, finX + 3.5, finY - 1.2, BLUE[4], 1);

    // 2. Tail peduncle & majestic flukes waving lazily in fine pixels
    const stock = i => [sx - i * 0.92, cy - 4 - i * 1.08 + wag * i / 18, Math.max(3, 9.2 - i * 0.36)];
    const [fx, fy] = stock(18);
    // Fluke lobes with curved trailing edge and central caudal notch
    const fluke = s2 => [
      [fx, fy + 0.8],
      [fx + s2 * 4.5, fy - 3.2 + (s2 > 0 ? 1.6 : -0.5)],
      [fx + s2 * 11.5, fy - 5.8 + (s2 > 0 ? 2.5 : 0)],
      [fx + s2 * 13, fy - 3.8 + (s2 > 0 ? 2.2 : 0)],
      [fx + s2 * 10.5, fy - 0.4 + (s2 > 0 ? 1.8 : 0)],
      [fx + s2 * 4, fy + 3.2]
    ];
    for (const s2 of [-1, 1]) fPoly(ctx, fluke(s2).map(([px, py]) => [px + (px - fx) * 0.08, py + (py - fy) * 0.14 + 0.2]).map(([px, py], i) => [px + s2 * (i ? 0.7 : 0), py - 0.7]), INK);
    for (let i = 0; i <= 18; i += 0.5) { const [px, py, r] = stock(i); fBlob(ctx, px, py, r + 0.8, INK); }
    for (const s2 of [-1, 1]) fPoly(ctx, fluke(s2), s2 < 0 ? BLUE[3] : BLUE[2]);
    for (const s2 of [-1, 1]) {
      const flk = fluke(s2);
      fLine(ctx, flk[1][0], flk[1][1], flk[2][0], flk[2][1], BLUE[4], 1.2);
    }
    for (let i = 0; i <= 18; i += 0.5) { const [px, py, r] = stock(i); fBlob(ctx, px, py, r, BLUE[2]); }
    for (let i = 0; i <= 18; i += 1) { const [px, py, r] = stock(i); fBlob(ctx, px - r * 0.22, py - r * 0.32, r * 0.48, BLUE[3]); }

    // 3. Volumetric body: superellipse rows with celestial dorsal illumination & pearlescent underbelly
    const half = (dy, a, b) => a * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, Math.abs(dy) / b), 4)), 0.25), S = 1 / ART_R;
    const rowsInk = [], rowsDorsalHighlight = [], rowsBack = [], rowsMid = [], rowsSeam = [], rowsBelly = [], rowsPleat = [];
    for (let yy = y - 1; yy <= cy + ry + 1; yy += S) { const hh = half(yy - cy, rx + 0.8, ry + 0.8); if (hh >= 0.5) rowsInk.push([cx - hh, yy, hh * 2, S]); }
    for (let yy = y; yy <= cy + ry; yy += S) {
      const dy = yy - cy, hh = half(dy, rx, ry);
      if (hh < 0.5) continue;
      if (yy < y + 2.4) rowsDorsalHighlight.push([cx - hh, yy, hh * 2, S]);
      else if (dy < -4) rowsBack.push([cx - hh, yy, hh * 2, S]);
      else if (dy < 3) rowsMid.push([cx - hh, yy, hh * 2, S]);
      else rowsBelly.push([cx - hh, yy, hh * 2, S]);
      if (dy >= 2.6 && dy < 4.2) rowsSeam.push([cx - hh, yy, hh * 2, S]);   // smooth transition seam
      if (dy >= 6 && (dy % 2.8) < 0.65) rowsPleat.push([cx - hh * 0.15, yy, hh * 1.1, S]);   // throat pleat grooves
    }
    fRects(ctx, INK, rowsInk);
    fRects(ctx, BLUE[5], rowsDorsalHighlight);
    fRects(ctx, BLUE[3], rowsBack);
    fRects(ctx, BLUE[2], rowsMid);
    fRects(ctx, '#eaf2fd', rowsBelly);
    fRects(ctx, BLUE[1], rowsSeam);
    fRects(ctx, '#a6bde5', rowsPleat);

    // 4. Soft spine illumination & celestial starlight freckles
    fEll(ctx, cx - 26, y + 4.5, 42, 2.2, BLUE[4]);
    fEll(ctx, cx - 28, y + 3.2, 28, 1.2, '#ffffff');
    const freckles = [[-54, 7], [-40, 11], [-26, 6], [-10, 8], [8, 10], [24, 6], [-66, 12], [38, 8]];
    for (const [ox, oy] of freckles) {
      fEll(ctx, cx + ox + 1.5, y + oy + 1, 1.7, 1.1, BLUE[4]);
      fBlob(ctx, cx + ox + 1.5, y + oy + 0.9, 0.45, '#ffffff');
    }

    // 5. Rostrum nodules / bumps along the upper snout
    for (const bx of [cx + rx - 8, cx + rx - 15, cx + rx - 22]) {
      fEll(ctx, bx, y + 3.2, 1.8, 1.1, BLUE[4]);
      fBlob(ctx, bx + 0.2, y + 2.8, 0.5, '#ffffff');
    }

    // 6. The head: gentle expressive eye, cheerful smile, blushing cheek
    // CRITICAL: ex must be exactly cx + rx - 24 (= x + 138) to preserve test compliance & ring alignment
    const ex = cx + rx - 24, ey = cy + 1, blink = t % 220 < 8;
    // Gentle brow fold
    fArc(ctx, ex - 1, ey - 5.2, 3.2, 4.2, Math.PI * 1.15, Math.PI * 1.85, BLUE[1]);
    if (blink) {
      fArc(ctx, ex, ey - 0.5, 2.2, 3.4, Math.PI * 0.15, Math.PI * 0.85, INK);
    } else {
      fBlob(ctx, ex, ey, 3.6, INK);
      fBlob(ctx, ex + 0.3, ey + 0.3, 2.6, '#182b4a');
      fBlob(ctx, ex - 0.9, ey - 1.1, 1.25, '#ffffff');   // primary bright glint
      fBlob(ctx, ex + 1.1, ey + 1.1, 0.55, '#ffffff');   // secondary soft twinkle
    }
    // Warm blushing cheek glow
    fGlow(ctx, ex + 1, ey + 5.5, 5, '#ff96b2', 0.22);
    fEll(ctx, ex + 1, ey + 5.5, 3.2, 1.5, '#ff8fa8');
    fEll(ctx, ex + 1.3, ey + 5.2, 1.8, 0.7, '#ffb8cb');
    // Cheerful warm smile
    const smile = [];
    for (let i = 0; i <= 26; i += 0.34) {
      const sy2 = ey + 6 + Math.sin(i / 26 * Math.PI) * 2.2 - (i < 4 ? (4 - i) * 0.25 : 0);
      smile.push([cx + rx - 4 - i, sy2, 2 / 3, 2 / 3]);
    }
    fRects(ctx, INK, smile);
    // Dimple at the corner of the smile
    fBlob(ctx, cx + rx - 4, ey + 5.2, 0.7, INK);

    // 7. Pectoral flipper paddling with smooth harmonic motion
    const fl = Math.sin(t * 0.08) * 3.5;
    const fp = [
      [cx + 32, cy + 7.5],
      [cx + 23, cy + 7],
      [cx + 11, cy + 18 + fl],
      [cx + 15, cy + 22.5 + fl],
      [cx + 24, cy + 16.5 + fl * 0.4]
    ];
    fPoly(ctx, fp.map(([px, py]) => [px + (px > cx + 20 ? 0.9 : -0.9), py + (py > cy + 12 ? 0.9 : -0.9)]), INK);
    fPoly(ctx, fp, BLUE[2]);
    fPoly(ctx, fp.slice(0, 3).concat([[cx + 22, cy + 9.5]]), BLUE[3]);
    fLine(ctx, cx + 24, cy + 8, cx + 13, cy + 18.5 + fl, BLUE[4], 1.2);

    // 8. The blowhole and sparkling water spout
    fEll(ctx, this.blowX + 0.5, y + 1, 3.8, 1.3, INK);
    fEll(ctx, this.blowX + 0.5, y + 0.8, 2.6, 0.8, '#13284a');
    if (this.spoutT >= 0) {
      const hgt = this.spoutHeight(), sp = this.sputter();
      const col1 = [], col2 = [];
      for (let i = 0; i < hgt; i += 2) {
        const wob = Math.sin((i + t * 3) * 0.2) * (2 + sp * 3), wd = (14 + i / 6) * (1 - sp * 0.45);
        if (sp > 0 && ((i >> 1) + (t >> 2)) % 5 === 0) continue;
        (i % 4 ? col1 : col2).push([this.blowX - wd / 2 + wob, y - i, wd, 2]);
        col2.push([this.blowX - wd * 0.25 + wob, y - i, wd * 0.3, 2]);
      }
      fRects(ctx, '#cfeaff', col1); fRects(ctx, '#ffffff', col2);
      if (!(sp > 0.4 && t % 8 < 3)) {
        for (const s2 of [-2, -1, 0, 1, 2]) {
          fBlob(ctx, this.blowX + s2 * 8, y - hgt + Math.abs(s2), 6.4, sp > 0 && t % 8 < 4 ? '#a8d4f4' : s2 % 2 ? '#cfeaff' : '#ffffff');
          fBlob(ctx, this.blowX + s2 * 8, y - hgt + Math.abs(s2) - 1.5, 3.5, '#ffffff');
        }
      }
    } else if (this.arm != null && t % 6 < 3) {
      fBlob(ctx, this.blowX + 0.5, y - 2, 1.6, '#ffffff');
      fGlow(ctx, this.blowX + 0.5, y - 2, 6, '#cfeaff', 0.25);
    }
  }
}

// ---------- Sky hoops --------------------------------------------------------------------------
// Golden rings hanging in the sky over the whale road, up where the blowhole jet reaches. Fly through
// one (ride the jet up as it passes, or jump off the jet's top) and it rings out a rising note;
// thread every hoop of the stage for a 1-UP.
const HOOP_NOTES = [523, 587, 659, 784, 880, 1047, 1175];
class SkyHoop extends Enemy {
  constructor(col, row) {
    super(col * TILE + 4, row * TILE - 6, 8, 28);
    this.got = false; this.flash = 0;
    this.passive = true; this.noFreeze = true; this.friendly = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return this.got ? null : { x: this.x, y: this.y + 6, w: this.w, h: this.h - 12 }; }   // the hole, not the rim
  update(g) { this.t++; if (this.flash > 0) this.flash--; }
  onTouch(g) {
    if (this.got) return;
    this.got = true; this.flash = 30;
    const H = g.level.hoops || (g.level.hoops = { got: 0, total: g.level.def.entities.filter(e => e[0] === 'hoop').length });
    H.got++;
    Sound.note(HOOP_NOTES[Math.min(H.got - 1, HOOP_NOTES.length - 1)]); Sound.play('coin');
    g.addScore(200 * H.got, this.cx, this.y - 6);
    g.burst(this.cx, this.y + this.h / 2, ['#ffd166', '#fff3b0', '#ffffff'], 14);
    if (H.got === H.total) {
      g.oneUp(this.cx, this.y - 18);
      const whale = g.platforms.find(pl => pl instanceof SkyWhale);
      if (whale) whale.loveT = 180;
    }
  }
  draw(ctx) {
    const cx = Math.round(this.cx), cy = Math.round(this.y + this.h / 2), a = this.got ? Math.max(0, this.flash / 30) : 1;
    if (a <= 0) return;
    const grow = this.got ? 1 + (30 - this.flash) / 12 : 1;
    const t = this.t;
    ctx.save();
    ctx.globalAlpha = a;

    // Ambient golden aura glow around the hoop
    if (!this.got) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.09);
      fGlow(ctx, cx, cy, 16 + pulse * 4, '#ffd166', 0.2 + pulse * 0.1);
      fGlow(ctx, cx, cy, 9, '#fff6ba', 0.12);
    } else {
      fGlow(ctx, cx, cy, 22 * grow, '#fff0a0', (this.flash / 30) * 0.4);
    }

    // 3D upright ring seen at an angle: tall elliptical torus with cylindrical lighting & depth
    const rx = 5.2 * grow, ry = 14.5 * grow, sy = ry / rx;

    // 1. Shadowed interior / back of the inner hole (giving clear 3D cavity depth)
    fArc(ctx, cx - 0.25, cy, rx - 1.15, rx - 0.2, Math.PI * 0.45, Math.PI * 1.55, '#5e3408', sy);
    fArc(ctx, cx - 0.15, cy, rx - 0.95, rx - 0.3, Math.PI * 0.55, Math.PI * 1.45, '#8c4e0a', sy);

    // 2. Main outer rim: ink outline for clean cartoon definition (sleek 1.35px tube thickness)
    fArc(ctx, cx, cy, rx - 1.35, rx + 1.35, 0, Math.PI * 2 - 0.001, INK, sy);

    // 3. Shaded golden body (darker copper/gold on the back/receding edge, rich radiant gold on front)
    fArc(ctx, cx, cy, rx - 0.95, rx + 0.95, Math.PI * 0.48, Math.PI * 1.52, '#ad620e', sy);
    fArc(ctx, cx, cy, rx - 0.95, rx + 0.95, -Math.PI * 0.52, Math.PI * 0.48, '#e59a16', sy);
    fArc(ctx, cx + 0.2, cy, rx - 0.65, rx + 0.85, -Math.PI * 0.45, Math.PI * 0.45, '#ffd147', sy);

    // 4. Brilliant specular highlight ridge along the front curving rim
    fArc(ctx, cx + 0.3, cy, rx - 0.25, rx + 0.55, -Math.PI * 0.38, Math.PI * 0.38, '#fffaab', sy);
    fArc(ctx, cx + 0.4, cy, rx + 0.05, rx + 0.45, -Math.PI * 0.26, Math.PI * 0.26, '#ffffff', sy);

    // 5. Crown and base bevel glints (3D rounded torus caps at top and bottom)
    for (const s of [-1, 1]) {
      const gy = cy + s * (ry - 1.2);
      fEll(ctx, cx, gy, 1.25 * grow, 0.75 * grow, '#ffe270');
      fEll(ctx, cx + 0.25, gy, 0.75 * grow, 0.45 * grow, '#ffffff');
    }

    // 6. Sliding star glint running along the front 3D rim with radiant sparkle
    if (!this.got) {
      const period = 50, phase = (t % period) / period;
      const ga = -Math.PI * 0.42 + phase * Math.PI * 0.84;
      const gx = cx + Math.cos(ga) * (rx + 0.15);
      const gy = cy + Math.sin(ga) * (ry + 0.15);
      const flare = Math.sin(phase * Math.PI);
      if (flare > 0.05) {
        fSparkle(ctx, gx, gy, 0.8 + flare * 1.6, '#ffffff');
        fGlow(ctx, gx, gy, 4 + flare * 3, '#fffac2', flare * 0.5);
      }
    } else {
      // Flash burst star on collect
      const burstSize = (this.flash / 30) * 4;
      fSparkle(ctx, cx + 1, cy, burstSize, '#ffffff');
    }

    ctx.restore();
  }
}

// ---------- Rainbow star & rainbow road -------------------------------------------------------
// Touch the star and run right to paint a rainbow under his feet at the height he last stood.
// Going left only supports him on road already painted. Jumping off it is fine (he lands
// back on it); landing on a higher cloud raises the road; holding down drops through it.
const RAINBOW_COLS = ['#ff4d6d', '#ff9f40', '#ffe14d', '#5fd068', '#4aa8ff', '#9a6aff'];
class RainbowStar extends Enemy {
  constructor(col, row, until) {
    super(col * TILE + 1, row * TILE + 1, 14, 14);
    this.until = until == null ? col + 40 : until;   // the road lasts until Chickaroo stands on solid ground past this column
    this.ready = true; this.regrow = 0;
    this.passive = true; this.noFreeze = true; this.friendly = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return this.ready ? this : null; }
  update(g) {
    this.t++;
    if (!this.ready && --this.regrow <= 0) this.ready = true;
    if (this.ready && this.t % 6 === 0) g.particles.push({ kind: 'spark', x: this.cx + rand(-8, 8), y: this.y + rand(0, 14), vx: 0, vy: rand(-0.6, -0.2), g: 0, drag: 0.97, life: 30, t: 0, color: RAINBOW_COLS[(this.t / 6) % 6 | 0] });
  }
  onTouch(g) {
    if (!this.ready) return;
    this.ready = false; this.regrow = 360;
    g.startRainbow(this.until);
  }
  draw(ctx) {
    if (!this.ready) return;
    const cx = Math.round(this.cx), cy = Math.round(this.y + 7 + Math.sin(this.t * 0.08) * 2), spin = this.t * 0.05;
    ctx.globalAlpha = 0.3; fBlob(ctx, cx, cy, 12, RAINBOW_COLS[(this.t >> 3) % 6]); ctx.globalAlpha = 1;
    // a plump five-pointed star in bands of the six colours, an ink line round it, a little face (fine: hires.js)
    const star = (r0, r1) => Array.from({ length: 10 }, (_, i) => { const a = spin + i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r0 : r1; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
    fPoly(ctx, star(4.6, 10.4), INK);
    for (let k = 0; k < 6; k++) fPoly(ctx, star(3.8 * (1 - k / 7), 9.2 * (1 - k / 7)), RAINBOW_COLS[k]);
    fBlob(ctx, cx, cy, 2.8, '#ffffff');
    fEll(ctx, cx - 1.4, cy - 0.4, 0.5, 0.8, INK); fEll(ctx, cx + 1.4, cy - 0.4, 0.5, 0.8, INK); fArc(ctx, cx, cy + 0.6, 0.6, 1.2, Math.PI * 0.2, Math.PI * 0.8, INK);
  }
}
// A forward-painted ribbon with permanent one-way collision for every painted span,
// including old heights. Airborne travel and stomps retain the power; only actual
// ground beyond the exit stops new paint. Existing road remains usable afterward.
class RainbowRoad {
  constructor() {
    this.x = -1e5; this.y = 0; this.w = 0; this.h = 6; this.dx = 0; this.dy = 0; this.prevY = 0;
    this.on = false; this.complete = false; this.until = 0; this.level = 0; this.drop = null; this.fade = 0;
    this.front = 0; this.origin = 0; this.lastX = 0; this.lastLevel = null;
    this.paint = new Map(); this.spans = [];
  }
  paintStrip(g, left, right, y) {
    left = Math.max(Math.ceil(left), Math.ceil(this.origin - 2));
    right = Math.min(Math.floor(right), this.until * TILE - 1);
    if (right < left) return;
    for (let x = left; x <= right; x++) this.paint.set(x + ',' + y, {x,y});
    const joined = this.spans.filter(s => s.y === y && s.x <= right + 1 && s.x + s.w >= left);
    if (joined.length) {
      const first = joined[0];
      const a = Math.min(left,...joined.map(s=>s.x)), b = Math.max(right+1,...joined.map(s=>s.x+s.w));
      first.x=a;first.w=b-a;
      for (const old of joined.slice(1)) {
        old.remove=true;this.spans.splice(this.spans.indexOf(old),1);
      }
    } else {
      const span={rainbow:this,x:left,y,w:right-left+1,h:6,dx:0,dy:0,prevY:y,ghost:false,update(){},draw(){}};
      this.spans.push(span);g.platforms.push(span);
    }
  }
  update(g) {
    const p=g.player;
    if (!this.on) {
      this.x=-1e5;
      for(const s of this.spans)s.ghost=true;
      if (--this.fade<=0) { this.remove=true;for(const s of this.spans)s.remove=true; }
      return;
    }
    const end=this.until*TILE, foot=p.y+p.h, own=p.platform===this||p.platform?.rainbow===this;
    // Airborne crossing of the exit is not completion. Keep the safety net until real ground catches him.
    if (p.state==='play'&&p.onGround&&!p.platform&&p.x>=end) this.complete=true;
    if (p.onGround) this.level=foot;
    this.level=Math.round(this.level*ART_R)/ART_R;
    // Only a fresh press while standing on our paint drops through. Holding
    // Down for an airborne pound must keep the ribbon solid through landing.
    if (own&&p.onGround&&!p.pounding&&Input.hit('down')) this.drop=foot;
    if (this.drop!=null&&(foot>this.drop+10||(p.onGround&&!own))) this.drop=null;
    for(const span of this.spans)span.ghost=p.state!=='play'||(this.drop!=null&&span.y<=this.drop+10);
    const forward=p.x>=this.front-.01&&p.x>=this.lastX-.01;
    this.prevY=this.y=this.level;
    this.x=-1e5;this.w=0;
    if (p.state==='play'&&this.drop==null&&!this.complete&&forward&&foot<=this.level+1) {
      // Fill the ribbon beneath a forward jump too, so landing and backtracking use visible geometry.
      const left=this.lastLevel===this.level?Math.min(this.front,p.x)-2:p.x-2;
      this.paintStrip(g,left,p.x+p.w+2,this.level);
      this.front=Math.max(this.front,p.x);this.lastLevel=this.level;
      this.x=Math.max(this.origin-2,p.x-8);this.w=Math.max(0,Math.min(p.w+16,end-this.x));
    }
    this.lastX=p.x;
    if(own&&g.t%3===0&&Math.abs(p.vx)>.3)g.particles.push({kind:'spark',x:p.x+p.w/2-p.facing*6,y:this.y+rand(0,6),vx:-p.vx*.3,vy:rand(-.6,.2),g:.03,drag:.95,life:24,t:0,color:RAINBOW_COLS[g.t%6]});
  }
  draw(ctx) {
    ctx.globalAlpha = this.on ? 1 : Math.max(0, this.fade / 40);
    const ps = [...this.paint.values()];   // six bands, one fill each (fine: hires.js)
    for (let i = 0; i < 6; i++) fRects(ctx, RAINBOW_COLS[i], ps.map(s => [s.x, Math.round(s.y) + i, 1, 1]));
    ctx.globalAlpha *= 0.5; fRects(ctx, '#ffffff', ps.map(s => [s.x, Math.round(s.y), 1, 1 / 3])); ctx.globalAlpha = this.on ? 1 : Math.max(0, this.fade / 40);
    ctx.globalAlpha = 1;
  }
}
