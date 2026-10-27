'use strict';
const GRUMBLET_FUSE = 90, GRUMBLET_GAS = 180;   // toxic glowshroom: 3-beat fuse, then 3 s of gas (frames)
class Grumblet extends Enemy {
  constructor(col, row, theme) {
    super(col * TILE + 1, (row + 1) * TILE - 16, 14, 16);
    this.vx = -0.5; this.walker = true; this.theme = theme;
  }
  update(g) { this.t++; this.walk(g, false); }
  stomp(g, p) { g.bounce(p); this.squash(g); }
  // squashed flat (by a stomp, or bowled over by a roll): a glowshroom then starts its gas fuse
  squash(g) {
    this.dead = true; this.squashed = true; this.deadT = 0; this.vx = 0;
    g.stompScore(this); Sound.play('stomp');
    g.dust(this.cx, this.y + this.h, 6); g.shake = Math.max(g.shake, 1.5);
    this.toxic = this.theme !== 'meadow' && this.theme !== 'ocean';   // glowshrooms are toxic: a fuse, then a gas cloud
    if (!this.toxic) this.burstDeath(g);
  }
  // Toxic glowshroom, once stomped: the flat cap blinks a 3-2-1 countdown (faster each beat),
  // then pops into a cloud of green gas that hurts on touch and thins out over 3 seconds.
  updateDead(g) {
    if (!this.toxic) { super.updateDead(g); return; }
    this.deadT++;
    const d = this.deadT, beat = GRUMBLET_FUSE / 3;
    if (d < GRUMBLET_FUSE) {
      if (d % beat === 1) Sound.play('tick');
      return;
    }
    const c = d - GRUMBLET_FUSE, cy = this.y + this.h - 8;
    if (c === 0) {
      g.burst(this.cx, cy, ['#7dff5a', '#3fbf3a', '#d6ff9a'], 18); g.shake = Math.max(g.shake, 3); Sound.play('blast');
    }
    if (c % 5 === 0 && c < GRUMBLET_GAS - 40) g.spark(this.cx + rand(-18, 18), cy + rand(-14, 10), '#7dff5a', 24, rand(-0.2, 0.2), rand(-0.5, -0.1));
    if (c < GRUMBLET_GAS - 30) {   // the last half-second is a harmless wisp
      const p = g.player, r = this.gasR(c), dx = p.x + p.w / 2 - this.cx, dy = p.y + p.h / 2 - cy;
      if (dx * dx + dy * dy < (r + 4) * (r + 4)) g.hurtPlayer();
      // the poison eats enemies too: anything that wanders into the cloud dissolves away
      for (const e of g.entities) {
        if (e === this || e.dead || e.passive || e.friendly || e.bossHazard || e === g.boss || e === g.held || e instanceof Spring || e instanceof Firebar) continue;
        const hb = e.hitbox && e.hitbox();
        if (!hb) continue;
        const ex = clamp(this.cx, hb.x, hb.x + hb.w) - this.cx, ey = clamp(cy, hb.y, hb.y + hb.h) - cy;
        if (ex * ex + ey * ey < r * r) this.dissolve(g, e);
      }
    }
    if (c >= GRUMBLET_GAS) this.remove = true;
  }
  gasR(c) { return Math.min(26, 8 + c * 1.2); }
  // An enemy caught in the gas: it fizzles apart into green motes and bubbling slime, gone.
  dissolve(g, e) {
    e.dead = true; e.remove = true;
    const hb = e.hitbox() || e;
    for (let i = 0; i < 22; i++) {
      const x = hb.x + rand(0, hb.w), y = hb.y + rand(0, hb.h);
      g.particles.push({ kind: 'px', x, y, vx: rand(-0.5, 0.5), vy: rand(-1.1, -0.2), drag: 0.96, life: 30 + rand(0, 25), t: 0, color: ['#7dff5a', '#3fbf3a', '#d6ff9a', '#2a6a20'][i % 4], size: 1 + (i % 3 === 0) });
    }
    for (let i = 0; i < 5; i++) g.particles.push({ kind: 'px', x: hb.x + rand(0, hb.w), y: hb.y + hb.h - 2, vx: rand(-0.3, 0.3), vy: rand(0.2, 0.8), g: 0.1, life: 30, t: 0, color: '#3fbf3a', size: 2 });
    g.stompScore(e);
    Sound.play('sizzle');
  }
  drawGas(ctx) {
    const c = this.deadT - GRUMBLET_FUSE, x = this.cx, y = this.y + this.h - 8, r = this.gasR(c);
    const fade = Math.max(0, 1 - c / GRUMBLET_GAS);
    // a billowing toxic cloud: lumpy puffs with a dark rim, a sickly body and a bright upper edge, churning slowly
    const puffs = [];
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7 + c * 0.018 * (i % 2 ? 1 : -1), d = r * (i ? 0.62 : 0);
      puffs.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7 - c * 0.03, r * (i ? 0.5 : 0.7) + Math.sin(c * 0.09 + i * 1.7) * 1.5]);
    }
    ctx.globalAlpha = 0.5 * fade; for (const [px, py, pr] of puffs) blob(ctx, px, py, Math.round(pr) + 1, '#1f5a22');
    ctx.globalAlpha = 0.55 * fade; for (const [px, py, pr] of puffs) blob(ctx, px, py, Math.round(pr), '#4fc43c');
    ctx.globalAlpha = 0.4 * fade; for (const [px, py, pr] of puffs) blob(ctx, px - 1, py - Math.round(pr * 0.25), Math.round(pr * 0.65), '#8fee60');
    ctx.globalAlpha = 0.45 * fade; for (const [px, py, pr] of puffs) blob(ctx, px - Math.round(pr * 0.25), py - Math.round(pr * 0.4), Math.max(1, Math.round(pr * 0.25)), '#d6ffa8');
    // bubbles of poison rising out of it (little rings that pop)
    ctx.globalAlpha = 0.8 * fade;
    for (let i = 0; i < 6; i++) {
      const k = (c * 0.5 + i * 17) % 30, bx = x + Math.sin(i * 2.3 + c * 0.03) * r * 0.8, by = y + r * 0.3 - k * (r / 18);
      ctx.strokeStyle = '#d6ffa8'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(bx + 0.5, by + 1.5, 1.3, 0, Math.PI * 2); ctx.stroke();   // (fine rings)
    }
    ctx.globalAlpha = 1;
  }
  draw(ctx) {
    if (this.theme === 'ocean') { this.drawCrab(ctx); return; }
    if (this.squashed && this.toxic && this.deadT >= GRUMBLET_FUSE) { this.drawGas(ctx); return; }
    if (this.squashed && this.toxic) {   // blinking fuse: on/off, faster each beat, a sickly green flash on
      const beat = Math.floor(this.deadT / (GRUMBLET_FUSE / 3)), period = [16, 10, 4][beat];
      if (Math.floor(this.deadT / (period / 2)) % 2) {
        ctx.globalAlpha = 0.5; blob(ctx, this.cx, this.y + this.h - 4, 9, '#7dff5a'); ctx.globalAlpha = 1;
        drawSprite(ctx, this.sprite('flat'), this.cx, this.y + this.h, false); return;
      }
    }
    if (this.squashed) { drawSprite(ctx, this.sprite('flat'), this.cx, this.y + this.h, false); return; }
    // step the feet; face the way it's walking (no flipping back and forth)
    if (this.theme !== 'meadow') {   // a glowshroom: a soft sickly glow round its cap, and a wisp of spores curling up off it
      const dark = this.theme === 'cave' || this.theme === 'clock' || this.theme === 'eclipse';
      ctx.globalAlpha = (dark ? 0.03 : 0.018) + Math.sin(this.t * 0.08) * 0.0075; blob(ctx, this.cx, this.y + 3, 13, '#9dff6a');
      for (let i = 0; i < 2; i++) {
        const k = (this.t * 0.4 + i * 15) % 30;
        ctx.globalAlpha = 0.6 * (1 - k / 30);
        fBlob(ctx, this.cx + Math.sin(k * 0.3 + i * 3) * 4, this.y - 1 - k * 0.5, 0.9, '#c8ff90');
      }
      ctx.globalAlpha = 1;
    }
    const img = this.sprite(Math.floor(this.t / 10) % 2 ? 'B' : 'A');
    drawSprite(ctx, img, this.cx, this.y + this.h, this.vx < 0, 1, 1, this.flipped);
  }
  // its look: the meadow's acorn is painted (meadow-art.js); a glowshroom elsewhere
  sprite(k) {
    if (this.theme === 'meadow') { const M = meadowArt(); return k === 'flat' ? M.acornFlat : k === 'B' ? M.acornB : M.acornA; }
    return (k === 'flat' ? SPR.grumbletFlat : k === 'B' ? SPR.grumbletB : SPR.grumblet)[this.theme];
  }
  // On the sea floor it's a hermit crab: a coral spiral shell on its back, scuttling legs, eyes on
  // stalks and one big claw held up front.
  drawCrab(ctx) {   // under the sea: a hermit crab (painted fine: hermitArt, ocean-fine.js), facing the way it walks
    const f = this.vx < 0 ? -1 : 1, x = Math.round(this.cx), by = Math.round(this.y + this.h);
    ctx.save(); ctx.translate(x, by);
    if (this.flipped) { ctx.translate(0, -this.h); ctx.scale(1, -1); }
    if (f < 0) ctx.scale(-1, 1);
    ctx.drawImage(hermitArt((this.t >> 3) % 2, !!this.squashed), -12, -18);
    ctx.restore();
  }
}

const SHELL_ROLL_MAX = 600;   // frames (10 s) a kicked or thrown shell keeps rolling before it shatters
class Shellback extends Enemy {
  constructor(col, row) {
    super(col * TILE + 1, (row + 1) * TILE - 15, 14, 15);
    this.vx = -0.55; this.walker = true; this.state = 'walk'; this.shellT = 0; this.slideT = 0; this.grace = 0; this.combo = 0;
  }
  shatter(g) {
    this.dead = this.remove = true;
    g.burst(this.cx, this.y + this.h / 2, ['#92582e', '#d39a52', '#ffe0a0'], 14);
    g.dust(this.cx, this.y + this.h, 6);
    Sound.play('break');
  }
  update(g) {
    this.t++;
    if (this.grace > 0) this.grace--;
    if (this.state !== 'slide') this.slideT = 0;
    if (this.state === 'held') { this.updateHeld(g); return; }
    if (this.state === 'toss') {
      // thrown straight up: flies with gravity, lands as a resting shell
      const lv = g.level;
      this.vy = Math.min(this.vy + 0.3, 5);
      if (sweepX(lv, this, this.vx)) this.vx = -this.vx * 0.5;
      // Rising shells bump the underside just like the player's head, including hidden blocks.
      const row = Math.floor((this.y + this.vy) / TILE), blocking = [];
      if (this.vy < 0) {
        for (let c = Math.floor(this.x / TILE); c <= Math.floor((this.x + this.w - 0.01) / TILE); c++) {
          if (lv.solid(c, row) || (lv.get(c, row) === T.HIDDEN && this.y >= (row + 1) * TILE - 0.5)) blocking.push(c);
        }
      }
      let r;
      if (blocking.length) {
        const center = Math.floor(this.cx / TILE);
        this.y = (row + 1) * TILE;
        g.hitBlock(blocking.includes(center) ? center : blocking[0], row);
        r = -1;
      } else r = sweepY(lv, this, this.vy);
      if (r === 1) { this.state = 'shell'; this.walker = true; this.vx = 0; this.vy = 0; }
      else if (r === -1) this.vy = 0.5;
      if (this.y > VIEW_H + 32) this.remove = true;
      return;
    }
    if (this.state === 'walk') this.walk(g, true);
    else if (this.state === 'shell') {
      this.vx = 0;
      this.walk(g, false);
      if (++this.shellT > 480) {
        this.state = 'walk';
        this.vx = g.player.x + g.player.w / 2 < this.cx ? -0.55 : 0.55;
      }
    } else {
      const lv = g.level;
      // a rolling shell only wears out after SHELL_ROLL_MAX frames, so one trapped between two walls can't bounce forever
      if (!this.stone && ++this.slideT > SHELL_ROLL_MAX) { this.shatter(g); return; }
      this.vy = Math.min(this.vy + 0.3, 5);
      if (sweepX(lv, this, this.vx)) {
        // a kicked shell smashes straight through crates (and pops ? blocks, bouncing off those)
        const c = Math.floor((this.vx > 0 ? this.x + this.w + 1 : this.x - 1) / TILE);
        let smashed = false;
        for (let r = Math.floor(this.y / TILE); r <= Math.floor((this.y + this.h - 1) / TILE); r++) {
          const t = lv.get(c, r);
          if (g.smashCrate(c, r)) { smashed = true; continue; }
          if (t === T.QCOIN || t === T.QPOW) g.hitBlock(c, r);
        }
        if (!smashed || lv.solid(c, Math.floor(this.y / TILE)) || lv.solid(c, Math.floor((this.y + this.h - 1) / TILE))) this.vx = -this.vx;
        if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('bump');
      }
      const impact = sweepY(lv, this, this.vy);
      if (impact) this.vy = 0;
      if (this.y > VIEW_H + 32 || this.x > g.camX + VIEW_W + 160 || this.x + this.w < g.camX - 160) this.remove = true;   // a little leeway to finish its run
    }
  }
  // Carrying (hold run on a resting shell). The shell rides in front of the player and is
  // thrown when run is released: kick by default, straight up with up held, set down with down.
  holdPos(p) {
    this.x = p.facing > 0 ? p.x + p.w - 5 : p.x - this.w + 5;
    this.y = p.y + p.h - this.h - (p.power ? 7 : 2);
  }
  updateHeld(g) {
    const p = g.player;
    this.shellT++;
    if (p.state !== 'play') { g.dropHeld(); return; }
    this.holdPos(p);
    if (this.shellT > 480) {          // the turtle wakes up in the player's hands
      g.held = null;
      this.state = 'walk'; this.walker = true; this.vx = p.facing * 0.55; this.y = p.y + p.h - this.h;
      g.hurtPlayer();
      return;
    }
    if (!Input.down('run') || Input.hit('up')) g.throwHeld();   // tap up: toss it straight up
  }
  kick(g, p) {
    const dir = p.x + p.w / 2 < this.cx ? 1 : -1;
    this.state = 'slide'; this.walker = false; this.grace = 12; this.combo = 0;
    this.vx = SHELL_SPEED * dir;
    sweepX(g.level, this, dir > 0 ? (p.x + p.w) - this.x + 1 : (p.x - this.w) - this.x - 1);
    Sound.play('kick');
    g.addScore(400, this.cx, this.y);
  }
  onTouch(g, p) {
    const stomp = g.isStomp(p, this);
    if (this.state === 'walk') {
      if (stomp) {
        this.state = 'shell'; this.vx = 0; this.shellT = 0;
        g.bounce(p, true); g.stompScore(this); Sound.play('stomp'); g.dust(this.cx, this.y + this.h, 5);
      } else g.hurtPlayer();
    } else if (this.state === 'shell') {
      if (this.grace > 0) return;
      if (Input.down('run') && !g.held) g.pickUp(this);   // holding grab: even landing on top of it scoops it up
      else { this.kick(g, p); if (stomp) g.bounce(p, true); }
    } else if (this.state === 'toss') {
      if (Input.down('run') && !g.held) g.pickUp(this);   // catch it on the way down
    } else if (this.grace <= 0) {
      if (Input.down('run') && !g.held && !(p.roll > 0)) {   // holding grab: catch it (from above or head-on), no harm done
        g.pickUp(this); this.combo = 0; g.dust(this.cx, this.y + this.h, 3); Sound.play('kick'); return;
      }
      if (stomp) {
        this.state = 'shell'; this.walker = true; this.vx = 0; this.shellT = 0;
        g.bounce(p, true); g.addScore(100, this.cx, this.y); Sound.play('stomp');
      } else g.hurtPlayer();
    }
  }
  touches(p) { return this.state !== 'held' && super.touches(p); }
  // A realistic pill bug (woodlouse): a domed back of overlapping slate-grey plates with pale
  // flecked rims, a small head with elbowed antennae that feel about, and seven pairs of tiny legs
  // rippling underneath. Stomped, it rolls up into a tight banded ball.
  draw(ctx) {
    const cx = Math.round(this.cx), by = Math.round(this.y + this.h);
    const shake = (this.state === 'shell' || this.state === 'held') && this.shellT > 400 ? (Math.floor(this.t / 2) % 2 ? 1 : -1) : 0;
    const walking = this.state === 'walk' && !this.dead, f = this.vx < 0 ? -1 : 1;
    const frame = walking ? Math.floor(this.t / 3) % 8
      : (this.state === 'slide' || this.state === 'toss') ? Math.round(this.t * 0.35 * f * 24 / (Math.PI * 2)) : 0;
    if (this.flipped) { ctx.save(); ctx.translate(0, by * 2 - this.h); ctx.scale(1, -1); }
    ctx.drawImage(pillBugArt(walking, frame, f), cx + shake - 15, by - 18);
    if (this.flipped) ctx.restore();
  }
}


// ── 1-1 charmers ────────────────────────────────────────────────────────────
// Sunflower: pure scenery with a personality. Its big seed-face turns to follow Chickaroo wherever
// he goes (the whole field watches him pass), and it beams when he's close.
class Sunflower extends Enemy {
  constructor(col, row) {
    super(col * TILE, (row + 1) * TILE, 16, 0);
    this.behindTiles = true; this.friendly = true; this.h0 = 30 + (col * 7) % 12; this.look = 0; this.wink = 0;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    const p = g.player, dx = p.x + p.w / 2 - this.cx;
    this.look += (clamp(dx / 60, -1, 1) - this.look) * 0.08;
    const near = Math.abs(dx) < 50;
    // brushing past its stalk: a wink and a little twinkle of sparkles round its face
    const touch = p.state === 'play' && overlap(p, { x: this.cx - 4, y: this.y - this.h0, w: 8, h: this.h0 });
    if (touch && !this.touching && this.wink <= 0) {
      this.wink = 34; this.winkSide = dx < 0 ? -1 : 1;   // the eye on his side, kept for the whole wink
      const hx = this.cx, hy = this.y - this.h0;
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.particles.push({ kind: 'spark', x: hx + Math.cos(a) * 10, y: hy + Math.sin(a) * 10, vx: Math.cos(a) * 0.6, vy: Math.sin(a) * 0.6 - 0.3, g: 0, drag: 0.94, life: 30, t: 0, color: i % 2 ? '#fff3b0' : '#ffffff' }); }
    }
    if (this.wink > 0) this.wink--;
    this.near = near; this.touching = touch;
  }
  draw(ctx, g) {   // (painted fine: the flower kit in meadow-fine.js)
    const bx = Math.round(this.cx), by = Math.round(this.y), h = this.h0, sway = Math.sin(this.t * 0.03 + bx) * 1;
    const hx = bx + this.look * 3 + sway, hy = by - h;
    fineStem(ctx, bx, by, bx, by - h * 0.5, hx, hy + 5, 0.9);
    for (const s of [-1, 1]) fineLeaf(ctx, bx + s * 0.8, by - h * (s < 0 ? 0.32 : 0.52), s * 0.8, -0.6, 6.5, 1.8, 1);
    // petals, then the face (turned toward him: the face slides inside the petal ring)
    drawCentred(ctx, flowerRing(7, 12, 3.1, 1.9, PETALS_GOLD, this.t * 0.004), hx, hy);
    const fx = hx + this.look * 2;
    drawCentred(ctx, flowerFace(5.6), fx, hy);
    const ex = this.look * 1.5;
    // eyes (the one nearest him closes in a wink when he brushes its stalk)
    const winkL = this.wink > 0 && this.winkSide < 0, winkR = this.wink > 0 && this.winkSide > 0;
    const eye = (ox, shut) => {
      const eyeX = fx + ox + ex, eyeY = hy - 1.3;
      if (shut) { fArc(ctx, eyeX, eyeY - 0.6, 0.9, 1.6, Math.PI * 0.15, Math.PI * 0.85, INK); return; }
      const dx = g.player.x + g.player.w / 2 - eyeX, dy = g.player.y + g.player.h / 2 - eyeY, distance = Math.max(12, Math.hypot(dx, dy));
      fEll(ctx, eyeX, eyeY, 1.5, 1.8, '#ffffff');
      fEll(ctx, eyeX + dx / distance * 0.6, eyeY + dy / distance * 0.7, 0.85, 1.05, INK);
      fRect(ctx, eyeX + dx / distance * 0.6 - 0.34, eyeY + dy / distance * 0.7 - 0.67, 1 / 3, 1 / 3, '#ffffff');
    };
    eye(-2, winkL); eye(2, winkR);
    if (this.wink > 20) { const gx = fx + ex + (winkR ? 5 : -5); fRect(ctx, gx, hy - 4.5, 1 / 3, 1, '#ffffff'); fRect(ctx, gx - 1 / 3, hy - 4.17, 1, 1 / 3, '#ffffff'); }   // a glint off the wink
    // a smile that widens into a beam when he's close (with rosy cheeks)
    if (this.near) {
      fArc(ctx, fx + ex, hy + 1.2, 0, 2.3, 0.15, Math.PI - 0.15, INK, 0.8); fArc(ctx, fx + ex, hy + 1.6, 0, 1.3, 0.4, Math.PI - 0.4, '#d8405a', 0.7);
      fEll(ctx, fx + ex - 3.8, hy + 1.2, 1, 0.6, '#ff8aa8'); fEll(ctx, fx + ex + 3.8, hy + 1.2, 1, 0.6, '#ff8aa8');
    } else fArc(ctx, fx + ex, hy + 0.9, 1.4, 2, Math.PI * 0.2, Math.PI * 0.8, INK);
  }
}

// Sheep: big, soft and harmless. Stomp one and it squashes like a trampoline -- "BAA!" -- and
// launches Chickaroo sky-high. Wanders its patch of grass, turning at ledges and walls.
// Sheep keep their personal space from each other (they never walk into the next one in the flock), but he
// just walks on past them, a bleat as he brushes by. Get ahead of the flock and it trots after him, so it's never left
// behind; it hops down a step, but won't go over a real drop.
// Near him it stands and gazes, little pink hearts floating off its head.
class Sheep extends Enemy {
  constructor(col, row) {
    super(col * TILE - 2, (row + 1) * TILE - 16, 20, 16);
    this.vx = 0.25; this.walker = true; this.friendly = true; this.squash = 0; this.facing = 1;
    this.hearts = []; this.heartT = 40 + Math.floor(rand(0, 120)); this.baaT = 0;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  // level with him or another sheep (not above it: landing on a sheep is a bounce)
  levelWith(o) { return o.y + o.h > this.y + 6 && o.y < this.y + this.h; }
  // the sheep beside it on side `dir`, if any, and the gap between them
  neighbour(g, dir) {
    let best = null, gap = Infinity;
    for (const e of g.entities) {
      if (e === this || !(e instanceof Sheep) || e.dead || !this.levelWith(e)) continue;
      const d = dir > 0 ? e.x - (this.x + this.w) : this.x - (e.x + e.w);
      if (d > -this.w && d < gap) { gap = d; best = e; }
    }
    return best ? { s: best, gap } : null;
  }
  // a drop of four rows or more (or no bottom at all) just ahead: it won't step off that
  brinkAhead(g, dir) {
    const lv = g.level, ac = Math.floor((dir > 0 ? this.x + this.w + 2 : this.x - 2) / TILE), r = Math.floor((this.y + this.h + 1) / TILE);
    let drop = 0;
    while (drop < 4 && r + drop < ROWS && !lv.solid(ac, r + drop)) drop++;
    return this.onGround && (drop >= 4 || r + drop >= ROWS);
  }
  update(g) {
    this.t++;
    this.heartsStep();
    if (this.baaT > 0) this.baaT--;
    if (this.squash > 0) { this.squash--; this.vx = 0; this.walk(g, true); return; }
    // he just walks on past (no bumping into a sheep): it bleats as he brushes by
    const p = g.player, playing = p.state === 'play' && this.levelWith(p);
    if (playing && p.x + p.w > this.x && p.x < this.x + this.w) {
      if (!this.baaT) { Sound.play('baa'); this.baaT = 150; }
      this.grazing = false;
    }
    // he's gone on ahead: the flock trots after him (they adore him), each keeping its space, settling a little way short
    const dx = p.x + p.w / 2 - this.cx, fdir = Math.sign(dx);
    if (p.state === 'play' && Math.abs(p.y + p.h - this.y - this.h) < 4 * TILE && Math.abs(dx) > SHEEP_HEEL && Math.abs(dx) < SHEEP_FOLLOW) {
      const n = this.neighbour(g, fdir);
      this.trot = (n && n.gap < SHEEP_SPACE + 2) || this.brinkAhead(g, fdir) ? 0 : Math.min(SHEEP_TROT, (this.trot || 0) + 0.06);   // (bunched up behind the flock, or at the brink)
      this.facing = fdir; this.grazing = false;
      this.vx = fdir * this.trot; this.walk(g, true); this.vx = fdir * 0.25; return;
    }
    this.trot = 0;
    // near him it just stands there, gazing at him fondly
    if (playing && Math.abs(p.x + p.w / 2 - this.cx) < 3 * TILE) {
      this.facing = p.x + p.w / 2 < this.cx ? -1 : 1; this.grazing = false;
      const v = this.vx; this.vx = 0; this.walk(g, true); this.vx = v || 0.25; return;
    }
    if (this.vx === 0) this.vx = (this.t >> 6) % 2 ? 0.25 : -0.25;
    if (this.t % 240 < 70) { const v = this.vx; this.vx = 0; this.walk(g, true); this.vx = v; this.grazing = true; return; }   // stops to graze
    this.grazing = false;
    const n = this.neighbour(g, this.vx > 0 ? 1 : -1);
    if (n && n.gap < SHEEP_SPACE + 2) this.vx = -this.vx;   // (never grazes its way into another sheep)
    this.walk(g, true);
  }
  // a little pink heart now and then, floating up off its head and fading away (one at a time)
  heartsStep() {
    for (const h of this.hearts) { h.t++; h.y -= 0.35; h.x += Math.sin(h.t * 0.12) * 0.25; }
    this.hearts = this.hearts.filter(h => h.t < 64);
    if (--this.heartT <= 0) {
      this.heartT = 170 + Math.floor(rand(0, 150));
      const f = this.vx < 0 ? -1 : this.vx > 0 ? 1 : this.facing;
      this.hearts.push({ x: this.cx + f * 6, y: this.y - 4, t: 0 });
    }
  }
  onTouch(g, p) {
    if (p.vy > 0 && p.prevY + p.h <= this.y + 8) {
      p.y = this.y - p.h; p.vy = SHEEP_BOUNCE; p.jumping = false; p.onGround = false; p.springAir = true; p.combo = 0;
      p.sheepBounce = true; p.stompSmall = false; p.jumpBuf = 0; p.coyote = 0; p.holdGrace = 0;
      this.squash = 16;
      for (let i = 0; i < 8; i++) g.particles.push({ kind: 'px', x: this.cx + rand(-8, 8), y: this.y + rand(0, 6), vx: rand(-1, 1), vy: rand(-1.5, -0.3), drag: 0.93, life: 30, t: 0, color: '#ffffff', size: 2 });
      Sound.play('baa'); Sound.play('spring');
    }
  }
  // A plump, fluffy little sheep: a cloud of curly wool (lit from the top-left, curls picked out in its shade), a
  // stubby tail puff, sooty legs with tiny hooves that patter as it walks, and a soft dark face with a woolly fringe,
  // a floppy pink-lined ear, a big shiny eye and a rosy cheek. Nose down in the grass while it grazes; squashed flat
  // when bounced on.
  draw(ctx) {
    const f = this.vx < 0 ? -1 : this.vx > 0 ? 1 : this.facing, sq = this.squash > 8 ? 4 : this.squash > 0 ? 2 : 0;
    const cx = Math.round(this.cx), by = Math.round(this.y + this.h), walking = !this.grazing && (this.trot > 0.2 || (this.vx && this.t % 240 >= 70));
    const step = walking ? (this.t >> 3) % 2 : 0, bob = walking ? step : 0;
    const X = dx => cx + dx * f;   // (drawn facing right; mirrored when it faces left)
    // legs: front pair and back pair stepping by turns, a little hoof on each (painted fine: hires.js)
    for (const [lx, pair] of [[-6, 0], [-3, 1], [3, 1], [6, 0]]) {
      const lift = pair === step && walking ? 1 : 0, lh = 5 - sq / 2 - lift, x = X(lx) - 0.7;
      fRect(ctx, x - 2 / 3, by - lh - 1 - lift, 2 + 4 / 3, lh + 1, INK);
      fRect(ctx, x, by - lh - 1 - lift, 2, lh - 1, '#4a4058'); fRect(ctx, x, by - lh - 1 - lift, 2 / 3, lh - 1, '#6a5e7c');
      fRect(ctx, x, by - 2 - lift, 2, 2 / 3, '#231c30');
    }
    // the wool: a cloud of lumps, outlined, shaded underneath, lit on top, with curls on each lump
    const wy = by - 11 + sq + bob, k = 1 + sq * 0.06, kv = 1 - sq * 0.12;
    const lumps = [[-8, 0, 4], [-5, -3, 5], [0, -4, 5], [5, -3, 5], [8, 0, 4], [-5, 2, 4], [0, 2, 4], [5, 2, 4], [0, -1, 6]];
    const at = ([dx, dy]) => [X(dx * k), wy + dy * kv];
    fBlob(ctx, X(-11 * k), wy - 1, 3, INK); fBlob(ctx, X(-11 * k), wy - 1, 2.3, '#e8e2ee'); fBlob(ctx, X(-11 * k) - 0.4, wy - 1.4, 1.3, '#ffffff');   // tail puff
    for (const L of lumps) { const [x, y] = at(L); fBlob(ctx, x, y, L[2] + 0.8, INK); }
    for (const L of lumps) { const [x, y] = at(L); fBlob(ctx, x, y, L[2], L[1] > 0 ? '#d4cade' : '#ebe6f0'); }
    for (const L of lumps) { const [x, y] = at(L); fBlob(ctx, x - 0.5, y - 0.6, L[2] - 1, L[1] > 0 ? '#e4dcec' : '#f8f6fa'); }
    for (const L of lumps) if (L[1] <= 0) { const [x, y] = at(L); fBlob(ctx, x - 1.2, y - 1.4, L[2] - 2.6, '#ffffff'); }
    for (const [dx, dy] of [[-6, -3], [-1, -5], [4, -4], [-3, 1], [3, 0], [7, 0], [-8, 2], [1, 4]]) fArc(ctx, X(dx * k), wy + dy * kv, 0.6, 1.25, f > 0 ? 0.3 : Math.PI * 0.4, f > 0 ? Math.PI * 1.3 : Math.PI * 1.9, '#c6bad4');   // curls
    // the head, out in front (lower while it grazes): a soft black face under a woolly fringe
    const hx = X(11), hy = by - (this.grazing ? 6 : 12) + sq + bob;
    // the floppy ear behind it, dark with a pink lining
    const ex = X(7.5);
    fEll(ctx, ex, hy + 0.6, 3.2, 1.9, INK); fEll(ctx, ex, hy + 0.6, 2.5, 1.2, '#4a4058'); fEll(ctx, ex + f * 0.3, hy + 0.4, 1.4, 0.55, '#ff9ab8');
    fBlob(ctx, hx, hy + 1, 4.8, INK); fBlob(ctx, hx, hy + 1, 4, '#2e2638'); fBlob(ctx, hx - f * 0.9, hy + 0.2, 2.6, '#3a3148'); fBlob(ctx, hx - f * 1.4, hy - 0.4, 1.4, '#4c425e');
    fRect(ctx, hx - 3, hy + 4, 6, 2 / 3, '#211a2b');   // (shade under the chin)
    // woolly fringe
    fBlob(ctx, hx - f * 2, hy - 3, 2.9, INK); fBlob(ctx, hx + f, hy - 4, 2.9, INK); fBlob(ctx, hx + f * 2.6, hy - 2.6, 2, INK);
    fBlob(ctx, hx - f * 2, hy - 3, 2.2, '#f4f0f6'); fBlob(ctx, hx + f, hy - 4, 2.2, '#ffffff'); fBlob(ctx, hx + f * 2.6, hy - 2.6, 1.3, '#e8e2ee');
    // a big shiny eye, white round a dark pupil (a slow blink now and then), a rosy cheek, a little pink nose
    const eyX = hx + f * 1.4, eyY = hy + 0.6;
    if (this.t % 170 < 6) fArc(ctx, eyX, eyY - 0.4, 0.7, 1.3, Math.PI * 0.15, Math.PI * 0.85, '#8a7e9c');
    else {
      fEll(ctx, eyX, eyY, 1.3, 1.45, '#ffffff');
      fEll(ctx, eyX + f * 0.35, eyY + 0.15, 0.75, 1.05, INK);
      fRect(ctx, eyX + f * 0.35 - 0.34, eyY - 0.6, 2 / 3, 2 / 3, '#ffffff');   // (a glint in it)
    }
    fEll(ctx, hx - f * 1.6, hy + 2.7, 1.1, 0.55, '#ff9ab8');
    fEll(ctx, hx + f * 3.9, hy + 2.5, 0.6, 0.45, '#e07a8a');
    for (const h of this.hearts) {   // (a slow fade in and out)
      ctx.globalAlpha = Math.min(1, h.t / 10, (64 - h.t) / 20) * 0.9;
      fBlob(ctx, h.x - 1, h.y + 0.8, 1.25, '#ff7aa8'); fBlob(ctx, h.x + 1, h.y + 0.8, 1.25, '#ff7aa8');
      for (let j = 0; j < 7; j++) fRect(ctx, h.x - 2.2 + j / 3, h.y + 1.3 + j / 3, 4.4 - j * 2 / 3, 1 / 3, '#ff7aa8');
      fRect(ctx, h.x - 1.6, h.y + 0.3, 2 / 3, 2 / 3, '#ffd0e0');
    }
    ctx.globalAlpha = 1;
  }
}
const SHEEP_SPACE = 3;   // px a sheep keeps clear of the next one
const SHEEP_TROT = 1.5, SHEEP_HEEL = 26, SHEEP_FOLLOW = 15 * TILE;   // trotting after him: top speed, how close it comes (px, centre to centre), from how far away
const SHEEP_BOUNCE = -11.2;   // a launch up and over the tall cliff

// Dandelion: a giant puffball. Touch it and it bursts into seeds; Chickaroo catches one and drifts
// gently through the air beneath it. Brushing the stem lifts him to the seed head. It grows back.
class Dandelion extends Enemy {
  constructor(col, row) {
    super(col * TILE, (row + 1) * TILE - 52, 16, 52);
    this.friendly = true; this.ready = true; this.regrow = 0;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return this.ready ? { x: this.x - 6, y: this.y - 4, w: this.w + 12, h: 22 } : null; }
  touches(p) {
    if (!this.ready || p.seedLift) return false;
    return overlap(this.hitbox(), p) || overlap({ x: this.cx - 3, y: this.y + 14, w: 6, h: this.h - 14 }, p);
  }
  update(g) { this.t++; if (!this.ready && --this.regrow <= 0) this.ready = true; }
  onTouch(g, p) {
    if (!this.ready) return;
    if (p.y > this.y + 24) {
      p.seedLift = this; p.floatT = 0; p.vx = p.vy = 0;
      p.platform = null; p.onGround = false; p.roll = 0; p.spin = false; p.pounding = false;
      return;
    }
    this.ready = false; this.regrow = 300;
    p.floatT = DANDELION_TIME; p.chute = 'seed'; p.vy = Math.min(p.vy, -4.2); p.jumping = false; p.springAir = false; p.onGround = false;   // the puff pops him up into the breeze
    for (let i = 0; i < 26; i++) {
      const a = rand(0, Math.PI * 2), s = rand(0.3, 1.6);
      g.particles.push({ kind: 'px', x: this.cx + Math.cos(a) * 8, y: this.y + 7 + Math.sin(a) * 8, vx: Math.cos(a) * s + 0.4, vy: Math.sin(a) * s - 0.3, drag: 0.97, life: 70 + rand(0, 40), t: 0, color: '#ffffff', size: 1 });
    }
    Sound.play('whoosh');
  }
  draw(ctx) {
    const cx = Math.round(this.cx), by = Math.round(this.y + this.h), hy = Math.round(this.y + 7), sway = Math.sin(this.t * 0.04) * 1.5;
    const hx = cx + sway;   // (painted fine: hires.js)
    fineStem(ctx, cx, by, cx, (by + hy) / 2, hx, hy + 5, 0.75);
    for (const s of [-1, 1]) fineLeaf(ctx, cx + s * 0.6, by - 3, s * 0.85, -0.5, 6, 1.4, 0.6);
    if (this.ready) {
      // the clock: a sphere of fine white filaments, each tipped with a tuft, around a seed head
      ctx.globalAlpha = 0.28; fBlob(ctx, hx, hy, 12, '#ffffff'); ctx.globalAlpha = 0.5; fBlob(ctx, hx, hy, 10, '#ffffff'); ctx.globalAlpha = 1;
      for (let i = 0; i < 40; i++) {
        const a = i / 40 * Math.PI * 2 + (i % 2) * 0.05, r = 9 + (i % 3) * 0.8, c = Math.cos(a), sn = Math.sin(a);
        fLine(ctx, hx + c * 2.5, hy + sn * 2.5, hx + c * (r - 1), hy + sn * (r - 1), '#dfe4ee');
        fBlob(ctx, hx + c * r, hy + sn * r, 0.75, '#ffffff');
      }
      fBlob(ctx, hx, hy, 2.8, '#7a5a30'); fBlob(ctx, hx - 0.5, hy - 0.5, 1.7, '#b08a50');
    } else {
      // bald, then a little green bud, swelling as it grows back
      const k = 1 - this.regrow / 300;
      fBlob(ctx, hx, hy + 3, 1.8 + k * 2, INK); fBlob(ctx, hx, hy + 3, 1.1 + k * 2, k > 0.7 ? '#e8e8d0' : '#7ac050'); fBlob(ctx, hx - 0.4, hy + 2.5, 0.4 + k, k > 0.7 ? '#ffffff' : '#a8e080');
    }
  }
}

// Caterpillar: a chubby, juicy inchworm in poison colours -- black, banded toxic yellow and blood red.
// It crawls the real way: the rear hunches up to the head in a tall arch, then the front stretches
// out flat again. Every few seconds it bristles, poking up stinging spines along its back --
// stomp it then and you get stung. Otherwise it's stompable.
const CATERPILLAR_CYCLE = 64, CATERPILLAR_SPIKE = 200, CATERPILLAR_SPIKE_ON = 70;
// [base, shade, light] per band
const CATERPILLAR_PALS = [['#54407a', '#2e2248', '#8a74b8'], ['#ffd000', '#d98a00', '#fff08a'], ['#54407a', '#2e2248', '#8a74b8'], ['#e01838', '#8a0a1a', '#ff7a88']];
const CATERPILLAR_HEAD = ['#d81030', '#7a0618', '#ff6a7a'];
class Caterpillar extends Enemy {
  constructor(col, row) {
    super(col * TILE - 6, (row + 1) * TILE - 11, 28, 11);
    this.dir = -1; this.walker = true; this.phase = 0;
  }
  spiky() { return this.t % CATERPILLAR_SPIKE >= CATERPILLAR_SPIKE - CATERPILLAR_SPIKE_ON; }
  update(g) {
    this.t++;
    const wasSpiky = this.stompable === false;
    this.stompable = !this.spiky();
    if (!this.stompable && !wasSpiky && this.x > g.camX - 16 && this.x < g.camX + VIEW_W + 16) Sound.play('spike');
    this.phase = (this.t % CATERPILLAR_CYCLE) / CATERPILLAR_CYCLE;
    // it only moves forward while the front stretches out (the second half of each step)
    this.vx = this.phase >= 0.5 ? this.dir * 0.9 * Math.sin((this.phase - 0.5) * 2 * Math.PI) : 0;
    this.walk(g, true);
    if (this.vx) this.dir = Math.sign(this.vx);   // walk() flips vx at walls and ledges
  }
  hitbox() { return { x: this.x + 2, y: this.y + 1 - (this.spiky() ? 6 : 0), w: this.w - 4, h: this.h - 1 + (this.spiky() ? 6 : 0) }; }
  draw(ctx) {
    const f = this.dir, by = Math.round(this.y + this.h), n = 9;
    // the step: arch rises as the rear gathers up (0-0.5), then flattens as the front reaches out
    const ph = this.phase, arch = ph < 0.5 ? Math.sin(ph * 2 * Math.PI) : Math.sin((1 - ph) * Math.PI) * 0.25;
    const len = 24 - arch * 8, headX = this.cx + f * 12;
    const segs = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), x = headX - f * u * len;
      const y = by - 5 - Math.sin(u * Math.PI) * arch * 9 - (i === 0 ? 1 : 0);
      segs.push([fSnap(x), fSnap(y), i === 0 ? 5 : 4.4 - u * 0.8]);
    }
    if (this.flipped) { ctx.save(); ctx.translate(0, by * 2 - 6); ctx.scale(1, -1); }
    // a shaded ball: lit from above and a little from the front, with an ink rim
    // (rim: 0 none, 1 full ink outline, 2 a crease along the rear edge only)
    const ball = (cx, cy, r, pal, rim = 1) => ctx.drawImage(caterpillarBall(r, pal, rim, f), cx - r - 2, cy - r - 2);   // (baked fine, below)
    // legs: tiny peach feet under the segments that touch the ground, a rear clasper and front feelers
    const foot = (x, y) => { fEll(ctx, x + 0.5, y + 1, 1.6, 1.1, INK); fEll(ctx, x + 0.5, y + 0.8, 0.8, 0.55, '#ffb36b'); };   // (fine)
    for (let i = 1; i < n; i += 2) { const [x, y] = segs[i]; if (by - y < 7) foot(x - f, by - 2); }
    { const [x, y, r] = segs[n - 1]; fEll(ctx, x - f * 4 + 0.5, by - 1.5, 1.6, 1.6, INK); fEll(ctx, x - f * 4 + 0.5, by - 1.8, 0.7, 1, '#ffb36b'); }
    // body: one ink silhouette, then the segments tail first, each tucking over the one behind it with a thin crease
    for (let i = n - 1; i >= 0; i--) { const [x, y, r] = segs[i]; ball(x, y, r + 0.2, ['#000', '#000', '#000'], 1); }
    for (let i = n - 1; i >= 1; i--) {
      const [x, y, r] = segs[i];
      ball(x, y, r, CATERPILLAR_PALS[(i - 1) % CATERPILLAR_PALS.length], 2);
      // a glossy highlight, and warning eyespots on the black bands
      ctx.globalAlpha = 0.7; fEll(ctx, x - f * 1.2, y - r + 1.5, 1.2, 0.5, '#ffffff'); ctx.globalAlpha = 1;
      if (i % 4 === 1) { fBlob(ctx, x, y + 1.2, 0.9, '#ffd000'); fRect(ctx, x, y + 1, 1 / 3, 1 / 3, '#2e2248'); }
    }
    // the bristling spines: tapered needles painted at the same fine resolution as the body
    if (this.spiky()) {
      const k = this.t % CATERPILLAR_SPIKE - (CATERPILLAR_SPIKE - CATERPILLAR_SPIKE_ON), grow = Math.min(1, k / 8, (CATERPILLAR_SPIKE_ON - k) / 8);
      for (let i = 2; i < n; i += 2) {
        const [x, y, r] = segs[i], h = fSnap(10 * grow), base = fSnap(y - r + 1);
        if (h <= 0) continue;
        ctx.save(); ctx.translate(x, base); ctx.scale(f, 1);
        ctx.drawImage(caterpillarSpine(h), -5, -12);
        ctx.restore();
      }
    }
    // head: a big glossy red dome with a cross glare, a wide white eye with a heavy angry brow, little fangs
    const [hx, hy] = segs[0];
    ball(hx, hy, 5, CATERPILLAR_HEAD);
    ctx.globalAlpha = 0.85; fEll(ctx, hx - f * 2, hy - 3.2, 1.3, 0.6, '#ffffff'); fRect(ctx, hx - f * 2.6, hy - 2.6, 2 / 3, 2 / 3, '#ffffff'); ctx.globalAlpha = 1;
    const ex = hx + f * 2.6;   // a wide white eye toward the front, staring dead ahead under a furrowed brow
    fEll(ctx, ex, hy - 0.3, 2.2, 2.2, INK); fEll(ctx, ex, hy - 0.3, 1.5, 1.55, '#ffffff');
    fEll(ctx, ex + f * 0.6, hy - 0.1, 0.65, 0.95, INK); fRect(ctx, ex + f * 0.6 - 0.3, hy - 0.8, 1 / 3, 1 / 3, '#ffffff');
    fLine(ctx, ex - f * 2, hy - 3.3, ex + f * 1.7, hy - 2.2, INK, 3);
    // mandibles: two pale fangs curling down at the front
    fEll(ctx, hx + f * 4.2, hy + 3.2, 1.1, 1.6, INK); fEll(ctx, hx + f * 4.3, hy + 3.4, 0.5, 1, '#fff3c0');
    // two wiggling antennae with round tips
    const wig = Math.sin(this.t * 0.2);
    for (const [bx, tx, w] of [[-0.5, 0.2, wig], [1.8, 3.1, -wig]]) { fLine(ctx, hx + f * bx, hy - 4.6, hx + f * tx, hy - 7.6 + w, INK, 2); fBlob(ctx, hx + f * tx, hy - 8 + w, 0.9, INK); fBlob(ctx, hx + f * tx, hy - 8 + w, 0.55, '#ffd000'); }
    if (this.flipped) ctx.restore();
  }
}

// one of the caterpillar's shaded balls, baked in fine pixels (hires.js): lit from above and a little from the front,
// with an ink rim (rim: 0 none, 1 full ink outline, 2 a crease along the rear edge only), facing f
const CATERPILLAR_BALLS = new Map();
function caterpillarBall(r, pal, rim, f) {
  const key = r.toFixed(2) + pal.join() + rim + f;
  let img = CATERPILLAR_BALLS.get(key);
  if (img) return img;
  const Rr = ART_R, G = Math.ceil((r + 2) * 2), c = (r + 2) * Rr, P = finePix(G * Rr, G * Rr), R = r * Rr, lim = R * R, out = (R + 2) * (R + 2);
  P.fill(0, 0, G * Rr, G * Rr, (x, y) => {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d2 = dx * dx + dy * dy;
    if (d2 > (rim ? out : lim)) return null;
    if (d2 > lim) return rim === 1 || dx * f < 0 ? INK : null;
    const v = dy / R + (dx * f) / R * -0.3 + (0.5 - 0.5) * 0.25;
    return v < -0.5 ? pal[2] : v > 0.4 ? pal[1] : pal[0];
  });
  img = P.hi();
  CATERPILLAR_BALLS.set(key, img);
  return img;
}

// A backward-leaning sting: shaded red facets, a pale tip and the body's two-art-pixel ink rim.
// Cache the few extension heights so the animation only places the finished fine artwork.
const CATERPILLAR_SPINES = new Map();
function caterpillarSpine(h) {
  let img = CATERPILLAR_SPINES.get(h);
  if (img) return img;
  const A = mArt(9, 14), tip = -h * 0.25;
  const pts = ps => ps.map(([x, y]) => [5 + x, 12 - y]);
  A.poly(pts([[-1, 0], [1, 0], [0.4, h * 0.32], [tip + 0.35, h * 0.8], [tip, h], [tip - 0.4, h * 0.72], [-0.9, h * 0.28]]), '#8a0a1a');
  A.poly(pts([[-0.65, 0], [0.3, 0], [tip + 0.15, h * 0.8], [tip, h], [tip - 0.4, h * 0.72]]), '#d81030');
  A.poly(pts([[-0.65, h * 0.08], [-0.25, h * 0.08], [tip, h], [tip - 0.25, h * 0.7]]), '#ff7a88');
  A.poly(pts([[tip - 0.4, h * 0.72], [tip + 0.35, h * 0.8], [tip, h]]), '#ffe0e0');
  img = A.outline().canvas();
  CATERPILLAR_SPINES.set(h, img);
  return img;
}

class Spikelet extends Enemy {
  constructor(col, row) {
    super(col * TILE + 1, (row + 1) * TILE - 14, 14, 14);
    this.vx = -0.6; this.walker = true; this.stompable = false; this.rollKill = true;   // spikes on top stop stomps, but a roll from either side bowls it over
  }
  // Walks edge-aware: turns at ledges instead of strolling into pits.
  update(g) { this.t++; this.walk(g, true); }
  // Full fine-painted silhouette, including its layered quill coat and both walking poses.
  draw(ctx) {
    const f = this.vx < 0 ? -1 : 1, x = Math.round(this.cx) - f * 2, by = Math.round(this.y + this.h + 1);
    const M = meadowArt(), img = (this.t >> 3) % 2 ? M.hogB : M.hogA;
    drawSprite(ctx, img, x, by, f < 0, 1, 1, this.flipped);
  }
}

const FLUTTER_LOOKS = { bat: 0, eagle: 1, crow: 2, gull: 3 };
class Flutter extends Enemy {
  constructor(col, row, hang, look) {
    super(col * TILE + 1, row * TILE + 2, 14, 11);
    this.hang = hang; this.state = 'idle'; this.baseY = this.y; this.dir = -1;
    // Bird palettes share the original swooping flight; hanging enemies stay bats.
    this.skin = hang ? 0 : FLUTTER_LOOKS[look] != null ? FLUTTER_LOOKS[look] : (col * 7 + row) % 4;
  }
  update(g) {
    this.t++;
    const p = g.player, pcx = p.x + p.w / 2;
    if (this.state === 'idle') {
      if (!this.hang) this.y = this.baseY + Math.sin(this.t * 0.05) * 3;
      if (Math.abs(pcx - this.cx) < 120) { this.state = 'fly'; this.dir = pcx < this.cx ? -1 : 1; this.t = 0; }
      return;
    }
    this.vx = this.dir * 1.0;
    this.x += this.vx;
    const ty = clamp(p.y + p.h / 2 - 8, 40, 176);
    this.baseY += clamp(ty - this.baseY, -0.7, 0.7);
    this.y = this.baseY + Math.sin(this.t * 0.09) * 12;
    if ((this.dir > 0 && this.cx - pcx > 90) || (this.dir < 0 && pcx - this.cx > 90)) this.dir = -this.dir;
    if (this.x + this.w < g.camX - 160) this.remove = true;
  }
  draw(ctx) {
    if (this.skin) {   // birds: side-on, beak first in the direction of flight
      const up = Math.floor(this.t / 6) % 2 === 0, k = this.skin - 1, crow = this.skin === FLUTTER_LOOKS.crow && meadowArt();   // (the crow is painted: meadow-art.js)
      drawSprite(ctx, crow ? (up ? crow.crowUp : crow.crowDown) : up ? SPR.birdUp[k] : SPR.birdDown[k], this.cx, this.y + this.h + 2, this.dir > 0, 1, 1, this.flipped);
      return;
    }
    this.drawBat(ctx);
  }
  // A realistic bat (painted fine: batArt, sprites-fine.js): a small furry body, tall pointed ears, a pug snout with a
  // glint of fang, and leathery wings stretched over long finger bones that beat through a full stroke. Hanging,
  // it dangles upside down with its wings wrapped round itself like a cloak (eyes shut while a SleepBat sleeps).
  drawBat(ctx) {
    const B = batArt(), cx = Math.round(this.cx), cy = Math.round(this.y + 6);
    if (this.state === 'idle' && this.hang) { ctx.drawImage(this.asleep ? B.sleep : B.hang, cx - BAT_AX, cy - BAT_AY); return; }
    const k = Math.floor(((this.t * 0.35) / (Math.PI * 2) % 1) * BAT_FRAMES) % BAT_FRAMES;
    ctx.save(); ctx.translate(cx, cy);
    if (this.dir < 0) ctx.scale(-1, 1);
    if (this.flipped) ctx.scale(1, -1);
    ctx.drawImage(B.fly[k], -BAT_AX, -BAT_AY);
    ctx.restore();
  }
}

class Snapvine extends Enemy {
  constructor(pipeCol, topRow, eel = false) {
    super(pipeCol * TILE + 8, topRow * TILE, 16, eel ? 64 : 24);
    this.eel = eel; this.reach = eel ? 64 : 24;
    this.baseY = topRow * TILE; this.off = this.reach; this.state = 'wait'; this.timer = 60 + (eel ? pipeCol * 17 % 65 : 0);
    this.stompable = false; this.bumpKill = false;
    this.facing = -1; // -1: looking left, 1: looking right
  }
  update(g) {
    this.t++;
    const p = g.player;
    switch (this.state) {
      case 'wait':
        if (--this.timer <= 0) {
          if (Math.abs(p.x + p.w / 2 - (this.x + 8)) < 30) this.timer = 30;
          else {
            this.state = 'up';
            // Look on whichever side Chickaroo is before coming out; locked for this pop-up
            this.facing = (p.x + p.w / 2 < this.x + 8) ? -1 : 1;
          }
        }
        break;
      case 'up': this.off -= this.eel ? 1.05 : .75; if (this.off <= 0) { this.off = 0; this.state = 'out'; this.timer = 80; } break;
      case 'out': if (--this.timer <= 0) this.state = 'down'; break;
      case 'down': this.off += this.eel ? 1.05 : .75; if (this.off >= this.reach) { this.off = this.reach; this.state = 'wait'; this.timer = 80; } break;
    }
    this.y = this.baseY - this.reach + this.off;
  }
  // Killed (fire, a shell, a spin...): it blows apart right where it is -- a flash, a fireball of
  // smoke and chunks flying out of the pipe -- instead of tumbling off the screen.
  updateDead(g) {
    if (this.deadT++ === 0) {
      const x = this.x + 8, y = this.y + 10, eel = this.eel;
      const hot = eel ? ['#ffffff', '#7af0ff', '#e8e070'] : ['#ffffff', '#ffd166', '#ff8a2a'];
      const meat = eel ? ['#4e6a1e', '#88a438', '#d8d060'] : ['#b8645a', '#e8988a', '#7a3a3a'];
      for (let i = 0; i < 26; i++) {
        const a = rand(-Math.PI, 0) - (i % 2 ? 0 : rand(-0.6, 0.6)), sp = rand(1.2, 3.6);
        g.particles.push({ kind: 'spark', x: x + rand(-4, 4), y: y + rand(-6, 6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.05, drag: 0.94, life: 26 + rand(0, 18), t: 0, color: hot[i % 3] });
      }
      // chunks of the body, arcing out and falling
      for (let i = 0; i < 9; i++) g.particles.push({ kind: 'px', x: x + rand(-4, 4), y: y + rand(-4, 8), vx: rand(-2.2, 2.2), vy: rand(-4.5, -2), g: 0.22, life: 60, t: 0, color: meat[i % 3], size: 2 + (i % 2) });
      // a puff of smoke rising out of the pipe
      for (let i = 0; i < 10; i++) g.particles.push({ kind: 'px', x: x + rand(-7, 7), y: y + rand(-4, 6), vx: rand(-0.4, 0.4), vy: rand(-1, -0.3), drag: 0.95, life: 40, t: 0, color: i % 2 ? '#6a6a7a' : '#9a9aaa', size: 3 });
      g.shake = Math.max(g.shake, 3);
      Sound.play('blast');
    }
    this.remove = true;
  }
  hitbox() {
    if(this.eel){
      const top=Math.round(this.y+1+this.off/4)-1;
      return top>=this.baseY?null:{x:this.x-3,y:top,w:18,h:this.baseY-top};
    }
    if (this.off >= 18) return null;
    const top = this.y + (this.eel ? 2 : 7);
    return { x: this.x + 3, y: top, w: 10, h: this.baseY - top };
  }
  // drawn in front of the log but clipped at the bottom of the dark hole in its cut top (rows 2-4),
  // so it rises out of the hole instead of from behind the log; sunk 5px so it hides fully in there
  draw(ctx, g) {
    ctx.save(); ctx.beginPath(); ctx.rect(this.x - 8, this.baseY - this.reach - 8, 32, this.reach + 13); ctx.clip();
    if (this.eel) {
      this.drawEel(ctx);
      // The front lip covers the neck at the opening, keeping the eel rooted in its tube.
      ctx.drawImage(fineCoralSection(true),0,3,32,4,this.x-8,this.baseY+3,32,4);
      ctx.restore();return;
    }
    this.drawWorm(ctx);
    ctx.restore();
  }
}

// Underwater, the log-worm is a moray eel in its coral tube: a long speckled body swaying up out of
// the opening, a heavy head with a pale eye, and jaws that gape and snap shut as it breathes.
// On land, the log-worm is a giant predatory bristle worm: a fat, ringed, glistening body with
// tufts of bristles down its sides, swaying up out of the hollow log, and a head that splays four
// hooked black jaws open, then snaps them shut.
Snapvine.prototype.drawWorm = function (ctx) {
  const t = this.t, cx = fSnap(this.x + 8), hy = fSnap(this.y + 6 + this.off / 4), bot = this.baseY + 5;
  const phase = Math.floor(t / 3) % 12, mouth = Math.round((0.5 - Math.cos(t * Math.PI / 10) * 0.5) * 4);
  if (this.flipped) { ctx.save(); ctx.translate(0, hy + bot); ctx.scale(1, -1); }
  const rings = [];
  for (let y = bot + 1; y > hy + 4; y -= 2.3) {
    const sway = Math.sin(phase * Math.PI / 6 + (y - hy) * 0.2) * 1.25 * Math.min(1, Math.max(0, (bot - y) / 10));
    rings.push([fSnap(cx + sway), y]);
  }
  // Bristles emerge from shaded fleshy lobes, a few fine strands per tuft.
  for (const [x, y] of rings) for (const side of [-1, 1]) {
    fEll(ctx, x + side * 3.3, y, 1, 0.7, '#793d48');
    for (const [reach, rise] of [[5.3, -1], [5.5, -0.1], [5, 0.65]]) {
      fLine(ctx, x + side * 3.4, y, x + side * reach, y + rise, '#50362e', 2);
      fLine(ctx, x + side * 3.6, y, x + side * reach, y + rise, '#e5c59a', 1);
    }
  }
  for (const [x, y] of rings) fEll(ctx, x, y, 4, 1.9, INK);
  for (const [x, y] of rings) {
    fEll(ctx, x, y, 3.35, 1.5, '#783b49');
    fEll(ctx, x - 0.25, y - 0.35, 3.05, 1.05, '#b95f68');
    fEll(ctx, x - 0.9, y - 0.45, 1.8, 0.8, '#df9490');
    fEll(ctx, x - 1.5, y - 0.65, 0.55, 0.35, '#ffe1c4');
  }
  ctx.drawImage(bristleWormHeadArt(mouth, phase), cx - 10, hy - 8);
  if (this.flipped) ctx.restore();
};

Snapvine.prototype.drawEel = function (ctx) {   // (painted fine: eelHeadArt below; the body live in fine pixels)
  // sinks a little deeper than it rises, so its big head tucks fully down past the tube's lip
  const t = this.t, cx = Math.round(this.x + 8), hy = Math.round(this.y + 1 + this.off / 4), bot = this.baseY + 5;
  const open = Math.floor(t / 10) % 2;
  const f = this.facing || -1;
  ctx.save();
  if (f > 0) {
    ctx.translate(cx, 0);
    ctx.scale(-1, 1);
    ctx.translate(-cx, 0);
  }
  // a thick body, swaying, mottled with yellow spots, a pale ridge of dorsal fin up its back
  const pts = [];
  for (let Y = bot + 2; Y >= hy + 7; Y -= 1) {
    // Sway fades out at the neck as well as at the tube: the head and body share a fixed join.
    const bend=Math.max(0,Math.min(1,(bot-Y)/12,(Y-hy-7)/10));
    pts.push([cx + Math.sin(t*.08+(Y-hy)*.16)*2*bend,Y]);
  }
  const run = (dx, wd, col) => { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x + dx, y) : ctx.moveTo(x + dx, y)); ctx.stroke(); };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  run(1.2, 2.2, '#88a438'); run(0.8, 11.4, INK); run(0, 9, '#4e6a1e'); run(2.6, 3.4, '#2a3c0e'); run(-2.6, 1.4, '#88a438');
  for (let i = 2; i < pts.length; i += 3) { const [x, y] = pts[i]; fBlob(ctx, x - 1 + ((i * 7) % 5) - 2, y, 0.6, '#d8d060'); }   // spots
  ctx.drawImage(eelHeadArt(open), cx - 12, hy - 2);
  // electric charge: every so often it crackles with jagged bolts along its body (a "don't touch" warning)
  if (t % 70 < 22) {
    const rng = mulberry32(Math.floor(t / 3) * 7 + this.x);
    ctx.globalAlpha = 0.18; fBlob(ctx, cx, hy + 10, 14, '#7af0ff'); ctx.globalAlpha = 1;
    ctx.lineWidth = 0.6; ctx.lineJoin = 'miter';
    for (let n = 0; n < 3; n++) {
      let X = cx + Math.round(rng() * 10 - 6), Y = hy + 2 + Math.floor(rng() * 6);
      ctx.strokeStyle = rng() < 0.5 ? '#ffffff' : '#7af0ff'; ctx.beginPath(); ctx.moveTo(X + 0.5, Y);
      while (Y < bot - 2) { X += Math.round(rng() * 6 - 3); Y += 2 + Math.floor(rng() * 3); ctx.lineTo(X + 0.5, Y); }
      ctx.stroke();
      fSparkle(ctx, cx + Math.round(rng() * 22 - 12) + 0.5, hy + Math.floor(rng() * 20) + 0.5, 1.2);   // a spark jumping off the skin
    }
  }
  ctx.restore();
};
// the moray's big heavy head facing left, 20 x 16 (its (0, 0) -- the top of the head over the body -- at (12, 2)): blunt
// snout, bulging cheek, a mean yellow eye under a scowling brow, the lower jaw dropped wide open or shut with fangs over it
const EEL_HEADS = [];
function eelHeadArt(open) {
  if (EEL_HEADS[open]) return EEL_HEADS[open];
  const A = mArt(20, 16), X = x => 12 + x, Y = y => 2 + y, B = ['#1e2a08', '#2a3c0e', '#4e6a1e', '#6e8a2e', '#a8c050'];
  A.soft(X(-1), Y(5.4), 7, 5.8, B);                                                                   // the cheek
  A.poly([[X(-11), Y(2)], [X(-7.6), Y(-0.2)], [X(-1), Y(-0.4)], [X(-1), Y(6.4)], [X(-11), Y(6)]], B[2]);   // the blunt snout
  A.fill(X(-11), Y(-1), X(-1), Y(6.4), (x, y) => softTone(B, 0.9 - (y - Y(-0.4)) / 6), true);
  if (open) {
    A.poly([[X(-11), Y(6)], [X(-1.4), Y(6.2)], [X(-1.4), Y(9.6)], [X(-10.4), Y(9.2)]], '#1a0408');        // the dark maw
    A.poly([[X(-10.6), Y(9.4)], [X(-1), Y(9.8)], [X(0), Y(11)], [X(-9.6), Y(11.6)]], B[2]);               // the lower jaw, hanging open
  } else A.poly([[X(-11), Y(6)], [X(-1), Y(6.2)], [X(0.6), Y(9)], [X(-9.6), Y(8.4)]], B[2]);             // the jaw, shut
  A.fill(X(-11), Y(-1), X(6), Y(12), (x, y) => { const h = Math.sin(Math.floor(x * 2.2) * 12.9 + Math.floor(y * 2.2) * 78.2) * 43758.5; return h - Math.floor(h) < 0.07 ? '#d8d060' : null; }, true);   // mottling
  A.outline();
  if (open) {
    for (let k = 0; k < 4; k++) { const fx = X(-9.6 + k * 2); A.poly([[fx, Y(6.2)], [fx + 0.9, Y(6.2)], [fx + 0.45, Y(7.8)]], '#ffffff'); A.poly([[fx + 0.8, Y(9.6)], [fx + 1.7, Y(9.6)], [fx + 1.25, Y(8.2)]], '#e8e0d0'); }
    A.poly([[X(-4.4), Y(6.2)], [X(-3.4), Y(6.2)], [X(-3.9), Y(8.8)]], '#ffffff');                       // a long fang
  } else {
    A.line(X(-10.6), Y(6.4), X(-1.6), Y(6.6), '#1a0408', null, 0.7);                                    // the grim mouth line, fangs over it
    for (const fx of [-9, -6]) A.poly([[X(fx), Y(6.6)], [X(fx + 0.9), Y(6.6)], [X(fx + 0.45), Y(8)]], '#ffffff');
  }
  A.ell(X(-4), Y(3.4), 1.5, 1.2, '#ffd020'); A.ell(X(-4), Y(3.5), 0.35, 1.1, '#10200a');               // a mean yellow eye with a slit pupil
  A.line(X(-7), Y(1.6), X(-2), Y(2.2), B[1], null, 0.7);                                                // the scowling brow
  A.ell(X(-9.4), Y(2.4), 0.5, 0.4, B[0]);                                                               // nostril
  A.line(X(1.4), Y(6), X(1.2), Y(9), B[1], null, 0.4);                                                  // gill slit
  return (EEL_HEADS[open] = A.canvas());
}

class Firebar extends Enemy {
  constructor(col, row, len, speed) {
    super(col * TILE, row * TILE, 16, 16);
    this.px = col * TILE + 8; this.py = row * TILE + 8; this.len = len; this.speed = speed;
    this.a = -Math.PI / 2;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  update() { this.t++; this.a += this.speed; }
  hitbox() { return null; }
  touches(p) {
    const bx0 = p.x + 2, by0 = p.y + 2, bx1 = p.x + p.w - 2, by1 = p.y + p.h - 2;
    for (let i = 1; i < this.len; i++) {
      const x = this.px + Math.cos(this.a) * i * 8, y = this.py + Math.sin(this.a) * i * 8;
      const nx = clamp(x, bx0, bx1), ny = clamp(y, by0, by1);
      if ((x - nx) * (x - nx) + (y - ny) * (y - ny) < 12) return true;
    }
    return false;
  }
  onTouch(g) { g.hurtPlayer(); }
  draw(ctx) {
    for (let i = 0; i < this.len; i++) {
      const x = this.px + Math.cos(this.a) * i * 8, y = this.py + Math.sin(this.a) * i * 8;
      blob(ctx, x, y, 4, (this.t + i) % 6 < 3 ? '#ff6a1f' : '#ff8a2a');
      blob(ctx, x, y, 2, '#ffe08a');
    }
  }
}

class Ember extends Enemy {
  constructor(col, jump) {
    super(col * TILE + 2, VIEW_H + 8, 12, 14);
    this.jump = jump || 7.2;   // launch speed: 7.2 clears a pit, 10+ shoots high over a bridge
    this.baseY = VIEW_H + 8; this.wait = 20 + (col * 37) % 70;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  update(g) {
    this.t++;
    if (this.wait > 0) {
      // never leap straight up at someone riding a marshmallow overhead: hold until they've drifted clear
      const p = g.player, pl = p.platform;
      if (this.wait === 1 && pl instanceof Mallow && p.x + p.w > this.x - 10 && p.x < this.x + this.w + 10) { this.wait = 12; return; }
      if (--this.wait === 0) {
        this.vy = -this.jump;
        if (this.x > g.camX && this.x < g.camX + VIEW_W) Sound.play('sizzle');
      }
      return;
    }
    this.vy += 0.25;
    this.y += this.vy;
    if (this.vy < 0 && this.t % 3 === 0) g.spark(this.x + 6 + rand(-3, 3), this.y + 14, '#ff8a2a', 18);
    if (this.y >= this.baseY && this.vy > 0) { this.y = this.baseY; this.vy = 0; this.wait = 110; }
  }
  hitbox() { return this.y < VIEW_H ? { x: this.x + 1, y: this.y + 1, w: 10, h: 12 } : null; }
  draw(ctx) {
    if (this.y >= VIEW_H) return;
    const cx = this.x + 6, cy = this.y + 7, down = this.vy > 0;
    // (in fine pixels: hires.js) a flickering tail of flame, a glowing body, a hot core, and two beady eyes
    const fl = Math.sin(this.t * 0.6) * 0.6, s = down ? -1 : 1;
    ctx.globalAlpha = 0.35; fBlob(ctx, cx, cy, 9, '#ff6a1f'); ctx.globalAlpha = 1;
    fEll(ctx, cx + fl, cy + s * 6.5, 2.4, 3.6, '#ff6a1f'); fEll(ctx, cx - fl * 0.5, cy + s * 9, 1.2, 2.2, '#ffb347');
    fBlob(ctx, cx, cy, 6.3, '#c02a12'); fBlob(ctx, cx - 0.3, cy - 0.3, 5.4, '#ff8a2a');
    fBlob(ctx, cx - 0.6, cy - s * 1 - 0.4, 3.3, '#ffd06a'); fBlob(ctx, cx - 1.2, cy - s * 1.4 - 1, 1.4, '#fff4c0');
    for (const ex of [-2.2, 2.2]) { fEll(ctx, cx + ex, cy, 1, 1.25, INK); fRect(ctx, cx + ex - 0.4, cy - 0.6, 1 / 3, 1 / 3, '#ffffff'); }
  }
}


// the sea floor's hermit crab, drawn live at 1x: lifted to the fine screen (hires.js)
